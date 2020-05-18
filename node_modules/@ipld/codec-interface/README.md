# Install

```
npm install @ipld/codec-interface
```

# Codec Interface

This is the primary interface for implementing new codecs.

The interface is quite simple:

```
{
  encode: Function,
  decode: Function,
  codec: String,
  reader: Function
}
```

## encode & decode

These are the primary methods you need to implement in order to implement a new codec.

While you *can* implement the entire `Reader` interface yourself, you can actually leverage 
our `codec-interface.create` utility to get a full implementation with these methods alone.

* `encode` takes a native JavaScript object and returns a binary encoding.
* `decode` takes a binary encoding and returns a nativfe JavaScript object.

Methods can be either synchronous or asynchronous (returns a promise).

## reader(block)

The reader function accepts a `Block` instance and returns a full `Reader` interface.

This method can be either synchronous or asynchronous (returns a promise).

## `codec-interface.create(encode, decode, codecName)`

Returns a full `Codec Interface` based on your encode and decode implementations.

## Reader()

### Reader.get(path

### Reader.links()

Returns a generator of all the links in the block.

### Reader.tree()


