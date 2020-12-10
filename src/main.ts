// @ts-ignore
;(global as any).WebSocket = require('ws')

import fs from 'fs'
import path from 'path'
import util from 'util'
import glob from 'glob'
import * as core from '@actions/core'
import {
  bucketsList,
  bucketsLinks,
  bucketsRemove,
  bucketsCreate,
  bucketsPushPath,
  bucketsListPath,
  bucketsRemovePath,
  bucketsRoot,
} from '@textile/buckets/dist/api'
import { Context } from '@textile/context'
import { GrpcConnection } from '@textile/grpc-connection'
import { Root } from '@textile/buckets/dist/types'

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
  constructor(public folders: Array<string> = [], public leafs: Array<string> = []) {}

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
      folderDeletions.forEach((drop) => this.removeFolder(drop))
      const fileDeleteions = []
      for (const look of this.leafs) {
        if (look.startsWith(`${folder}/`)) {
          fileDeleteions.push(look)
        }
      }
      fileDeleteions.forEach((drop) => this.removeLeaf(drop))
      if (reindex) {
        sorted = this.folders.sort((a, b) => a.length - b.length)
        dirCount = this.folders.length
      }
    }
    return [...this.leafs, ...this.folders]
  }
}

async function getNextNode(connection: GrpcConnection, bucketKey: string, path: string): Promise<NextNode> {
  const tree = await bucketsListPath(connection, bucketKey, path)
  const files: Array<string> = []
  const dirs: Array<string> = []
  if (tree.item) {
    for (const obj of tree.item.items) {
      if (obj.name === '.textileseed') continue
      if (obj.isDir) {
        dirs.push(`${path}/${obj.name}`)
      } else {
        files.push(`${path}/${obj.name}`)
      }
    }
  }
  return { files, dirs }
}

async function getTree(connection: GrpcConnection, bucketKey: string, path = '/'): Promise<BucketTree> {
  const leafs: Array<string> = []
  const folders: Array<string> = []
  const nodes: Array<string> = []
  const { files, dirs } = await getNextNode(connection, bucketKey, path)
  leafs.push(...files)
  folders.push(...dirs)
  nodes.push(...dirs)
  while (nodes.length > 0) {
    const dir = nodes.pop()
    if (!dir) continue
    const { files, dirs } = await getNextNode(connection, bucketKey, dir)
    leafs.push(...files)
    folders.push(...dirs)
    nodes.push(...dirs)
  }
  return new BucketTree(folders, leafs)
}

export type RunOutput = Map<string, string>

export async function execute(
  api: string,
  key: string,
  secret: string,
  thread: string,
  name: string,
  remove: string,
  pattern: string,
  dir: string,
  home: string,
): Promise<RunOutput> {
  const target = api.trim() != '' ? api.trim() : undefined

  const response: RunOutput = new Map()

  if (!key || key.trim() === '') {
    throw Error('Credentials required')
  }

  const keyInfo = {
    key,
    secret,
  }

  const expire: Date = new Date(Date.now() + 1000 * 1800) // 10min expiration
  const ctx = await new Context(target)
  await ctx.withKeyInfo(keyInfo, expire)

  if (thread.trim() === '') {
    throw Error('Existing thread required')
  }

  ctx.withThread(thread)
  const connection = new GrpcConnection(ctx)

  if (name.trim() === '') {
    throw Error('Every bucket needs a name')
  }

  const roots = await bucketsList(connection)
  const existing = roots.find((bucket: any) => bucket.name === name)
  if (remove === 'true') {
    if (existing) {
      await bucketsRemove(connection, existing.key)
      response.set('success', 'true')
      return response
    } else {
      throw Error('Bucket not found')
    }
  }

  let bucketKey = ''
  if (existing) {
    bucketKey = existing.key
  } else {
    const created = await bucketsCreate(connection, name)
    if (!created.root) {
      throw Error('Failed to create bucket')
    }
    bucketKey = created.root.key
  }

  const pathTree = await getTree(connection, bucketKey, '')

  const cwd = path.join(home, dir)
  const options = {
    cwd,
    nodir: true,
  }
  const files = await globDir(pattern, options)
  if (files.length === 0) {
    throw Error(`No files found: ${dir}`)
  }
  // avoid requesting new head on every push path
  let root: string | Root | undefined = await bucketsRoot(connection, bucketKey)
  let raw
  for (const file of files) {
    pathTree.remove(`/${file}`)
    const filePath = `${cwd}/${file}`
    const buffer = await readFile(filePath)
    const content = chunkBuffer(buffer)
    const upload = {
      path: `/${file}`,
      content,
    }
    raw = await bucketsPushPath(connection, bucketKey, `/${file}`, upload, { root })
    root = raw.root
  }
  for (const orphan of pathTree.getDeletes()) {
    const rm = await bucketsRemovePath(connection, bucketKey, orphan, { root })
    root = rm.root
  }

  const links = await bucketsLinks(connection, bucketKey, '/')

  const ipfs = raw ? raw.root.replace('/ipfs/', '') : ''
  response.set('ipfs', ipfs)
  response.set('ipfsUrl', `https://hub.textile.io/ipfs/${ipfs}`)

  const ipnsData = links.ipns.split('/')
  const ipns = ipnsData.length > 0 ? ipnsData[ipnsData.length - 1] : ''
  response.set('ipns', ipns)

  response.set('ipnsUrl', `${links.ipns}`)
  response.set('www', `${links.www}`)
  response.set('hub', `${links.url}`)
  response.set('key', `${bucketKey}`)
  return response
}

async function run(): Promise<void> {
  const api = core.getInput('api') || ''
  const key: string = core.getInput('key') || ''
  const secret: string = core.getInput('secret') || ''
  const thread: string = core.getInput('thread') || ''
  const bucketName: string = core.getInput('bucket') || ''
  const remove: string = core.getInput('remove') || 'false'

  const pattern = core.getInput('pattern') || '**/*'
  const dir = core.getInput('path') || ''
  const home = core.getInput('home') || './'

  try {
    const result = await execute(api, key, secret, thread, bucketName, remove, pattern, dir, home)
    result.forEach((value, key) => core.setOutput(key, value))
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
