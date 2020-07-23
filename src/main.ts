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
  bucketsPushPath
} from '@textile/buckets/dist/api'
import {Context} from '@textile/context'

const readFile = util.promisify(fs.readFile)
const globDir = util.promisify(glob)

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
      const buffer = await readFile(filePath)
      const upload = {
        path: `/${file}`,
        content: buffer
      }
      raw = await bucketsPushPath(grpc, bucketKey, `/${file}`, upload)
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
