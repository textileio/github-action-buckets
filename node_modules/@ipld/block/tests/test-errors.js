'use strict'
/* globals it */
const Block = require('../')
const assert = require('assert')
const tsame = require('tsame')

const same = (...args) => assert.ok(tsame(...args))
const test = it

const tryError = async (fn, message) => {
  try {
    await fn()
  } catch (e) {
    same(e.message, message)
  }
}

test('No block options', async () => {
  await tryError(() => new Block(), 'Block options are required')
})

test('No data or source', async () => {
  await tryError(() => new Block({}), 'Block instances must be created with either an encode source or data')
})

test('source only', async () => {
  await tryError(() => new Block({ source: {} }), 'Block instances created from source objects must include desired codec')
})

test('data only', async () => {
  await tryError(() => new Block({ data: Buffer.from('asdf') }), 'Block instances created from data must include cid or codec')
})

test('set opts', async () => {
  const block = Block.encoder({}, 'dag-cbor')
  await tryError(() => { block.opts = 'asdf' }, 'Cannot set read-only property')
})
