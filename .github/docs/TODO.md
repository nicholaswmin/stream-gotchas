aX  W# Todo

- [ ] Monitor: Also print current stream state
  - err props etc
  - size of data still in buffer
- [ ] Add Memory leak detection
- [ ] Split each of the cases in it's own folder:
    - Demonstrate:
    - [ ] The problematic code (with tests verifying its errors)
    - [ ] The solution (with tests verifying its correctness)
    - Each case must measure the following:
      - [ ] Query errancy
      - [ ] Memory leak
      - [ ] Memory pressure
      - [ ] DB pool utilisation

## Additional Test Cases

### Client Abort

Without handling abort error on `req` - and destroying all the
streams, memory usage goes insane. It doesn't leak though.

Note: This is just one aspect of handling an error that happens
in the "wild" very frequently

Note: This involves an in-memory store, maybe keep it just DB/HTTP related
for now?

**Update:** When using a DB instead of in memory readable it leaks like mad.

```js
app.get('/', (req, res) => {
  const data = Array.from({ length: 500 },
      (_, i) => ({ foo: 'bar'.repeat(350000) }))

  const readable = new Readable.from(data)

  const passthrough = new PassThrough({
    objectMode: true,
    transform(obj, _, cb) {
      setTimeout(() =>
        cb(null, JSON.stringify(obj)) // ~100 KB
      , 1000) // delay the delivery a little bit
    }
  })

  readable.pipe(passthrough).pipe(res)

  req.on('error', err => {
    if (err.message.includes('aborted'))
      [readable, passthrough, res]
        .forEach(stream => stream.destroy())

    console.error(err)
  })
})

// Without this, memory usage goes insane (but doesn't leak)
req.on('error', err => {
  if (err.message.includes('aborted'))
    [readable, passthrough, res]
      .forEach(stream => stream.destroy())

  console.error(err)
})
```

and it's test:

```js
// import mightAbort from '../might-abort/index.js'

describe('User keeps refreshing before the request completes', function() {
  before('Setup one memstat', function() {
    this.memstat = new Memstat({ watch: false, drawPlot: false })
  })

  it ('handles each abort w/o creating memory spikes', async function() {
    this.memstat.start()

    for (let i = 0; i <= 100; i++)
      await new Promise((resolve, reject) =>
        chai.request(app)
          .get('/leaky/stream')
          .buffer(false)
          .parse(
            mightAbort({
              probability: 0.30},
              err => err ?
                reject(err) :
                resolve()
            )
          ).end())

      const mem = await this.memstat.stop()

      mem.leaks.should.be.false
  })
})
```
