import zlib from 'node:zlib'
import knex from 'knex'
import express from 'express'
import JSONStream from 'JSONStream'

import app from '../../app.js'

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

  stream.pipe(JSONStream.stringify()).pipe(res)

  stream.on('error', next)
})

export default router
