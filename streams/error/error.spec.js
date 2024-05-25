import chai from 'chai'
import chaiHttp from 'chai-http'
import app from '../../app.js'

chai.should()
chai.use(chaiHttp)

describe.skip('GET /stream/error', function() {
  it('responds with HTTP:500 and oops', async function () {
    const res = await chai.request(app)
      .get('/stream/error')

    res.status.should.equal(500)
    res.text.should.equal('oops!')
  })
})
