import { Readable, PassThrough } from 'node:stream'
import zlib from 'node:zlib'
import { setTimeout as wait } from 'node:timers/promises'
import JSONStream from 'JSONStream'
import express from 'express'
import Monitor from '../utils/streamstat/index.js'

const app = express()

app.get('/do-something', (req, res) => {
  const monitor = new Monitor({
    title: 'Observe',
    ignore: ['drain', 'resume', 'pause']
  })

  const data = Array.from({ length: 100 },
      (_, i) => Array(100).fill({ foo: 'bar'.repeat(100) }))
  const gzip = zlib.createGzip()
  const stringifier = JSONStream.stringify()
  const readable = new Readable.from(data)
  const passthrough = new PassThrough({
    objectMode: true,
    transform(obj, _, cb) {
      setTimeout(() =>
        cb(null, JSON.stringify(obj)), 100)
    }
  })

  const pipe = readable.pipe(stringifier).pipe(gzip).pipe(passthrough).pipe(res)

  monitor
    .add(req, 'req')
    .add(readable, 'data-stream')
    .add(passthrough, 'passthrough')
    .add(stringifier, 'JSONStream.stringify')
    .add(gzip, 'gzip')
    .add(pipe, 'pipe')
    .add(res, 'res')

  req.on('error', err => {
    if (err.message.includes('aborted'))
      [readable, passthrough, res]
        .forEach(stream => stream.destroy())
  })

  res.once('finish', () => {
    setTimeout(() => {
      monitor.reportGroups()
    }, 2000)
  })
})

const server = app.listen(5052, () => {
  console.log('Listening on:', server.address().port)
})

export default server
