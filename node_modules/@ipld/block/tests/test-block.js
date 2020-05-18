'use strict'
/* globals it */
const Block = require('../')
const dagjson = require('@ipld/dag-json')
const assert = require('assert')
const CID = require('cids')
const dagPB = require('ipld-dag-pb')
const DAGNode = dagPB.DAGNode

const same = assert.deepStrictEqual
const test = it

test('Block encode', done => {
  const block = Block.encoder({ hello: 'world' }, 'dag-json')
  const encoded = block.encode()
  assert.ok(Buffer.isBuffer(encoded))
  same(encoded, dagjson.encode({ hello: 'world' }))
  done()
})

test('native types', done => {
  const block = Block.encoder('foo', 'dag-cbor')
  const encoded = block.encode()
  assert.ok(Buffer.isBuffer(encoded))
  const flip = obj => {
    const encoded = Block.encoder(obj, 'dag-cbor').encode()
    return Block.decoder(encoded, 'dag-cbor').decode()
  }
  same(flip('test'), 'test')
  same(flip(null), null)
  same(flip(12), 12)
  same(flip(-1), -1)
  same(flip(1.2), 1.2)
  same(flip(true), true)
  same(flip(false), false)
  same(flip([]), [])
  same(flip(['asdf']), ['asdf'])
  done()
})

test('Block data caching', done => {
  const block = Block.encoder({ hello: 'world' }, 'dag-cbor')
  const encoded = block.encodeUnsafe()
  encoded.test = true
  assert.ok((block.encodeUnsafe()).test)
  done()
})

test('Block decode', async () => {
  const data = dagjson.encode({ hello: 'world' })
  let block = Block.decoder(data, 'dag-json')
  let decoded = block.decode()
  same(decoded, { hello: 'world' })
  block = Block.encoder({ hello: 'world' }, 'dag-json')
  decoded = block.decode()
  same(decoded, { hello: 'world' })
  // test data caching
  decoded = block.decode()
  same(decoded, { hello: 'world' })
  same(await block.validate(), true)
})

test('Block cid', async () => {
  let block = Block.encoder({ hello: 'world' }, 'dag-cbor')
  let cid = await block.cid()
  same(cid.toBaseEncodedString('base58btc'), 'zdpuAtX7ZibcWdSKQwiDCkPjWwRvtcKCPku9H7LhgA4qJW4Wk')
  block = Block.encoder({ hello: 'world' }, 'dag-cbor', 'sha1')
  cid = await block.cid()
  same(cid.toBaseEncodedString('base58btc'), 'z8d8Cu56HEXrUTgRbLdkfRrood2EhZyyL')
  block = Block.create(await block.encode(), 'z8d8Cu56HEXrUTgRbLdkfRrood2EhZyyL')
  same((await block.cid()).toBaseEncodedString('base58btc'), 'z8d8Cu56HEXrUTgRbLdkfRrood2EhZyyL')
  same(block.codec, 'dag-cbor')
  same(await block.validate(), true)
  block = Block.create(await block.encode(), cid)
  same((await block.cid()).toBaseEncodedString('base58btc'), 'z8d8Cu56HEXrUTgRbLdkfRrood2EhZyyL')
  same(block.codec, 'dag-cbor')
  block = Block.create(Buffer.from('asdf'), 'z8d8Cu56HEXrUTgRbLdkfRrood2EhZyyL')
  same(await block.validate(), false)
})

test('raw codec', done => {
  let block = Block.encoder(Buffer.from('asdf'), 'raw')
  let data = block.encode()
  same(data, Buffer.from('asdf'))
  block = Block.decoder(Buffer.from('asdf'), 'raw')
  data = block.decode()
  same(data, Buffer.from('asdf'))
  block = Block.encoder(Buffer.from('asdf'), 'raw')
  data = block.decode()
  same(data, Buffer.from('asdf'))
  done()
})

test('source', async () => {
  let encoder = Block.encoder({ hello: 'world' }, 'dag-json')
  same(encoder.source(), { hello: 'world' })
  await encoder.cid()
  same(encoder.source(), null)
  encoder = Block.encoder({}, 'dag-json')
  encoder.encode()
  same(encoder.source(), null)
  const block = Block.decoder(Buffer.from('asd'), 'dag-json')
  same(block.source(), null)
  encoder = Block.encoder({}, 'dag-json')
  delete encoder.opts.source
  same(encoder.source(), null)
})

test('reader', done => {
  const encoder = Block.encoder({ hello: 'world' }, 'dag-json')
  const reader = encoder.reader()
  same(reader.get('hello').value, 'world')
  done()
})

test('decode cache', done => {
  const block = Block.encoder({ hello: 'world' }, 'dag-cbor')
  const decoded = block.decodeUnsafe()
  decoded.test = true
  assert.ok(block.decode().test)
  block.decode().test = false
  assert.ok(block.decode().test)
  assert.ok(block.decodeUnsafe().test)
  done()
})

test('decode deep object', done => {
  const cid = new CID('zdpuAtX7ZibcWdSKQwiDCkPjWwRvtcKCPku9H7LhgA4qJW4Wk')
  const o = { a: { b: [cid], c: Buffer.from('x') } }
  const block = Block.encoder(o, 'dag-json')
  const decoded = block.decode()
  same(decoded, o)
  done()
})

test('decode of immutable types', done => {
  let block = Block.encoder(1, 'dag-json')
  same(block.decode(), 1)
  block = Block.encoder(true, 'dag-json')
  same(block.decode(), true)
  done()
})

test('safe clone of buffers', done => {
  const block = Block.encoder(Buffer.from('test'), 'raw')
  const decoded = block.decode()
  decoded[0] = 'd'.charCodeAt(0)
  same(block.decode().toString(), 'test')
  done()
})

test('dag-pb encode/decode', done => {
  const node = new DAGNode(Buffer.from('some data'))
  const block = Block.encoder(node, 'dag-pb')
  const encoded = block.encode()
  const decoded = block.decode()
  same(encoded, Block.decoder(encoded, 'dag-pb').encode())
  same(decoded._data, Buffer.from('some data'))
  done()
})

test('block equals', async () => {
  const block1 = Block.encoder({ hello: 'world' }, 'dag-cbor')
  const block2 = Block.encoder({ hello: 'world' }, 'dag-cbor')
  const block3 = Block.encoder('hello world', 'dag-cbor')
  same(await block1.equals(block1), true)
  same(await block1.equals(await block1.cid()), true)
  same(await block1.equals(block2), true)
  same(await block1.equals(block3), false)
})
