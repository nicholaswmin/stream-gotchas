import { setTimeout as wait } from 'node:timers/promises'
import chai from 'chai'
import chaiHttp from 'chai-http'

import app from './leaky-server.js'
import Memstat from '../index.js'
import mightAbort from '../../might-abort/index.js'

chai.should()
chai.use(chaiHttp)

describe('#memstat utility (streams)', function() {
  this.timeout(30 * 1000).slow(15 * 1000)

  before('Setup', function() {
    this.memstat = new Memstat({ watch: false, drawPlot: true })
  })

  beforeEach('start a memstat', function() {
    this.memstat.start()
  })

  describe('Request aborts mid-flight are handled', function() {
    it('does not consider it leaky', async function() {

      for (let i = 0; i <= 15; i++)
        await new Promise((resolve, reject) =>
          chai.request(app)
            .get('/watertight/user-abort')
            .buffer(false)
            .parse(mightAbort({
              probability: 0.30
            }, err => err ?
            reject(err) :
            resolve()
          )).end())

        const mem = await this.memstat.stop()

        mem.leaks.should.be.false
    })
  })
})
