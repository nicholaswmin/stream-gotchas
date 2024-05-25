import zlib from 'node:zlib'
import express from 'express'
import listroutes from 'express-list-routes'
import JSONStream from 'JSONStream'
import knex from 'knex'

const app = express()
const db = knex({
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ?
      false : { rejectUnauthorized: false }
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
  const stream = db('messages').select('*').stream()

  stream.pipe(JSONStream.stringify()).pipe(res)

  stream.on('error', err => {
    console.log(err.message)

    res.status(500).send('Status:500')

    stream.destroy()
  })
})

app.get('/gzipped', async (req, res, next) => {
  res.setHeader('Content-Encoding', 'gzip')

  const stream = db('messages').select('*').stream()
  const gzip = zlib.createGzip()

  stream.pipe(JSONStream.stringify()).pipe(gzip).pipe(res)

  stream.on('error', err => {
    stream.destroy()
    res.status(500).send('Oops, error :(')
    console.log(err.message)
  })
})

app.get('/client-abort', async (req, res, next) => {
  const stream = db('await pg_sleep(3)').select('*').stream()
  const gzip = zlib.createGzip()

  stream.pipe(JSONStream.stringify()).pipe(gzip).pipe(res)

  stream.on('error', err => {
    stream.destroy()
    res.status(500).send('Oops, error :(')
  })

  setTimeout(() => req.destroy(new Error('client abort')), 250)
})

app.get('/query-error', async (req, res, next) => {
  const connection = await db.client.acquireConnection()
  const stream = db('pg_sleep').select('*').connection(connection).stream()
  const gzip = zlib.createGzip()

  stream.pipe(JSONStream.stringify()).pipe(gzip).pipe(res)

  stream.on('error', err => {
    stream.destroy()
    res.status(500).send('Oops, error :(')
    console.log(err.message)
  })

  await db.raw(`SELECT pg_terminate_backend(${connection.processID});`)
  await db.client.releaseConnection()
})

export default app.listen(process.env.PORT || 5020, function() {
  console.log('Listening on: %s', this.address().port)
})
