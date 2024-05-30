import { setTimeout as wait } from 'node:timers/promises'
import { execa } from 'execa'
import chai from 'chai'
import Memstat from '../utils/memstat/index.js'
import request from '../utils/request/index.js'

chai.should()

describe('compression stream throws an error', function() {
  this.timeout(30 * 1000).slow(25 * 1000)

  beforeEach(async function() {
    const { server, db } = await import(`../../app.js?v=${Date.now()}`)

    this.server = server
    this.db = db
  })

  afterEach(function() {
    this.server.close()
  })

  describe('when we send one request', function() {
    it('hangs the request', async function () {
      const res = await request('localhost:5020/stream-error')
        .normal({ resolveAfterMs: 5000 })

      res.should.have.property('resolvedAfterMs')
      res.resolvedAfterMs.should.be.true
    })

    it('does not release database connections', async function () {
      await request('localhost:5020/stream-error')
        .normal({ resolveAfterMs: 5000 })

      this.db.client.pool.numUsed().should.be.above(0)
    })

    it('has pending queries', async function () {
      const rand = Math.random()

      await request(`localhost:5020/stream-error?comment=${rand}`)
        .normal({ resolveAfterMs: 1000 })

      return this.db.raw(`SELECT * FROM pg_stat_activity;`)
        .then(res => res.rows
          .filter(row => row.query.includes(`/* ${rand} */`)))
        .then(res => res.should.have.length.above(0))
    })
  })

  describe('when we send a lot of requests', function() {
    it.skip('does not release database connections', async function () {
      // @FIXME very hard to test this unless we simulate an infinite stream
      // or bomb the database with a freak amount of data.
      // PG returns results too quickly for this to work.
      // Using a synthetic stream will taint the realism of the previous
      // tests.

      await request('localhost:5020/stream-error')
        .thenAbort({ times: 10 })

      await wait(500)

      this.db.client.pool.numUsed().should.be.above(8)
    })

    it('exhibits memory spikes that persist after request', async function () {
      this.memstat = new Memstat({
        drawPlot: !!process.env['npm_config_plot_gc']
      })

      this.memstat.start()

      await new Promise((resolve, reject) => {
        for (let i = 0; i < 10; i++) {
          request(`localhost:5020/stream-error`)
            .normal()
            .then(res => reject(new Error('should be pending indefinetely')))
            .catch(err => reject(new Error('should be pending indefinetely')))
        }

        setTimeout(() => resolve(), 2000)
      })

      const mem = await this.memstat.stop()

      mem.leaks.should.be.true
    })

    it.skip('has queries still pending', async function () {
      // @FIXME very hard to test this unless we simulate an infinite stream
      // or bomb the database with a freak amount of data.
      // PG returns results too quickly for this to work.
      // Using a synthetic stream will taint the realism of the previous
      // tests.
      const rand = Math.random()

      await new Promise((resolve, reject) => {
        for (let i = 0; i < 10; i++) {
          request(`localhost:5020/stream-error`)
            .normal()
            .then(res => reject(new Error('should be pending indefinetely')))
            .catch(err => reject(new Error('should be pending indefinetely')))
        }

        setTimeout(() => resolve(), 2000)
      })

      return this.db.raw(`SELECT * FROM pg_stat_activity;`)
        .then(res => res.rows
          .filter(row => row.query.includes(`/* ${rand} */`)))
          .then(res => res.should.have.length.above(0))
    })
  })
})
