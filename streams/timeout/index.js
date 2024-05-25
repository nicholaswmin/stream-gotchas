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

router.get('/stream/timeout', async (req, res, next) => {
  const stream = await db.raw(`SELECT pg_sleep(1)`).stream()
    .timeout(100, { cancel: true })

  stream.pipe(JSONStream.stringify()).pipe(res)

  stream.on('error', err => {
    res.status(500)

    next(err)
  })
})

export default router
