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

  it('marks the response as chunked', async function () {
    const res = await chai.request(app)
      .get('/gzipped')

    res.should.have.header('Transfer-Encoding' , 'chunked')
  })

  describe('when client accepts compressed responses', function() {
    it('marks the response as compressed', async function () {
      const res = await chai.request(app)
        .get('/gzipped')

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
    })
  })

  // @TODO Not implemented
  describe.skip('when client does not accept compressed responses', function() {
    it.skip('marks the respnse as uncompressed', async function () {
      const res = await chai.request(app)
        .get('/gzipped')

      res.should.not.have.header('Content-Encoding')
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
