'use strict'
const { Buffer } = require('buffer')
const CID = require('cids')
const getCodec = require('@ipld/get-codec')
const withIs = require('class-is')
const transform = require('lodash.transform')

const readonly = value => ({ get: () => value, set: () => { throw new Error('Cannot set read-only property') } })

const multihashing = require('multihashing-async')

const immutableTypes = new Set(['number', 'string', 'boolean'])

const clone = obj => transform(obj, (result, value, key) => {
  if (CID.isCID(value)) {
    result[key] = value
  } else if (Buffer.isBuffer(value)) {
    const b = Buffer.allocUnsafe(value.length)
    value.copy(b)
    result[key] = b
  } else if (typeof value === 'object' && value !== null) {
    result[key] = clone(value)
  } else {
    result[key] = value
  }
})

class Block {
  constructor (opts) {
    if (!opts) throw new Error('Block options are required')
    if (typeof opts.source === 'undefined' &&
        typeof opts.data === 'undefined') {
      throw new Error('Block instances must be created with either an encode source or data')
    }
    if (opts.source && !opts.codec) {
      throw new Error('Block instances created from source objects must include desired codec')
    }
    if (opts.data && !opts.cid && !opts.codec) {
      throw new Error('Block instances created from data must include cid or codec')
    }
    if (!opts.cid && !opts.algo) opts.algo = 'sha2-256'
    // Do our best to avoid accidental mutations of the options object after instantiation
    // Note: we can't actually freeze the object because we mutate it once per property later
    opts = Object.assign({}, opts)
    Object.defineProperty(this, 'opts', readonly(opts))
  }

  source () {
    if (this.opts.cid || this.opts.data ||
        this._encoded || this._decoded) return null
    if (!this.opts.source) return null
    return this.opts.source
  }

  async cid () {
    if (this.opts.cid) return this.opts.cid
    const codec = this.codec
    const hash = await multihashing(await this.encode(), this.opts.algo)
    const cid = new CID(1, codec, hash)
    this.opts.cid = cid
    return cid
  }

  get codec () {
    if (this.opts.cid) return this.opts.cid.codec
    else return this.opts.codec
  }

  async validate () {
    // if we haven't created a CID yet we know it will be valid :)
    if (!this.opts.cid) return true
    const cid = await this.cid()
    const data = await this.encode()
    return multihashing.validate(data, cid.multihash)
  }

  _encode () {
    const codec = module.exports.getCodec(this.codec)
    this._encoded = this.opts.data || codec.encode(this.opts.source)
  }

  encode () {
    if (!this._encoded) this._encode()
    const buff = Buffer.allocUnsafe(this._encoded.length)
    this._encoded.copy(buff)
    return buff
  }

  encodeUnsafe () {
    if (!this._encoded) this._encode()
    return this._encoded
  }

  _decode () {
    const codec = module.exports.getCodec(this.codec)
    if (this.opts.source) this._decoded = this.opts.source
    else this._decoded = codec.decode(this._encoded || this.opts.data)
    return this._decoded
  }

  decode () {
    if (this.codec === 'dag-pb') return this._decode()
    if (!this._decoded) this._decode()
    const tt = typeof this._decoded
    if (tt === 'number' || tt === 'boolean') {
      // return any immutable types
      return this._decoded
    }
    if (Buffer.isBuffer(this._decoded)) return Buffer.from(this._decoded)
    if (immutableTypes.has(typeof this._decoded) || this._decoded === null) {
      return this._decoded
    }
    return clone(this._decoded)
  }

  decodeUnsafe () {
    if (!this._decoded) this._decode()
    return this._decoded
  }

  reader () {
    const codec = module.exports.getCodec(this.codec)
    return codec.reader(this)
  }

  async equals (block) {
    if (block === this) return true
    const cid = await this.cid()
    if (CID.isCID(block)) return cid.equals(block)
    return cid.equals(await block.cid())
  }
}

const BlockWithIs = withIs(Block, { className: 'Block', symbolName: '@ipld/block' })
BlockWithIs.getCodec = getCodec

BlockWithIs.encoder = (source, codec, algo) => new BlockWithIs({ source, codec, algo })
BlockWithIs.decoder = (data, codec, algo) => new BlockWithIs({ data, codec, algo })
BlockWithIs.create = (data, cid/*, validate = false */) => {
  if (typeof cid === 'string') cid = new CID(cid)
  /*
  if (validate) {
    // TODO: validate cid hash matches data
  }
  */
  return new BlockWithIs({ data, cid })
}
module.exports = BlockWithIs
