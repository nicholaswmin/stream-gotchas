/*
# might-abort-supertest-parser

A supertest/chai-http plugin that aborts *chunked* requests mid-flight.

Not really a parser.

Used for testing users aborting a requesting mid-flight

## Usage

```js
// Send 100 requests, each having a 30% chance of aborting at the first
// chunk being received.
//
// Each `res.on('data')` has a 30% chance of calling `request.abort()`;
// This check runs on *every chunk landing* - not on every request.
//
// Most likely all requests will abort at this threshold,
// provided they receive at least a couple chunks before completion.

import mightAbort from 'might-abort' // not published yet!

for (let i = 0; i <= 100; i++)
  await new Promise((resolve, reject) =>
    chai.request(app)
    .get('/leaky/stream')
    .buffer(false)
    .parse(mightAbort({
      timeout: 4000, // optional, default: `2000`
      probability: 0.30 // required
    }, err => err ? // cb style-only because of superagent :(
    reject(err) :
    resolve()
  )).end())
```

## Authors

 - @nicholasmin
*/

export default function ({ probability = 0.3, timeout = 2000 }, cb) {
  return function(res, callback) {
    if (res.statusCode < 200 || res.statusCode > 299)
      return cb(new Error(`Got non-2xx status code: ${res.statusCode}`))

    const timer = setTimeout(() => cb(
      new Error(`No chunk received within timeout`)
    ), timeout)

    res.on('end', () => { })
    res.on('data', function(chunk) {
      if (Math.random() < probability) {
        res.destroy()
        res.req.destroy()

        clearTimeout(timer)

        return cb(null)
      }
    })
  }
}
