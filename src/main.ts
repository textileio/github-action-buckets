// @ts-ignore
;(global as any).WebSocket = require('ws')

import {resolve} from 'path'
import fs, {readdir, PathLike} from 'fs'
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

    const ctx = new Context(
      core.getInput('host') || 'https://api.textile.io:3447'
    )
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
      let path = core.getInput('path')
      path = path === '' ? '.' : path
      const options = {
        cwd: path,
        nodir: true
      }
      const files = await globDir(pattern, options)
      if (files.length === 0) {
        core.setFailed('No files found')
        return
      }
      let raw
      for (let file of files) {
        const filePath = `${path}/${file}`
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

      core.debug(`https://${thread}.thread.hub.textile.io/buckets/${bucketKey}`)
      core.debug(`https://ipfs.io/ipns/${bucketKey}`)
      core.debug(`https://${bucketKey}.textile.space`)
    } catch (error) {
      core.setFailed(error.message)
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()