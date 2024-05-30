import chai from 'chai'
import { execa } from 'execa'

import Memstat from '../utils/memstat/index.js'
import request from '../utils/request/index.js'
import { server, db } from '../../app.js'

chai.should()

describe('client aborts request', function() {
  this.timeout(15 * 1000).slow(10 * 1000)

  describe('when we send one request', function() {
    it('sends an HTTP 200 and a 20 MB response', async function () {
      const { stdout } = await request('localhost:5020/client-abort')
        .normal()

      stdout.length.should.be.within(25000000, 30000000)
      stdout.includes('200 OK')
    })
  })

  describe('when we send a lot of requests', function() {
    it('exhibits memory spikes that return to baseline', async function () {
      this.memstat = new Memstat({
        drawPlot: !!process.env['npm_config_plot_gc']
      })

      this.memstat.start()

      await request('localhost:5020/client-abort/fixed')
        .thenAbort({ times: 5 })

      const mem = await this.memstat.stop()

      mem.leaks.should.be.false
    })

    it('releases database connections back to the pool', async function () {
      await request('localhost:5020/client-abort/fixed')
        .thenAbort({ times: 5 })

      db.client.pool.numUsed().should.be.below(3)
    })

    it('cancels all the queries it issued', async function () {
      await request('localhost:5020/client-abort/fixed?comment=query_leak')
        .thenAbort({ times: 5, afterMs: 500 })

      return db.raw(`SELECT * FROM pg_stat_activity WHERE backend_type = 'client backend';`)
        .then(res => res.rows
          .filter(row => row.query.includes('/* query_leak */')))
        .then(res => res.should.have.length(0))
    })
  })
})
