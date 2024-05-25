import express from 'express'
import JSONStream from 'JSONStream'

const router = express.Router()

app.get('/stream/error', async (req, res, next) => {
  // intentionally malformed table name
  const stream = db('messagszes').select('*').stream()

  stream.pipe(JSONStream.stringify()).pipe(res)

  stream.on('error', next)
})


export default router
