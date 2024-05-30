// Artificially delay a stream for a bit more realistic tests
//
// @nicholaswmin

import { PassThrough } from 'node:stream'

export default opts => new PassThrough({
  ...opts,
  construct(cb) {
    cb()
  },
  transform(chunk, _, cb) {
    setTimeout(() => cb(null, chunk), opts?.delay || 5)
  }
})
