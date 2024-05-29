//
// A... um... "memory challenged"..server used for tests
//
// @nicholasmin
//

import { Readable, PassThrough } from 'node:stream'
import { setTimeout as wait } from 'node:timers/promises'
import express from 'express'

const app = express()

const createDummyData = ({ messageCount = 1000, messageSizeKB = 10 } = {}) =>
  Array.from({ length: messageCount }, _ =>
    JSON.stringify({ foo: 'bar'.repeat(350 * messageSizeKB) }))

// Always leaks

let leakyOne = []

app.get('/leaky/always', (req , res) => {
  const data = createDummyData()

  leakyOne.push(JSON.stringify(data))

  wait(10).then(() => res.sendStatus(204))
})

// Leaks sometimes

let leakyTwo = []

app.get('/leaky/sometimes', (req, res) => {
  const data = createDummyData()

  if (Math.random() > 0.50)
    leakyTwo.push(JSON.stringify(data))

  wait(10).then(() => res.sendStatus(204))
})

// The following endpoints don't leak, but can create excessive
// memory pressure

// Uses a significant amount of memory, but does not leak

app.get('/spikey', async ({ originalUrl }, res) => {
  let baz = [],
    data = createDummyData(),
    randomPos = Math.round(Math.random() * 275000)

  baz.push(JSON.stringify(data))

  wait(10).then(() => res.json(baz[randomPos]))
})

// Uses an insane amount of memory if user aborts early
// but doesn't leak - the mem usage is a result of unhandled
// user aborts

app.get('/spikey/user-abort', (req, res) => {
  const data = createDummyData({ messageSizeKB: 50 })

  const readable = new Readable.from(data)
  const passthrough = new PassThrough({
    objectMode: true,
    transform(obj, _, cb) {
      setTimeout(() => cb(null, JSON.stringify(obj)), 50)
    }
  })

  readable.pipe(passthrough).pipe(res)
})

// Same as the spikey stream above but this time
// the user abort is handled so memory is far better

app.get('/watertight/user-abort', (req, res) => {
  const data = createDummyData({ messageSizeKB: 50 })
  const readable = new Readable.from(data)

  const passthrough = new PassThrough({
    objectMode: true,
    transform(obj, _, cb) {
      setTimeout(() =>
        cb(null, JSON.stringify(obj))
      , 50) // Simulate a network delay
    }
  })

  readable.pipe(passthrough).pipe(res)

  // Detect user request abort and end/destroy
  // **all other** streams as well.
  req.on('error', err => {
    if (err.message.includes('aborted'))
      [readable, passthrough, res]
        .forEach(stream => stream.destroy())

    // @TODO Not sure if just `stream.destroy()` is enough,
    // might also need to unpipe??

    // Always log the error in non-test code!
    // console.error(err)
  })
})

// No problemo

app.get('/watertight', (req, res) => {
  wait(10).then(() => res.json({ first: 'John', last: 'Doe' }))
})

export default app.listen(0)
