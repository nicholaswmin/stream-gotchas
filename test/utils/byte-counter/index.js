/*
# Byte counter

Counts the bytes that pass through a stream

```js
import byteCounter from './index.js'

const counter = byteCounter(opts) // Any PassThrough option

await pipeline(readable, counter).then(() => {
  counter.bytes.should.be.within(900000, 1100000)

})
```
*/

import { PassThrough } from 'node:stream'

export default opts => {
  return new PassThrough({
    ...opts,
    construct(callback) {
      callback()
      this.bytes = 0
    },
    transform(chunk, encoding, callback) {
      callback()
      this.bytes += chunk.length
    },
    final(callback) {
      callback()
    }
  })
}
