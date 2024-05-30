import { setTimeout as wait } from 'node:timers/promises'
import { Transform } from 'node:stream'
import zlib from 'node:zlib'

import express from 'express'
import listroutes from 'express-list-routes'
import JSONStream from 'JSONStream'
import knex from 'knex'

import Memstat from './test/utils/memstat/watch.js'
import delay from './test/utils/delay/index.js'

const app = express()
const db = knex({
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL || (() => {
      throw new Error('DATABASE_URL env. var is required')
    })(),
    ssl: process.env.DATABASE_URL.includes('localhost') ?
      false : { rejectUnauthorized: false }
  },
  pool: {
    min: 2,
    max: 50,
    afterCreate: (conn, done) => {
      return conn.query(
       `SET statement_timeout=${global.statement_timeout || 1000000};`,
       err => done(err, conn)
     )
    }
  }
})

app.get('/uncompressed', async (req, res, next) => {
  try {
    const stream = db('messages').select('*').stream()

    stream.pipe(JSONStream.stringify()).pipe(res)

    stream.on('error', err => {
      console.log(err.message)

      res.status(500).send('Status:500')

      stream.destroy()
    })
  } catch (err) {
    next(err)
  }
})

app.get('/compressed', async (req, res, next) => {
  try {
    const stream = db('messages').select('*').stream()
    const jsonStream = stream.pipe(JSONStream.stringify())

    if (req.acceptsEncodings().includes('gzip')) {
      res.setHeader('Content-Encoding', 'gzip')

      jsonStream.pipe(zlib.createGzip()).pipe(res)
    } else {
      jsonStream.pipe(res)
    }
  } catch (err) {
    next(err)
  }
})

app.get('/backpressure', async (req, res, next) => {
  try {
    const stream = db('messages')
      .select('*')
      .comment(req.query.comment || '')
      .stream()
      .pipe(JSONStream.stringify())
      .pipe(delay())
      .on('data', function(chunk) {
        res.write(chunk)
      })
      .on('end', function() {
        res.end()
      })
  } catch (err) {
    next(err)
  }
})

app.get('/backpressure/fixed', async (req, res, next) => {
  try {
    let shouldWrite = true

    const stream = db('messages')
      .select('*')
      .comment(req.query.comment || '')
      .stream()
      .pipe(JSONStream.stringify())
      .pipe(delay())
      .pipe(res)
  } catch (err) {
    next(err)
  }
})

app.get('/client-abort', async (req, res, next) => {
  try {
    const stream = db('messages')
      .select('*')
      .comment(req.query.comment || '')
      .stream()

    stream
      .pipe(JSONStream.stringify())
      .pipe(delay())
      .pipe(res)
  } catch (err) {
    next(err)
  }
})

app.get('/client-abort/fixed', async (req, res, next) => {
  try {
    const stringifier = JSONStream.stringify()
    const delayer = delay()
    const conn = await db.client.acquireConnection()
    const stream = db('messages')
      .select('*')
      .connection(conn)
      .comment(req.query.comment || '')
      .stream()

    req.on('error', async err => {
      if (err.message?.includes('abort')) {
        ;[req, stream, stringifier, delayer, res]
          .forEach(stream => stream.destroy())

      if (stream.readable)
        await db.raw(`SELECT pg_cancel_backend(${conn.processID});`)
          .timeout(5000, { cancel: false })
          .then(res => res.rowCount || console.warn('statement not found'))
          .then(() => db.client.releaseConnection(conn))
      }
    })

    stream
      .pipe(stringifier)
      .pipe(delayer)
      .pipe(res)
  } catch (err) {
    next(err)
  }
})

app.get('/query-error', async (req, res, next) => {
  try {
    const conn = await db.client.acquireConnection()
    const stream = db('messages')
      .select('*')
      .connection(conn)
      .comment(req.query.comment || '')
      .stream()

    stream.on('error', function() {
      // not really handled, but at least listening to it
      // so it doesn't crash the process
    })

    stream
      .pipe(JSONStream.stringify())
      .pipe(delay())
      .pipe(res)
  } catch (err) {
    next(err)
  }
})

app.get('/query-error/trailers', async (req, res, next) => {
  try {
    const stream = db('messages')
      .select('*')
      .stream()

    const stringifier = new Transform({
      objectMode: true,
      construct(cb) {
        cb()
        this.timesCalled = 0
      },
      transform(chunk, _, cb) {
        res.addTrailers({'Stream-Status': 'error' })
        return ++this.timesCalled < 10000 ?
          cb(null, JSON.stringify(chunk)) :
          cb(new Error('transformer has failed'))
      }
    })

    stringifier.on('error', () => {
      console.log('added trailer')
      res.addTrailers({'Stream-Status': 'error' })
      ;[req, stream, res].forEach(stream => {
        if (!stream.destroyed)
          stream.destroy()
      })
    })

    res.writeHead(200, { 'Trailer': 'Stream-Status' })
    console.log('added head')

    setTimeout(() => {
      res.addTrailers({'Stream-Status': 'ok' })
    }, 50)

    stream.pipe(stringifier).pipe(res)
  } catch (err) {
    next(err)
  }
})

app.get('/query-error/fixed', async (req, res, next) => {
  try {
    const stringifier = JSONStream.stringify()
    const delayer = delay()
    const conn = await db.client.acquireConnection()
    const stream = db.raw(`SELECT pg_sleep(10)`)
      .connection(conn)
      .stream()

    stream.on('error', err => {
      if (err.code === '57014')
        res.status(408).send('Timed out')

      ;[req, stream, stringifier, delayer, res]
        .forEach(stream => stream.destroy())

      db.client.releaseConnection(conn)
    })

    stream
      .pipe(stringifier)
      .pipe(delayer)
      .pipe(res)
  } catch (err) {
    next(err)
  }
})

app.get('/stream-error', async (req, res, next) => {
  try {
    const stringifier = JSONStream.stringify()
    const gzip = zlib.createGzip()
    const delayer = delay()
    const stream = db('messages')
      .select('*')
      .comment(req.query.comment || '')
      .stream()

    gzip.on('error', function() {
      // not really handled, but at least listening to it
      // so it doesn't crash the process
    })

    stream
      .pipe(JSONStream.stringify())
      .pipe(gzip)
      .pipe(delay())
      .pipe(res)

    setTimeout(() =>
      gzip.emit('error', new Error('simulated gzip error')), 50)
  } catch (err) {
    next(err)
  }
})

app.get('/stream-error/fixed', async (req, res, next) => {
  try {
    const stringifier = JSONStream.stringify()
    const gzip = zlib.createGzip()
    const delayer = delay()
    const stream = db('messages')
      .select('*')
      .comment(req.query.comment || '')
      .stream()

    ;[stream, stringifier, gzip, delayer, res]
      .forEach(stream => stream.on('error', err => {
        ;[req, stream, stringifier, gzip, res] // add more streams if necessary
          .filter(stream => !stream.destroyed)
          .forEach(stream => stream.destroy())

        console.error(err)
      }))

    stream
      .pipe(stringifier)
      .pipe(gzip)
      .pipe(delayer)
      .pipe(res)

    setTimeout(() =>
      gzip.emit('error', new Error('simulated gzip error')), 50)
  } catch (err) {
    next(err)
  }
})

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).send('oops! server error!')
})

const server = app.listen(process.env.PORT || 5020, function() {
  console.log('Listening on: %s', this.address().port)
})

export { db as db, server as server }
