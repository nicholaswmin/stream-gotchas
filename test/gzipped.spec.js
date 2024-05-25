import { pipeline } from 'node:stream/promises'
import chai from 'chai'
import chaiHttp from 'chai-http'
import binaryParser from 'superagent-binary-parser'

import chaiHttpRaw from './utils/chai-http-raw/index.js'
import byteCounter from './utils/byte-counter/index.js'
import app from '../app.js'

import shared from './shared.specs.js'

chai.should()
chai.use(chaiHttp)
chai.use(chaiHttpRaw)

describe('GET /gzipped', function() {
  const url = '/gzipped'

  shared.it.status200(url)
  shared.it.chunkedHeaders(url)

  describe('client accepts compressed responses', function() {
    it('marks response as compressed', async function () {
      const res = await chai.request(app)
        .get(url)

      res.should.have.header('Content-Encoding', 'gzip')
    })

    it('sends ~ 60 KB of data', function () {
      const counter = byteCounter()

      return chai.requestRaw(app).get(url)
        .then(({ res, server }) => {
          return pipeline(res, counter).then(() => {
            counter.bytes.should.be.within(55000, 65000)

            server.close()
          })
        })
    })

    shared.it.sendsParseableData(url)
  })

  // @TODO Not implemented
  describe.skip('client does not accept compressed responses', function() {
    // @TODO Not implemented
    it.skip('marks the response as uncompressed', async function () {
      const res = await chai.request(app).get(url)

      res.should.not.have.header('Content-Encoding')
    })

    // inc. shared.it.sendsParseableData(url) // @TODO
  })
})
