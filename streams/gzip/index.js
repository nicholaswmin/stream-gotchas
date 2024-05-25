import zlib from 'node:zlib'
import knex from 'knex'
import express from 'express'
import JSONStream from 'JSONStream'

const router = express.Router()
const db = knex({
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ?
      false : { rejectUnauthorized: false }
  }
})

router.get('/', async (req, res, next) => {
  res.setHeader('Content-Encoding', 'gzip')

  const stream = db('messages').select('*').stream()
  const gzip = zlib.createGzip()

  stream.pipe(JSONStream.stringify()).pipe(gzip).pipe(res)

  stream.on('error', next)
})

export default router
