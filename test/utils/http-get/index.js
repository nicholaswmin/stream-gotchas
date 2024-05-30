// Starts passed app/server, performs http.get

// @ IMPORTANT: Close the return server when done"
/*

## Usage

```js
const { server, res} = await get(url,  { 'accept-encoding': 'gzip' }, app)

let bytes = 0

res.on('end', () => {
  bytes.should.be.within(900000, 1100000)

  server.close() // call this when done
})
```js

## Authors

@nicholaswmin
*/
import http from 'node:http'

export default (app, url, opts) => new Promise((resolve, reject) => {
  const host = 'localhost'
  const server = app.listen(0, host, () => {
    http.get(`http://${host}:${server.address().port}${url}`, {
      headers: opts,
    }, res => {
      if (res.statusCode < 200 || res.statusCode > 299) {
        server.close()

        return reject(new Error(`Received error code: ${err.statusCode}`))
      } else {
        return resolve({ res, server })
      }
    })
  })
})
