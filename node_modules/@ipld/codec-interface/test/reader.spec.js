'use strict'
/* globals it */
const { CodecInterface } = require('../')
const CID = require('cids')
const assert = require('assert')
const tsame = require('tsame')

const same = (...args) => assert.ok(tsame(...args))
const test = it

const link = new CID('zdpuAtX7ZibcWdSKQwiDCkPjWwRvtcKCPku9H7LhgA4qJW4Wk')

const fixture = {
  n: null,
  a: ['0', 1, link, {}, { n: null, l: link }],
  o: {
    n: null,
    l: link
  },
  l: link
}

const mock = new CodecInterface()

const getReader = () => mock.reader({ decode: () => fixture })

test('get path', () => {
  const reader = getReader()
  const one = reader.get('/a/1').value
  same(one, 1)
  const incomplete = reader.get('l/one/two')
  same(incomplete.remaining, 'one/two')
  assert.ok(CID.isCID(incomplete.value))
})

test('source optimization', () => {
  let reader = mock.reader({ source: () => fixture })
  let one = reader.get('/a/1').value
  same(one, 1)
  reader = mock.reader({ source: () => null, decode: () => fixture })
  one = reader.get('/a/1').value
  same(one, 1)
})

test('links', () => {
  const reader = getReader()
  const links = Array.from(reader.links())
  const keys = new Set(links.map(a => a[0]))
  same(keys, new Set(['a/2', 'a/4/l', 'l', 'o/l']))
  links.forEach(l => assert.ok(CID.isCID(l[1])))
})

test('tree', () => {
  const reader = getReader()
  const tree = Array.from(reader.tree())
  same(new Set(tree), new Set([
    'a',
    'a/0',
    'a/1',
    'a/2',
    'a/3',
    'a/4',
    'a/4/l',
    'a/4/n',
    'l',
    'n',
    'o',
    'o/l',
    'o/n'
  ]))
})

test('property not found', () => {
  const reader = getReader()
  let threw = false
  try {
    reader.get('notfound')
  } catch (e) {
    threw = true
    same(e.message, 'Object has no property notfound')
  }
  assert(threw)
})
