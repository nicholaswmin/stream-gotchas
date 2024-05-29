import { pipeline } from 'node:stream/promises'
import chai from 'chai'
import chaiHttp from 'chai-http'

import get from './utils/http-get/index.js'
import shared from './shared.specs.js'
import app from '../app.js'

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

  it('sends ~ 1000 KB of data', async function () {
    const { server, res } = await get(app, url, {
      'accept-encoding': 'identity'
    })

    return new Promise(resolve => {
      let bytes = 0
      res.on('data', data => bytes += Buffer.byteLength(data))
      res.on('end', () => {
        bytes.should.be.within(900000, 1100000)

        server.close()
        resolve()
      })
    })
  })

  shared.it.sendsParseableData(url)
})
