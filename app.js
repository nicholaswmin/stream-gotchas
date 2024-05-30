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
    afterCreate: (conn, done) => conn.query(
      `SET statement_timeout=10000000;`,
      err => done(err, conn)
    )
  }
})

app.set('view engine', 'pug')

app.get('/', (req, res) => {
  res.render('index', {
    routes: listroutes(app)
      .map(route =>
        ({ ...route, path: route.path }))
  })
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

app.get('/gzipped', async (req, res, next) => {
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
    const { comment } = req.query
    const stringifier = JSONStream.stringify()
    const delayer = delay()
    const conn = await db.client.acquireConnection()
    const stream = db('messages')
      .select('*')
      .connection(conn)
      .comment(comment || '')
      .stream()

    req.on('error', async err => {
      if (err.message?.includes('abort')) {
        ;[req, stream, stringifier, delayer, res]
          .forEach(stream => stream.destroy())

      if (stream.readable)
        await db.raw(`SELECT pg_cancel_backend(${conn.processID});`)
          .timeout(5000, { cancel: false })
          .then(res => res.rowCount || console.warn('statement not found'))
          .then(() => db.client.releaseConnection(connection))
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
    const connection = await db.client.acquireConnection()
    const stream = db('pg_sleep').select('*').connection(connection).stream()
    const gzip = zlib.createGzip()

    stream.pipe(JSONStream.stringify()).pipe(gzip).pipe(res)

    stream.on('error', err => {
      stream.destroy()
      next(err)
    })

    await db.raw(`SELECT pg_terminate_backend(${connection.processID});`)
    await db.client.releaseConnection()
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
