import { pipeline } from 'node:stream/promises'
import { PassThrough } from 'node:stream'
import chai from 'chai'
import chaiHttp from 'chai-http'
import binaryParser from 'superagent-binary-parser'

import chaiHttpRaw from './chai-http-raw/index.js'
import app from '../app.js'

chai.should()
chai.use(chaiHttp)

describe('GET /uncompressed', function() {
  const url = '/uncompressed'

  it('responds with status=200', async function () {
    const res = await chai.request(app).get(url)

    res.status.should.equal(200)
  })

  describe('Has correct headers', () => {
    it('has Transfer-Encoding : chunked', async function () {
      const res = await chai.request(app).get(url)

      res.should.have.header('Transfer-Encoding' , 'chunked')
    })

    it('does not have compression headers', async function () {
      const res = await chai.request(app).get(url)

      res.headers.should.not.include.property('Content-Encoding')
      res.headers.should.not.include.property('content-encoding')
    })
  })

  it('sends ~ 1000 KB of data', function () {
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

    return chai.requestRaw(app).get(url)
      .then(({ res, server }) => {
        return pipeline(res, counter).then(() => {
          counter.bytes.should.be.within(900000, 1100000)

          server.close()
        })
      })
  })

  it('sends data that parses to 25000 messages', async function () {
    const messages = await chai.request(app)
      .get(url)
      .parse(binaryParser).buffer()
      .then(res => JSON.parse((new TextDecoder('UTF-8'))
      .decode(res.body)))

    messages.should.be.an('Array').with.length(25000)
  })
})
