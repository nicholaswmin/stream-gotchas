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

describe('GET /uncompressed', function() {
  const url = '/uncompressed'

  shared.it.status200(url)
  shared.it.chunkedHeaders(url)

  it('marks response as uncompressed', async function () {
    const res = await chai.request(app).get(url)

    res.should.not.have.header('Content-Encoding')
  })

  it('sends ~ 1000 KB of data', function () {
    const counter = byteCounter()

    return chai.requestRaw(app).get(url)
      .then(({ res, server }) => {
        return pipeline(res, counter).then(() => {
          counter.bytes.should.be.within(900000, 1100000)

          server.close()
        })
      })
  })

  shared.it.sendsParseableData(url)
})
