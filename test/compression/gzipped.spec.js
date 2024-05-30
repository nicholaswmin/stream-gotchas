import chai from 'chai'
import chaiHttp from 'chai-http'

import shared from './shared.specs.js'
import get from '../utils/http-get/index.js'

chai.should()
chai.use(chaiHttp)

describe('GET /gzipped', function() {
  beforeEach(async function() {
    const { server, db } = await import(`../../app.js?v=${Date.now()}`)

    this.url = '/compressed'
    this.server = server
    this.db = db
  })

  afterEach(function() {
    this.server.close()
  })

  shared.it.status200()
  shared.it.chunkedHeaders()


  describe('client accepts compressed responses', function() {
    it('marks response as compressed', async function () {
      const res = await chai.request(this.server).get(this.url)

      res.should.have.header('Content-Encoding', 'gzip')
    })

    it('sends ~ 37 KB of data', async function () {
      const { server, res } = await get(this.server, this.url,  {
        'accept-encoding': 'gzip'
      })

      return new Promise(resolve => {
        let bytes = 0
        res.on('data', data => bytes += Buffer.byteLength(data))
        res.on('end', () => {
          bytes.should.be.within(35000, 40000)

          server.close()
          resolve()
        })
      })
    })

    shared.it.sendsParseableData()
  })

  describe('client does not accept compressed responses', function() {
    it('marks the response as uncompressed', async function () {
      const res = await chai.request(this.server).get(this.url)
        .set('accept-encoding', 'identity')

      res.should.not.have.header('Content-Encoding')
    })

    it('sends ~ 135 MB of data', async function () {
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
})
