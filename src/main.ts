import * as core from '@actions/core'
import { execute } from '@textile/buck-util'


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
