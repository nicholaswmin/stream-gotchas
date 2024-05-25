import { pipeline } from 'node:stream/promises'
import { PassThrough } from 'node:stream'
import chai from 'chai'
import chaiHttp from 'chai-http'
import binaryParser from 'superagent-binary-parser'

import chaiHttpRaw from './utils/chai-http-raw/index.js'
import app from '../app.js'

chai.should()
chai.use(chaiHttp)
chai.use(chaiHttpRaw)

describe('GET /gzipped', function() {
  it('responds with status=200', async function () {
    const res = await chai.request(app)
      .get('/gzipped')

    res.status.should.equal(200)
  })

  it('sets Transfer-Encoding and Content-Encoding headers', async function () {
    const res = await chai.request(app)
      .get('/gzipped')

    res.should.have.header('Transfer-Encoding' , 'chunked')
    res.should.have.header('Content-Encoding', 'gzip')
  })

  it('sends ~ 60 KB of data', function () {
    const counter = new PassThrough({
      construct(callback) {
        callback()
        this.bytes = 0
      },
      transform(chunk, encoding, callback) {
        callback()
        this.bytes += chunk.length
      },
      final(callback) {
        callback()
      }
    })

    return chai.requestRaw(app)
      .get('/gzipped')
      .then(({ res, server }) => {
        return pipeline(res, counter).then(() => {
          counter.bytes.should.be.within(50000, 70000)

          server.close()
        })
      })
  })

  it('sends data that parses to 25000 messages', async function () {
    const messages = await chai.request(app)
      .get('/uncompressed')
      .parse(binaryParser).buffer()
      .then(res => JSON.parse((new TextDecoder('UTF-8'))
      .decode(res.body)))

    messages.should.be.an('Array').with.length(25000)
  })
})
