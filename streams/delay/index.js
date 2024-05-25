import { Transform } from 'node:stream'
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
  const stream = db('messages').select('*').stream()

  const transformer = new Transform({
    objectMode: true,
    transform(chunk, encoding, callback) {
      setTimeout(() => {
        this.push(JSON.stringify(chunk))
        callback()
      }, req.query.delay || 100)
    }
  })

  stream.pipe(transformer).pipe(res)
  stream.on('error', next)
})

export default router
