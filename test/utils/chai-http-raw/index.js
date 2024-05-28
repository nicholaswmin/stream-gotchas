/*
# chai-http-raw

Chai.js plugin that returns raw HTTP responses.

Used for getting access to raw response,
before it's potentially decompressed by superagent/chai-http,
to test if response is really sent in a compressed format.

## Usage:

```js
import chaiHttpRaw from 'chai-http-raw'

chai.use(chaiHttpRaw)

chai.requestRaw(app)
  .get('/user?gzip=true')
  .start()
  .then(({ res, server }) =>
    console.log(res) raw res
    server.close() shutdown server when done!
  })
```

## Authors

 - @nicholasmin
*/

import http from 'node:http'

export default (chai, _) => {
  chai.requestRaw = app => ({
    get: (path, opts) => new Promise((resolve, reject) => {
      const protocol = 'http://'
      const host = 'localhost'
      const server = app.listen(0, host, () => {

      const url = `${protocol}${host}:${server.address().port}${path}`

      return http.get(url, opts, res => {
          const err = res.statusCode < 200 || res.statusCode > 299 ?
            new Error('Request Raw Failed.' + `Status: ${res.statusCode}`) :
            null

          if (err) {
            // Consume data to free up memory
            res.resume()
            console.error(error.message)

            return reject(error.message)
          }

          return resolve({ res, server })
        })
        .on('error', err => server.close(() => reject(err)))
      })
    })
  })
}
