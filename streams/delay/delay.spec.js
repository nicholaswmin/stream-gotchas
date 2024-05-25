import chai from 'chai'
import chaiHttp from 'chai-http'
import binaryParser from 'superagent-binary-parser'

import app from '../../app.js'

chai.should()
chai.use(chaiHttp)

describe('GET /stream/delay', function() {
  this.timeout(7000).slow(6000)

  it('responds with HTTP:200', function () {
    return chai.request(app)
      .get('/delay')
      .then(function()  {
        this.on('data', console.log)
      })
  })
})
