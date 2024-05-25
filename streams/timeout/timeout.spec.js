import chai from 'chai'
import chaiHttp from 'chai-http'

import app from './index.js'

chai.should()
chai.use(chaiHttp)

describe('GET /stream/timeout', function() {
  it('responds with HTTP:400 and oops', async function () {
    const res = await chai
      .request(app)
      .get('/stream/timeout')

    res.should.have.status(500)
  })
})
