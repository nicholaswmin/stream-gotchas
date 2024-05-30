# Notes

- streams must keep flowing somewhere or else their buffer will fill up,
  and they will pause operations until drained somehow.
  The buffer size is configured by the `highWaterMark` value.

  The default buffer size is:
    - `16` objects if `objectMode: true`
    - `64 KB` of data if `objectMode: false`

  - For example, a `readable.pipe(transform)` combo will eventually pause
    because the data doesn't eventually go anywhere, unless:

    - The `readable` does not produce more data than the buffer size.
    - The `transform` does not `push/callback` more data than the buffer size.

## Database streams leak, simulated streams dont, why?

- When a request abort handler destroys all streams, this issue goes away
- The important is why this doesn't happen when the stream is this:

```js
const stream = new Readable({
  objectMode: true,
  read(size) {
    const KB = 500
    this.push({ foo: 'bar'.repeat(350 * KB) })
  }
})
```

### Reproduction of DB leak

Load '/uncompressed' in Chrome and after 1 second refresh.  
Do this 3-4 times.

```js
app.get('/uncompressed', async (req, res, next) => {
  const stringifier = JSONStream.stringify()
  const stream = db('messages').select('*').stream()

  stream.pipe(stringifier).pipe(res)

  stream.on('error', err => {
    console.log(err.message)

    res.status(500).send('Status:500')

    stream.destroy()
  })

  // @CAUTION Aborted requests will cause this to leak
  // Uncomment following to fix.
  /*
  req.on('error', err => {
    if (err?.message?.includes('aborted')) {
      ;[stream, stringifier, res].forEach(s => s.destroy())
    }
  })
  */
})
```

### Config

```js
const messageSizeKB = 500
await user.batchInsert('messages', Array(2500).fill({
  text: 'bar'.repeat(350 * messageSizeKB)
}))
// and start server with: --max-old-space-size=200
```


## See proper batch transform

https://github.com/brianc/node-postgres/issues/2945
