// @ts-ignore
;(global as any).WebSocket = require('ws')

import fs from 'fs'
import path from 'path'
import util from 'util'
import glob from 'glob'
import * as core from '@actions/core'
import {
  BucketsGrpcClient,
  bucketsList,
  bucketsLinks,
  bucketsRemove,
  bucketsInit,
  bucketsPushPath,
  bucketsListPath,
  bucketsRemovePath
} from '@textile/buckets/dist/api'
import {Context} from '@textile/context'

const readFile = util.promisify(fs.readFile)
const globDir = util.promisify(glob)

function chunkBuffer(content: Buffer) {
  const size = 1024 * 1024 * 3
  const result = []
  const len = content.length
  let i = 0
  while (i < len) {
    result.push(content.slice(i, (i += size)))
  }
  return result
}

interface NextNode {
  files: Array<string>
  dirs: Array<string>
}
class BucketTree {
  constructor(
    public folders: Array<string> = [],
    public leafs: Array<string> = []
  ) {}

  private removeFolder(folder: string) {
    const knownIndex = this.folders.indexOf(folder)
    if (knownIndex > -1) {
      this.folders.splice(knownIndex, 1)
    }
    return knownIndex
  }

  private removeLeaf(path: string) {
    const knownIndex = this.leafs.indexOf(path)
    if (knownIndex > -1) {
      this.leafs.splice(knownIndex, 1)
    }
    return knownIndex
  }

  remove(path: string) {
    if (path[0] !== '/') throw new Error('Unsupported path')
    const knownLeaf = this.removeLeaf(path)
    if (knownLeaf > -1) {
      let folder = `${path}`.replace(/\/[^\/]+$/, '')
      while (folder.length > 0) {
        // remove last folder
        this.removeFolder(folder)
        folder = folder.replace(/\/[^\/]+$/, '')
      }
    }
  }

  getDeletes() {
    let dirCount = this.folders.length
    let sorted = this.folders.sort((a, b) => a.length - b.length)
    for (let i = 0; i < dirCount; i++) {
      const folder = sorted[i]
      if (!folder) continue
      const reindex = false
      const folderDeletions = []
      for (const look of this.folders) {
        if (look.startsWith(`${folder}/`)) {
          folderDeletions.push(look)
        }
      }
      folderDeletions.forEach(drop => this.removeFolder(drop))
      const fileDeleteions = []
      for (const look of this.leafs) {
        if (look.startsWith(`${folder}/`)) {
          fileDeleteions.push(look)
        }
      }
      fileDeleteions.forEach(drop => this.removeLeaf(drop))
      if (reindex) {
        sorted = this.folders.sort((a, b) => a.length - b.length)
        dirCount = this.folders.length
      }
    }
    return [...this.leafs, ...this.folders]
  }
}

async function getNextNode(
  grpc: BucketsGrpcClient,
  bucketKey: string,
  path: string
): Promise<NextNode> {
  const tree = await bucketsListPath(grpc, bucketKey, path)
  const files: Array<string> = []
  const dirs: Array<string> = []
  if (tree.item) {
    for (const obj of tree.item.itemsList) {
      if (obj.name === '.textileseed') continue
      if (obj.isdir) {
        dirs.push(`${path}/${obj.name}`)
      } else {
        files.push(`${path}/${obj.name}`)
      }
    }
  }
  return {files, dirs}
}

async function getTree(
  grpc: BucketsGrpcClient,
  bucketKey: string,
  path = '/'
): Promise<BucketTree> {
  const leafs: Array<string> = []
  const folders: Array<string> = []
  const nodes: Array<string> = []
  const {files, dirs} = await getNextNode(grpc, bucketKey, path)
  leafs.push(...files)
  folders.push(...dirs)
  nodes.push(...dirs)
  while (nodes.length > 0) {
    const dir = nodes.pop()
    if (!dir) continue
    const {files, dirs} = await getNextNode(grpc, bucketKey, dir)
    leafs.push(...files)
    folders.push(...dirs)
    nodes.push(...dirs)
  }
  return new BucketTree(folders, leafs)
}

async function run(): Promise<void> {
  try {
    const api = core.getInput('api')
    const target = api.trim() != '' ? api.trim() : 'https://api.textile.io:3447'

    const key: string = core.getInput('key').trim()
    const secret: string = core.getInput('secret').trim()
    if (!key || key === '' || !secret || secret === '') {
      core.setFailed('Invalid credentials')
      return
    }

    const keyInfo = {
      key,
      secret
    }
    const thread: string = core.getInput('thread')
    const name: string = core.getInput('bucket')

    const expire: Date = new Date(Date.now() + 1000 * 600) // 10min expiration
    const ctx = await new Context(target)
    await ctx.withKeyInfo(keyInfo, expire)
    ctx.withThread(thread)
    const grpc = new BucketsGrpcClient(ctx)

    const roots = await bucketsList(grpc)
    const existing = roots.find((bucket: any) => bucket.name === name)

    const remove: string = core.getInput('remove') || ''
    if (remove === 'true') {
      if (existing) {
        await bucketsRemove(grpc, existing.key)
        core.setOutput('success', 'true')
      } else {
        core.setFailed('Bucket not found')
      }
      // success
      return
    }

    let bucketKey = ''
    if (existing) {
      bucketKey = existing.key
    } else {
      const created = await bucketsInit(grpc, name)
      if (!created.root) {
        core.setFailed('Failed to create bucket')
        return
      }
      bucketKey = created.root.key
    }

    const pattern = core.getInput('pattern') || '**/*'
    const dir = core.getInput('path')
    const home = core.getInput('home') || './'

    const pathTree = await getTree(grpc, bucketKey, '')

    const cwd = path.join(home, dir)
    const options = {
      cwd,
      nodir: true
    }
    const files = await globDir(pattern, options)
    if (files.length === 0) {
      core.setFailed(`No files found: ${dir}`)
      return
    }
    let raw
    for (const file of files) {
      pathTree.remove(`/${file}`)
      const filePath = `${cwd}/${file}`
      const buffer = await readFile(filePath)
      const content = chunkBuffer(buffer)
      const upload = {
        path: `/${file}`,
        content
      }
      raw = await bucketsPushPath(grpc, bucketKey, `/${file}`, upload)
    }

    for (const orphan of pathTree.getDeletes()) {
      console.log(orphan)
      await bucketsRemovePath(grpc, bucketKey, orphan)
    }

    const links = await bucketsLinks(grpc, bucketKey)

    const ipfs = raw ? raw.root.replace('/ipfs/', '') : ''
    core.setOutput('ipfs', ipfs)
    core.setOutput('ipfsUrl', `https://hub.textile.io/ipfs/${ipfs}`)

    const ipnsData = links.ipns.split('/')
    const ipns = ipnsData.length > 0 ? ipnsData[ipnsData.length - 1] : ''
    core.setOutput('ipns', ipns)

    core.setOutput('ipnsUrl', `${links.ipns}`)
    core.setOutput('www', `${links.www}`)
    core.setOutput('hub', `${links.url}`)
    core.setOutput('key', `${bucketKey}`)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
