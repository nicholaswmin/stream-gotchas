import { pipeline } from 'node:stream/promises'
import { PassThrough } from 'node:stream'
import chai from 'chai'
import chaiHttp from 'chai-http'
import binaryParser from 'superagent-binary-parser'

import chaiHttpRaw from './utils/chai-http-raw/index.js'
import shared from './shared.specs.js'
import app from '../app.js'

chai.should()
chai.use(chaiHttp)
chai.use(chaiHttpRaw)

describe('GET /gzipped', function() {
  const url = '/gzipped'

  it('responds with status=200', async function () {
    const res = await chai.request(app)
      .get(url)

    res.status.should.equal(200)
  })

  it('marks response as chunked', async function () {
    const res = await chai.request(app)
      .get(url)

    res.should.have.header('Transfer-Encoding' , 'chunked')
  })

  describe('client accepts compressed responses', function() {
    it('marks response as compressed', async function () {
      const res = await chai.request(app)
        .get(url)

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

      return chai.requestRaw(app).get(url)
        .then(({ res, server }) => {
          return pipeline(res, counter).then(() => {
            counter.bytes.should.be.within(55000, 65000)

            server.close()
          })
        })
    })

    shared.it.sends25KMessages()
  })

  // @TODO Not implemented
  describe.skip('when client does not accept compressed responses', function() {
    // @TODO Not implemented
    it.skip('marks the response as uncompressed', async function () {
      const res = await chai.request(app).get(url)

      res.should.not.have.header('Content-Encoding')
    })

    // inc. shared.it.sends25KMessages() // @TODO
  })
})
