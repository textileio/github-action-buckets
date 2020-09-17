import * as process from 'process'
import * as cp from 'child_process'
import * as path from 'path'
import dotenv from 'dotenv'
import {execute} from '../src/main'

dotenv.config()
test('test raw runs', async () => {
  const {env} = process
  const result = await execute(
    env.INPUT_API || '',
    env.INPUT_KEY || '',
    env.INPUT_SECRET || '',
    env.INPUT_THREAD || '',
    env.INPUT_BUCKET || '',
    'false',
    '*/**',
    env.INPUT_PATH || '',
    './'
  )
  expect(result.get('ipfs')).toBeDefined()
})

test('test core runs', () => {
  const ip = path.join(__dirname, '..', 'lib', 'main.js')
  const options: cp.ExecSyncOptions = {
    env: process.env
  }
  try {
    const res = cp.execSync(`node ${ip}`, options).toString()
    console.log(res)
    throw new Error('okay')
  } catch (error) {
    expect(error.message).toEqual('okay')
  }
})
