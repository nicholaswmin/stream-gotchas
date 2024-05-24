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
      .filter(route => route
        .path.includes('stream'))
      .map(route => ({
        ...route,
        path: route.path.substring(1, route.path.length)
      }))
  })
})

app.get('/stream/ok', async (req, res, next) => {
  const stream = db('messages').select('*').stream()

  stream.pipe(JSONStream.stringify()).pipe(res)

  stream.on('error', err => {
    console.log(err.message)

    res.status(500).send('Status:500')

    stream.destroy()
  })
})

app.get('/stream/error', async (req, res, next) => {
  // intentionally malformed table name
  const stream = db('messagszes').select('*').stream()

  stream.pipe(JSONStream.stringify()).pipe(res)

  stream.on('error', err => {
    console.log(err.message)

    res.status(500).send('Status:500')

    stream.destroy()
  })
})

export default app.listen(process.env.PORT || 5020, function() {
  console.log('Listening on: %s', this.address().port)
})
