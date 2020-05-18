'use strict'
const { Buffer } = require('buffer')
const ci = require('@ipld/codec-interface')
const multicodec = require('multicodec')

if (!window.codecCache) {
  window.codecCache = {}
}

const cache = window.codecCache

const _convert = c => ci.create(c.util.serialize, c.util.deserialize, multicodec.print[c.codec])
const toBuffer = b => Buffer.isBuffer(b) ? b : Buffer.from(b)

cache['dag-json'] = require('@ipld/dag-json')
cache['dag-cbor'] = _convert(require('ipld-dag-cbor'))
cache['dag-pb'] = _convert(require('ipld-dag-pb'))
cache.raw = {
  encode: x => toBuffer(x),
  decode: x => toBuffer(x),
  codec: 'raw'
}

const getCodec = codec => {
  if (cache[codec]) return cache[codec]
  throw new Error(`Unknown codec ${codec}`)
}

module.exports = getCodec

module.exports.setCodec = codec => {
  if (codec.util) codec = _convert(codec)
  cache[codec.codec] = codec
}
