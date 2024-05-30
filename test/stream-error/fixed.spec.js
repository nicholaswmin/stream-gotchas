import { setTimeout as wait } from 'node:timers/promises'
import { execa } from 'execa'
import chai from 'chai'
import Memstat from '../utils/memstat/index.js'
import request from '../utils/request/index.js'

chai.should()

describe('compression stream throws an error (fixed)', function() {
  this.timeout(20 * 1000).slow(15 * 1000)

  beforeEach(async function() {
    const { server, db } = await import(`../../app.js?v=${Date.now()}`)

    this.server = server
    this.db = db
  })

  afterEach(function() {
    this.server.close()
  })

  describe('when we send one request', function() {
    it('responds promptly with an error', async function () {
      try {
        const { stdout } = await request('localhost:5020/stream-error/fixed')
          .normal()

      } catch (err) {
        err.message.should.include('Response ended prematurely')
      }
    })
  })

  describe('when we send a lot of requests', function() {
    it('releases database connections back to the pool', async function () {
      try {
        for (let i = 0; i <= 10; i++)
          await request('localhost:5020/stream-error/fixed')
           .normal()

          await wait(500)
      } catch (err) {
        err.message.should.include('Response ended prematurely')
        this.db.client.pool.numUsed().should.be.below(3)
      }
    })

    it('exhibits memory spikes that return to baseline', async function () {
      this.memstat = new Memstat({
        drawPlot: !!process.env['npm_config_plot_gc']
      })

      this.memstat.start()

      try {
        for (let i = 0; i <= 10; i++)
          await request('localhost:5020/stream-error/fixed')
           .normal()

          await wait(500)
      } catch (err) {
        err.message.should.include('Response ended prematurely')
        this.db.client.pool.numUsed().should.be.below(3)
      }

      const mem = await this.memstat.stop()

      mem.leaks.should.be.false
    })

    it('cancels all the queries it issued', async function () {
      const rand = Math.random()

      try {
        for (let i = 0; i <= 10; i++)
          await request('localhost:5020/stream-error/fixed')
           .normal()

          await wait(500)
      } catch (err) {
        err.message.should.include('Response ended prematurely')

        return this.db.raw(`SELECT * FROM pg_stat_activity;`)
          .then(res => res.rows
            .filter(row => row.query.includes(`/* ${rand} */`)))
          .then(res => res.should.have.length(0))
      }
    })
  })
})
