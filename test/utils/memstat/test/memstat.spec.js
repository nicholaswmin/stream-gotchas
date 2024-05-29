import chai from 'chai'
import chaiHttp from 'chai-http'

import app from './leaky-server.js'
import Memstat from '../index.js'

chai.should()
chai.use(chaiHttp)

describe('#memstat utility', function() {
  this.timeout(15 * 1000).slow(10 * 1000)

  before('Setup one memstat', function() {
    this.memstat = new Memstat({ live: false, drawPlot: false })
  })

  beforeEach('start memstart before each test', function() {
    this.memstat.start()
  })

  describe('route consistently leaks memory', function() {
    it('conmsiders it leaky', async function() {
      for (let i = 0; i < 50; i++)
        await chai.request(app)
          .get('/leaky/always')
          .then(res => res.should.have.status(204))

      const mem = await this.memstat.stop()

      mem.leaks.should.be.true
    })
  })

  describe('route leaks memory for 50% of requests', function() {
    it('conmsiders it leaky', async function() {
      for (let i = 0; i < 50; i++)
        await chai.request(app).get('/leaky/sometimes')
          .then(res => res.should.have.status(204))

      const mem = await this.memstat.stop()

      mem.leaks.should.equal(true)
    })
  })

  describe('route uses a lot of memory but doesnt leak', function() {
    it('does not consider it leaky', async function() {
      for (let i = 0; i < 50; i++)
        await chai.request(app).get('/spikey')
          .then(res => res.should.have.status(200))

      const mem = await this.memstat.stop()

      mem.leaks.should.equal(false)
    })
  })

  describe('route neither leaks nor spikes', function() {
    it('does not consider it leaky', async function() {
      for (let i = 0; i < 50; i++)
        await chai.request(app).get('/watertight')
        . then(res => res.should.have.status(200))

      const mem = await this.memstat.stop()

      mem.leaks.should.equal(false)
    })
  })
})
