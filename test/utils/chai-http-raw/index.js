/*
# chai-http-raw

Chai.js plugin that returns raw HTTP responses.
  - Used for getting access to raw response,
    before it's potentially decompressed by superagent/chai-http,
    to test if response is really sent in a compressed format.

## Usage:

```js
import chaiHttpRaw from './index.js'

chai.use(chaiHttpRaw)

chai.requestRaw(app)
  .get('/user?gzip=true')
  .start()
  .then(({ res, server }) =>
    console.log(res) raw res
    server.close() shutdown server when done!
  })
```
*/

import http from 'node:http'

export default (chai, _) => {
  chai.requestRaw = app => ({
    get: path => new Promise((resolve, reject) => {
      const protocol = 'http://'
      const host = 'localhost'
      const server = app.listen(0, host, () => {
        http.get(`${protocol}${host}:${server.address().port}${path}`,
          res => resolve({ res, server })
        )
        .on('error', err => server.close(() => reject(err)))
      })
    })
  })
}
