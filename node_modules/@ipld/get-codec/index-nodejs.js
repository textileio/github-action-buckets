'use strict'
const ci = require('@ipld/codec-interface')
const multicodec = require('multicodec')

const raw = {
  encode: x => x,
  decode: x => x,
  codec: 'raw'
  // no reader, you can't read raw blocks
}

const implementations = [
  'ipld-dag-cbor',
  'ipld-dag-pb',
  'ipld-bitcoin',
  'ipld-zcash',
  'ipld-git']
  .map(str => require(str))
  // .concat(Object.values(require('ipld-ethereum')))
  .map(c => ci.create(c.util.serialize, c.util.deserialize, multicodec.print[c.codec]))
  .concat([
    require('@ipld/dag-json'),
    raw
  ])
  .reduce((obj, codec) => {
    obj[codec.codec] = codec
    return obj
  }, {})

/* temp getFormat until the real one is implemented */
const getCodec = codec => {
  if (implementations[codec]) return implementations[codec]
  else throw new Error(`Unknown codec ${codec}`)
}

module.exports = getCodec
module.exports.setCodec = codec => {
  implementations[codec.codec] = codec
}
