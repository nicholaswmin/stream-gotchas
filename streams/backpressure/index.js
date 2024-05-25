import { Transform } from 'node:stream'
import knex from 'knex'
import express from 'express'

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

  const transformer1 = new Transform({
    objectMode: true,
    transform(chunk, encoding, callback) {
      setTimeout(() => {
        this.push(JSON.stringify(chunk))
        callback()
        console.log(
          'Transformer 1',
          this._count = ++this._count || 1
          )
      }, 20)
    }
  })

  const transformer2 = new Transform({
    objectMode: true,
    transform(chunk, encoding, callback) {
      setTimeout(() => {
        this.push(JSON.stringify(chunk))
        console.log('Transformer 2',
          this._count2 = ++this._count2 || 1
        )
        callback()
      }, 1000)
    }
  })

  stream.pipe(transformer1).pipe(transformer2).pipe(res)

  stream.on('error', next)
})

export default router
