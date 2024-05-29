import { pipeline } from 'node:stream/promises'
import chai from 'chai'
import chaiHttp from 'chai-http'

import shared from './shared.specs.js'
import get from './utils/http-get/index.js'
import app from '../app.js'

chai.should()
chai.use(chaiHttp)

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

    it('sends ~ 190 KB of data', async function () {
      const { server, res } = await get(app, url,  { 'accept-encoding': 'gzip' })

      return new Promise(resolve => {
        let bytes = 0
        res.on('data', data => bytes += Buffer.byteLength(data))
        res.on('end', () => {
          bytes.should.be.within(150000, 200000)

          server.close()
          resolve()
        })
      })
    })

    shared.it.sendsParseableData(url)
  })

  describe('client does not accept compressed responses', function() {
    it('marks the response as uncompressed', async function () {
      const res = await chai.request(app).get(url)
        .set('accept-encoding', 'identity')

      res.should.not.have.header('Content-Encoding')
    })

    it('sends ~ 135 MB of data', async function () {
      const { server, res } = await get(app, url, {
        'accept-encoding': 'identity'
      })

      return new Promise(resolve => {
        let bytes = 0
        res.on('data', data => bytes += Buffer.byteLength(data))
        res.on('end', () => {
          bytes.should.be.within(120000000, 150000000)

          server.close()
          resolve()
        })
      })
    })

    shared.it.sendsParseableData(url)
  })
})
