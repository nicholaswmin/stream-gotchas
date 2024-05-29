import { setTimeout as wait } from 'node:timers/promises'
import chai from 'chai'
import chaiHttp from 'chai-http'

import app from './index.js'

process.stdin.resume()
chai.should()
chai.use(chaiHttp)

describe('Observe', function() {
  this.timeout(40000000)

  it('does something...', async function () {
    const res = await chai.request(app).get('/do-something')
    console.log('responded')

    /*
    //for (let i = 0; i <= 15; i++)
    const resx = await new Promise((resolve, reject) => chai.request(app)
      .get('/spikey/user-abort')
      .buffer(false)
      .parse(mightAbort({
        probability: 0.30
      }, err => err ?
      reject(err) :
      resolve()
      )).end())

    */
  })
})
