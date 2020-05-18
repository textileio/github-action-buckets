'use strict'
const CID = require('cids')

/* eslint-disable max-depth */
const links = function * (decoded, path = []) {
  for (const key of Object.keys(decoded)) {
    const _path = path.slice()
    _path.push(key)
    const val = decoded[key]
    if (val && typeof val === 'object') {
      if (Array.isArray(val)) {
        for (let i = 0; i < val.length; i++) {
          const __path = _path.slice()
          __path.push(i)
          const o = val[i]
          if (CID.isCID(o)) {
            yield [__path.join('/'), o]
          } else if (typeof o === 'object') {
            yield * links(o, __path)
          }
        }
      } else {
        if (CID.isCID(val)) {
          yield [_path.join('/'), val]
        } else {
          yield * links(val, _path)
        }
      }
    }
  }
}

const tree = function * (decoded, path = []) {
  for (const key of Object.keys(decoded)) {
    const _path = path.slice()
    _path.push(key)
    yield _path.join('/')
    const val = decoded[key]
    if (val && typeof val === 'object' && !CID.isCID(val)) {
      if (Array.isArray(val)) {
        for (let i = 0; i < val.length; i++) {
          const __path = _path.slice()
          __path.push(i)
          const o = val[i]
          yield __path.join('/')
          if (typeof o === 'object' && !CID.isCID(o)) {
            yield * tree(o, __path)
          }
        }
      } else {
        yield * tree(val, _path)
      }
    }
  }
}
/* eslint-enable max-depth */

const readonly = () => {
  throw new Error('Read-only property')
}

class Reader {
  constructor (decoded) {
    Object.defineProperty(this, 'decoded', {
      get: () => decoded,
      set: readonly
    })
  }

  get (path) {
    let node = this.decoded
    path = path.split('/').filter(x => x)
    while (path.length) {
      const key = path.shift()
      if (node[key] === undefined) { throw new Error(`Object has no property ${key}`) }
      node = node[key]
      if (CID.isCID(node)) return { value: node, remaining: path.join('/') }
    }
    return { value: node }
  }

  links () {
    return links(this.decoded)
  }

  tree () {
    return tree(this.decoded)
  }
}

class CodecInterface {
  constructor (encode, decode, codec) {
    this.encode = encode
    this.decode = decode
    Object.defineProperty(this, 'codec', { get: () => codec, set: readonly })
  }

  reader (block) {
    // Skip a decoding if the source is available.
    if (block.source && block.source()) return new Reader(block.source())
    // Full decoding is required for the standard Reader interface
    const decoded = block.decode()
    return new Reader(decoded)
  }
}

exports.create = (encode, decode, codec) => {
  return new CodecInterface(encode, decode, codec)
}
exports.CodecInterface = CodecInterface
exports.Reader = Reader
