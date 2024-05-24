import express from 'express'
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

app.get('/stream/ok', async (req, res, next) => {
  const stream = db('messages').select('*').stream()

  stream.pipe(JSONStream.stringify()).pipe(res)

  stream.on('error', err => {
    console.log(err.message)

    res.status(500).send('oops!')

    stream.destroy()
  })
})

app.get('/stream/error', async (req, res, next) => {
  // intentionally malformed table name
  const stream = db('messagszes').select('*').stream()

  stream.pipe(JSONStream.stringify()).pipe(res)

  stream.on('error', err => {
    console.log(err.message)

    res.status(500).send('oops!')

    stream.destroy()
  })
})


export default app.listen(process.env.PORT || 5020, function() {
  console.log('Listening on: %s', this.address().port)
})
