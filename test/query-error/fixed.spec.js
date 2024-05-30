import { setTimeout as wait } from 'node:timers/promises'
import { execa } from 'execa'
import chai from 'chai'
import Memstat from '../utils/memstat/index.js'
import request from '../utils/request/index.js'

chai.should()

describe('database throws a query error (fixed)', function() {
  this.timeout(20 * 1000).slow(15 * 1000)

  beforeEach(async function() {
    const { server, db } = await import(`../../app.js?v=${Date.now()}`)

    this.server = server
    this.db = db

    global.statement_timeout = 30
  })

  afterEach(function() {
    this.server.close()

    global.statement_timeout = null
  })

  describe('when we send one request', function() {
    it('responds promptly with an error', async function () {
      const { stdout } = await request('localhost:5020/query-error/fixed')
        .normal()


      stdout.should.equal('Timed out')
    })

    it('releases database connections', async function () {
      await request('localhost:5020/query-error/fixed')
        .normal({ resolveAfterMs: 5000 })

      await wait(500)

      this.db.client.pool.numUsed().should.equal(0)
    })

    it('does not have pending queries', async function () {
      const rand = Math.random()

      for (let i = 0; i <= 10; i++)
        await request(`localhost:5020/query-error/fixed?comment=${rand}`)
         .normal()

        await wait(500)

      return this.db.raw(`SELECT * FROM pg_stat_activity;`)
        .then(res => res.rows
          .filter(row => row.query.includes(`/* ${rand} */`)))
        .then(res => res.should.have.length(0))
    })
  })

  describe('when we send a lot of requests', () => {
    it('exhibits memory spikes that return to baseline', async function () {
      this.memstat = new Memstat({
        drawPlot: !!process.env['npm_config_plot_gc']
      })

      this.memstat.start()

      for (let i = 0; i <= 10; i++)
        await request('localhost:5020/query-error/fixed')
         .normal()

        await wait(500)

      const mem = await this.memstat.stop()

      mem.leaks.should.be.false
    })
  })
})
