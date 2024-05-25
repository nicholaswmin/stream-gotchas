import chai from 'chai'
import chaiHttp from 'chai-http'
import binaryParser from 'superagent-binary-parser'

import app from '../../app.js'

chai.should()
chai.use(chaiHttp)

describe('GET /gzip', function() {
  it('responds with HTTP:200', async function () {
    const res = await chai.request(app)
      .get('/ok')

    res.should.have.status(200)
  })

  it('decompresses to an array', async function() {
    const req = chai.request(app).get('/ok')
      .parse(binaryParser).buffer()
    console.log(req)
  })
})
