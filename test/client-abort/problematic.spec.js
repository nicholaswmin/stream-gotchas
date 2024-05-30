import { setTimeout as wait } from 'node:timers/promises'
import { execa } from 'execa'
import chai from 'chai'
import Memstat from '../utils/memstat/index.js'
import request from '../utils/request/index.js'

chai.should()

describe('client aborts request', function() {
  this.timeout(15 * 1000).slow(10 * 1000)

  beforeEach(async function() {
    const { server, db } = await import(`../../app.js?v=${Date.now()}`)

    this.server = server
    this.db = db
  })

  afterEach(function() {
    this.server.close()
  })

  describe('when we send one request', function() {
    it('sends an HTTP 200 and a 20 MB response', async function () {
      const { stdout } = await request('localhost:5020/client-abort')
        .normal()

      stdout.length.should.be.within(25000000, 30000000)
      stdout.includes('200 OK')
    })
  })

  describe('when we send a lot of requests', function() {

    describe('without handling request error aborted event', function() {
      it('does not release database connections', async function () {
        await request('localhost:5020/client-abort')
          .thenAbort({ times: 10 })

        await wait(500)

        this.db.client.pool.numUsed().should.be.above(8)
      })

      it('exhibits memory spikes that persist after request', async function () {
        this.memstat = new Memstat({
          drawPlot: !!process.env['npm_config_plot_gc']
        })

        this.memstat.start()

        await request('localhost:5020/client-abort')
          .thenAbort({ times: 10 })

        const mem = await this.memstat.stop()

        mem.leaks.should.be.true
      })

      it('has queries still pending', async function () {
        const rand = Math.random()

        await request(`localhost:5020/client-abort?comment=${rand}`)
          .thenAbort({ times: 10, afterMs: 500 })

        return this.db.raw(`SELECT * FROM pg_stat_activity;`)
          .then(res => res.rows
            .filter(row => row.query.includes(`/* ${rand} */`)))
            .then(res => res.should.have.length.above(0))
      })
    })
  })
})
