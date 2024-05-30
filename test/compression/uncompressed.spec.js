import { pipeline } from 'node:stream/promises'
import chai from 'chai'
import chaiHttp from 'chai-http'

import get from '../utils/http-get/index.js'
import shared from './shared.specs.js'

chai.should()
chai.use(chaiHttp)

describe('GET /uncompressed', function() {
  beforeEach(async function() {
    const { server, db } = await import(`../../app.js?v=${Date.now()}`)

    this.url = '/uncompressed'
    this.server = server
    this.db = db
  })

  afterEach(function() {
    this.server.close()
  })

  shared.it.status200()
  shared.it.chunkedHeaders()

  it('marks response as uncompressed', async function () {
    const res = await chai.request(this.server).get(this.url)

    res.should.not.have.header('Content-Encoding')
  })

  it('sends ~ 23 MB of data', async function () {
    const { server, res } = await get(this.server, this.url, {
      'accept-encoding': 'identity'
    })

    return new Promise(resolve => {
      let bytes = 0
      res.on('data', data => bytes += Buffer.byteLength(data))
      res.on('end', () => {
        bytes.should.be.within(25000000, 30000000)

        server.close()
        resolve()
      })
    })
  })

  shared.it.sendsParseableData()
})
