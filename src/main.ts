// @ts-ignore
;(global as any).WebSocket = require('ws')

import fs from 'fs'
import path from 'path'
import util from 'util'
import glob from 'glob'
import * as core from '@actions/core'
import {Buckets, Context} from '@textile/textile'
import {ThreadID} from '@textile/threads-id'

const readFile = util.promisify(fs.readFile)
const globDir = util.promisify(glob)

async function run(): Promise<void> {
  try {
    const key: string = core.getInput('key')
    const secret: string = core.getInput('secret')
    if (!key || key === '' || !secret || secret === '') {
      core.setFailed('Invalid credentials')
      return
    }
    // let host = core.getInput('host')
    // host = !host || host === '' ? 'https://api.staging.textile.io:3447' : host
    const ctx = new Context('https://api.staging.textile.io:3447')

    await ctx.withUserKey({
      key,
      secret,
      type: 0
    })

    const thread: string = core.getInput('thread')
    const threadID = ThreadID.fromString(thread)
    ctx.withThread(threadID)

    try {
      const buckets = new Buckets(ctx)
      const roots = await buckets.list()
      const name: string = core.getInput('bucket')
      const existing = roots.find(bucket => bucket.name === name)

      let bucketKey = ''
      if (existing) {
        bucketKey = existing.key
      } else {
        const created = await buckets.init(name)
        if (!created.root) {
          core.setFailed('Failed to create bucket')
          return
        }
        bucketKey = created.root.key
      }

      const pattern = core.getInput('pattern')
      const target = core.getInput('path')
      // const debug = core.getInput('debug') === 'true'
      const cwd = path.join('./', target)
      const options = {
        cwd,
        nodir: true
      }
      // path = path === '' ? '.' : path

      if (true == true) {
        const files = await globDir(pattern, {
          cwd: './',
          nodir: true
        })
        core.setFailed(`No files found: ${files.join(', ')}`)
        return
      }

      const files = await globDir(pattern, options)
      if (files.length === 0) {
        core.setFailed(`No files found: ${cwd} ${pattern}`)
        return
      }
      let raw
      for (let file of files) {
        const filePath = `${cwd}/${file}`
        const buffer = await readFile(filePath)
        const upload = {
          path: `/${file}`,
          content: buffer
        }
        raw = await buckets.pushPath(bucketKey, `/${file}`, upload)
      }

      const ipfs = raw ? raw.root.replace('/ipfs/', '') : ''
      core.setOutput('ipfs', ipfs)
      core.setOutput('ipfsLink', `https://ipfs.io${ipfs}`)

      core.setOutput('ipns', `${bucketKey}`)
      core.setOutput('ipnsLink', `https://${bucketKey}.ipns.hub.textile.io`)

      core.setOutput(
        'threadLink',
        `https://${thread}.thread.hub.textile.io/${bucketKey}`
      )
      core.setOutput('http', `https://${bucketKey}.textile.space`)
    } catch (error) {
      core.setFailed(error.message)
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
