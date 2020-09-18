import axios from 'axios'
import * as process from 'process'
import * as cp from 'child_process'
import delay from 'delay'
import * as path from 'path'
import dotenv from 'dotenv'
import { Context, ContextInterface } from '@textile/context'
import * as pb from '@textile/hub-grpc/hub_pb'
import { WebsocketTransport } from '@textile/grpc-transport'
import { APIServiceClient, ServiceError } from '@textile/hub-grpc/hub_pb_service'
import { execute } from '../src/main'
import { Buckets } from '@textile/buckets'

// dotenv.config()

// Settings for localhost development and testing
const addrApiurl = 'http://127.0.0.1:3007'
const addrGatewayUrl = 'http://127.0.0.1:8006'
const sessionSecret = 'hubsession'
let key = ''
let secret = ''
let testThread = ''

// const { env } = process

beforeAll(async () => {
  const ctx = new Context(addrApiurl)
  const user = await signUp(ctx, addrGatewayUrl, sessionSecret)
  ctx.withSession(user.user?.session)
  if (!user.user) throw new Error('user signup error')
  const dev = user.user
  const tmp = new Context(addrApiurl).withSession(dev.session)
  const { keyInfo } = await createKey(tmp, 'KEY_TYPE_ACCOUNT')
  if (!keyInfo) throw new Error('no keys generated')
  key = keyInfo.key
  secret = keyInfo.secret
  const buckets = await Buckets.withKeyInfo({ key, secret }, { host: addrApiurl })
  const { root, threadID } = await buckets.getOrCreate('test')
  if (!threadID) throw new Error('no thread generated')
  testThread = threadID.toString()
})

test('test raw runs', async () => {
  const result = await execute(addrApiurl, key, secret, testThread, 'test', 'false', '*/**', 'website', './')
  expect(result.get('ipfs')).toBeDefined()
})

test('test core runs', () => {
  const ip = path.join(__dirname, '..', 'lib', 'main.js')
  const input = {
    INPUT_API: addrApiurl,
    INPUT_KEY: key,
    INPUT_SECRET: secret,
    INPUT_THREAD: testThread,
    INPUT_BUCKET: 'test',
    INPUT_REMOVE: 'false',
    INPUT_PATTERN: '*/**',
    INPUT_PATH: 'website',
    INPUT_HOME: './',
  }
  console.log({ ...process.env, ...input })
  const options: cp.ExecSyncOptions = {
    env: { ...process.env, ...input },
  }
  try {
    const res = cp.execSync(`node ${ip}`, options).toString()
    console.log(res)
    throw new Error('okay')
  } catch (error) {
    expect(error.message).toEqual('okay')
  }
})

export const createKey = (ctx: ContextInterface, kind: keyof pb.KeyTypeMap) => {
  return new Promise<pb.CreateKeyResponse.AsObject>((resolve, reject) => {
    const req = new pb.CreateKeyRequest()
    req.setType(pb.KeyType[kind])
    req.setSecure(false)
    const client = new APIServiceClient(ctx.host, {
      transport: WebsocketTransport(),
    })
    ctx.toMetadata().then((meta) => {
      return client.createKey(req, meta, (err: ServiceError | null, message: pb.CreateKeyResponse | null) => {
        if (err) reject(err)
        resolve(message?.toObject())
      })
    })
  })
}

const createUsername = (size = 12) => {
  return Array(size)
    .fill(0)
    .map(() => Math.random().toString(36).charAt(2))
    .join('')
}

const createEmail = () => {
  return `${createUsername()}@doe.com`
}

const confirmEmail = async (gurl: string, secret: string) => {
  await delay(500)
  const resp = await axios.get(`${gurl}/confirm/${secret}`)
  if (resp.status !== 200) {
    throw new Error(resp.statusText)
  }
  return true
}

const signUp = (ctx: ContextInterface, addrGatewayUrl: string, sessionSecret: string) => {
  const username = createUsername()
  const email = createEmail()
  return new Promise<{
    user: pb.SignupResponse.AsObject | undefined
    username: string
    email: string
  }>((resolve, reject) => {
    const req = new pb.SignupRequest()
    req.setEmail(email)
    req.setUsername(username)
    const client = new APIServiceClient(ctx.host, {
      transport: WebsocketTransport(),
    })
    ctx.toMetadata().then((meta) => {
      client.signup(req, meta, (err: ServiceError | null, message: pb.SignupResponse | null) => {
        if (err) reject(err)
        resolve({ user: message?.toObject(), username, email })
      })
      confirmEmail(addrGatewayUrl, sessionSecret).catch((err) => reject(err))
    })
  })
}
