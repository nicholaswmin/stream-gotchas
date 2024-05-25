import chai from 'chai'
import chaiHttp from 'chai-http'
import binaryParser from 'superagent-binary-parser'

import app from '../app.js'

chai.should()
chai.use(chaiHttp)

export default {
  it: {
    addsChunkedHeaders: url => {
      it('marks response as chunked', async function () {
        const res = await chai.request(app)
          .get(url)

        res.should.have.header('Transfer-Encoding' , 'chunked')
      })
    },

    sends25KMessages: url => {
      it('sends data that parses to 25000 messages', async function () {
        const messages = await chai.request(app)
          .get(url)
          .parse(binaryParser).buffer()
          .then(res => JSON.parse((new TextDecoder('UTF-8'))
          .decode(res.body)))

        messages.should.be.an('Array').with.length(25000)
      })
    }
  }
}
