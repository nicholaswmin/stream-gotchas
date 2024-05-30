import chai from 'chai'
import chaiHttp from 'chai-http'
import binaryParser from 'superagent-binary-parser'

chai.should()
chai.use(chaiHttp)

export default {
  it: {
    status200: () => {
      it('responds with status=200', async function () {
        const res = await chai.request(this.server).get(this.url)

        res.status.should.equal(200)
      })
    },

    chunkedHeaders: () => {
      it('marks response as chunked', async function () {
        const res = await chai.request(this.server)
          .get(this.url)

        res.should.have.header('Transfer-Encoding' , 'chunked')
      })
    },

    sendsParseableData: () => {
      it('sends data that parses to 2500 messages', async function () {
        const messages = await chai.request(this.server)
          .get(this.url)
          .parse(binaryParser).buffer()
          .then(res => JSON.parse((new TextDecoder('UTF-8'))
          .decode(res.body)))

        messages.should.be.an('Array').with.length(500)
      })
    }
  }
}
