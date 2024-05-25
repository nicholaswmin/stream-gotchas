import chai from 'chai'
import chaiHttp from 'chai-http'

import app from '../../app.js'

chai.should()
chai.use(chaiHttp)

describe('GET /backpressure', function() {
  this.timeout(10000)

  it('responds with HTTP:200', async function (done) {
    const req = await chai.request(app)
      .get('/backpressure')
      .end(function() {
        this.on('data', data => {
          console.log('data' + data)
        })
      })
  })
})
