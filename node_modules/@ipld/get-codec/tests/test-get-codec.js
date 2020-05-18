'use strict'
/* globals it */
const getCodec = require('../')
const assert = require('assert')
const tsame = require('tsame')
const ci = require('@ipld/codec-interface')

const same = (...args) => assert.ok(tsame(...args))
const test = it

test('dag-json', done => {
  const codec = getCodec('dag-json')
  assert(codec.encode)
  assert(codec.decode)
  const buffer = codec.encode({ hello: 'world' })
  const obj = codec.decode(buffer)
  same(obj, { hello: 'world' })
  done()
})

test('dag-cbor', done => {
  const codec = getCodec('dag-cbor')
  assert(codec.encode)
  assert(codec.decode)
  const buffer = codec.encode({ hello: 'world' })
  const obj = codec.decode(buffer)
  same(obj, { hello: 'world' })
  done()
})

test('setCodec', done => {
  let codec = getCodec('dag-json')
  codec = ci.create(codec.encode, codec.decode, 'dag-nope')
  getCodec.setCodec(codec)
  codec = getCodec('dag-nope')
  assert(codec.encode)
  assert(codec.decode)
  const buffer = codec.encode({ hello: 'world' })
  const obj = codec.decode(buffer)
  same(obj, { hello: 'world' })
  done()
})

test('raw', done => {
  const codec = getCodec('raw')
  const b = Buffer.from(Math.random().toString())
  same(codec.decode(b), b)
  same(codec.encode(b), b)
  done()
})

test('error', done => {
  const str = Math.random().toString()
  try {
    getCodec(str)
    assert.ok(false)
  } catch (e) {
    same(e.message, `Unknown codec ${str}`)
  }
  done()
})
