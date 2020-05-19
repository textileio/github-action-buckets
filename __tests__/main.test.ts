import * as process from 'process'
import * as cp from 'child_process'
import * as path from 'path'
import dotenv from 'dotenv'

dotenv.config()

test('test runs', () => {
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
