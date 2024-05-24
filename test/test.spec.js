import chai from 'chai'
import chaiHttp from 'chai-http'
import binaryParser from 'superagent-binary-parser'

import app from '../app.js'

chai.should()
chai.use(chaiHttp)

describe('GET /stream/ok', function() {

  it('responds with HTTP:200', async function () {
    const res = await chai.request(app)
      .get('/stream/ok')

    res.should.be.ok
    res.status.should.equal(200)
  })

  it('streams 100 messages in chunks', async function () {
    const messages = await chai.request(app)
      .get('/stream/ok')
      .parse(binaryParser).buffer()
      .then(res => JSON.parse((new TextDecoder('UTF-8'))
      .decode(res.body)))

    messages.should.be.ok
    messages.should.be.an('Array')
      .with.length(100)
  })
})

describe('GET /stream/error', function() {
  it('responds with HTTP:500 and oops', async function () {
    const res = await chai.request(app)
      .get('/stream/error')

    res.status.should.equal(500)
    res.text.should.equal('oops!')
  })
})
