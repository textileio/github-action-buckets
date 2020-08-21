import fs from 'fs'
import path from 'path'
import util from 'util'
import glob from 'glob'
import * as core from '@actions/core'
import {
  bucketsList,
  bucketsLinks,
  bucketsRemove,
  bucketsInit,
  bucketsPushPath,
  bucketsRemovePath
} from '@textile/buckets/dist/api'
import {GrpcConnection} from '@textile/grpc-connection'

import {listPathFlat} from '@textile/buckets/dist/utils'

import {Context} from '@textile/context'

const globDir = util.promisify(glob)

const prunePath = (
  buckName: string,
  tree: Array<string>,
  path: string
): Array<string> => {
  tree = tree.filter(row => row != path)
  const folder = `${path}`.replace(/\/[^\/]+$/, '')
  if (folder === path) return tree
  tree = prunePath(buckName, tree, folder)
  return tree
}

const minimumRequiredDeletes = (tree: Array<string>): Array<string> => {
  let entries = tree.length
  let sorted = tree.sort((a, b) => a.length - b.length)
  for (let i = 0; i < entries; i++) {
    const entry = sorted[i]
    if (!entry) continue
    let reindex = false
    const deletions = []
    for (const other of tree) {
      if (other.startsWith(`${entry}/`) || other === '.textileseed') {
        deletions.push(other)
        reindex = true
      }
    }
    for (const removal of deletions) {
      tree = tree.filter(row => row != removal)
    }
    if (reindex) {
      sorted = tree.sort((a, b) => a.length - b.length)
      entries = tree.length
    }
  }
  return tree
}

async function run(): Promise<void> {
  try {
    const api = core.getInput('api')
    const target =
      api.trim() != '' ? api.trim() : 'https://webapi.hub.textile.io'

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
    const grpc = new GrpcConnection(ctx)

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

    let pathTree = await listPathFlat(grpc, bucketKey, '', true, -1)

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
      const filePath = `${cwd}/${file}`
      pathTree = prunePath(name, pathTree, file)
      const content = fs.createReadStream(filePath, {
        highWaterMark: 1024 * 1024 * 2
      })
      const upload = {
        path: `/${file}`,
        content
      }
      raw = await bucketsPushPath(grpc, bucketKey, `/${file}`, upload)
    }

    pathTree = minimumRequiredDeletes(pathTree)
    for (const orphan of pathTree) {
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
