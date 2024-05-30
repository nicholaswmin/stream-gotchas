## Failure Cases

The cases use [pg-query-stream][pg-query] as an example database driver -  
these cases will apply to most, if not all, popular drivers.

This won't cut it in a production environment:

```js
app.get('/messages', (req, res, next) => {
  try {
    db.select('*').from('messages').stream().pipe(res)
  } catch (err) {
    next(err)
  }
})
```

because it doesn't handle the following:

## User aborts the request mid-flight

Effects:

- Memory leaks
- DB connection not released
- Runaway queries

**Solution**:

- Handle [Request: 'error'][req-on-err] event. Destroy all streams.
- Cancel any pending queries
- Manually release the db connection

Example:

```js
app.get('/messages', async (req, res, next) => {
  try {
    const stringifier = JSONStream.stringify()
    const conn = await db.client.acquireConnection()
    const stream = db('messages').select('*').connection(conn).stream()

    req.on('error', async err => {
      if (err.message?.includes('abort')) {
        ;[req, stream, stringifier, res]
          .forEach(stream => stream.destroy())

      if (stream.readable)
        await db.raw(`SELECT pg_cancel_backend(${conn.processID});`)
          .timeout(5000, { cancel: false })
          .then(res => res.rowCount || console.warn('statement not found'))
          .then(() => db.client.releaseConnection(conn))
      }
    })

    // More error handling needed, see rest of cases

    stream.pipe(stringifier).pipe(res)
  } catch (err) {
    next(err)
  }
})
```

## Query stream errors out mid-flight

Effects:

- Process crash even with `try/catch`
- HTTP request pending indefinitely
- Memory leaks (even if req. abort is handled)
- DB connections are not released

**Solution**:

- Handle all `stream.on(error, fn)` events. Destroy all streams.
- Cancel pending queries
- Manually release the db connection
- Enforce request timeouts as an additional guard

Examples:

```js
app.get('/messages', async (req, res, next) => {
  try {
    const stringifier = JSONStream.stringify()
    const conn = await db.client.acquireConnection()
    const stream = db('messages').select('*').connection(conn).stream()

    stream.on('error', err => {
      if (err.code === '57014')
        if (!res.headersSent)
          res.status(408).send('Timed out')

      ;[req, stream, stringifier, res]
        .forEach(stream => stream.destroy())

      db.client.releaseConnection(conn)
    })

    // More error handling needed, see rest of cases

    stream.pipe(stringifier).pipe(res)
  } catch (err) {
    next(err)
  }
})
```

# Processing streams error out mid-flight

- process crash even with try/catch
- memory leak
- errant queries
- DB connection not released

**Solution**:

- Handle all `stream.on(error, fn)` events. Destroy all streams.
- Cancel pending queries
- Manually release the connection
- Enforce request timeouts as an additional guard

Example:

```js
// ... app.get('...

;[stream, stringifier, res]
  .forEach(stream => stream.on('error', err => {
    ;[req, stream, stringifier, gzip, res] // add more streams if necessary
      .filter(stream => !stream.destroyed)
      .forEach(stream => stream.destroy())

    console.error(err)
  }))

// More error handling needed, see rest of cases
```

## Slow user connections

Effects:

- memory exhaustion

Streams are memory efficient because they don't buffer the entire response.  
However they still have a buffer.

Users on a slow network will keep the connection alive and bypass a lot of
timeout-based proxies because in fact they ARE receiving bytes.

If a lot of requests come through simultaneously it's possible to exhaust
memory.

The amount of memory that a stream will consume while it's being read is
set by the `highWaterMark` of the read stream.

**Solution**:

- Enforce a request timeout or a slow-rate cutoff (but read issue below first)
- Dynamically set the `highWaterMark`; provide a test stream and test
  client reading speed before merging the actual read stream.

## Sending HTTP headers mid-flight

- Creates unnecessary errors

Streaming responses in HTTP 1.1 require the headers to be set upfront.

You might want to set a friendlier, HTTP 408 status code if the
`statement_timeout` has elapsed.

This might be possible depending on whether the DB has found results and is
already streaming them down the wire.

It's not possible to send a userland status after streaming has started.  
Express will throw an error if so because it has (correctly) already
written headers to the response as soon as the query stream returned
it's first batch.

The only possible way to set headers is if the query has not started streaming
yet (because it's still querying the DB) and not a single byte made it down the
wire.

**Solution:**

- Check if headers were already sent before doing anything of the sort
`res.sendStatus(4xx)`.
- Not much else to do if streaming has already started. Strictly speaking, it's
  a server error anyway so a 408 is not entirely appropriate.

## Superflous query-abort errors

- Creates unnecessary errors

In some cases you need to cancel pending queries for a non-server error, i.e
the user has aborted the request.

Doing so will trip the `queryStream.on('error)` handlers and the logs or
monitoring service will indicate there is an increased error rate when in
fact, this is expected behaviour.

**Solution:**

- Handle user-initiated query stream errors and redirect them to `stdout`
  instead of `stderr` with a message indicating the cancellation reason.
- Check if headers were already sent before doing anything of the
  sort `res.sendStatus(4xx)`.

## No compression

Userland streams are not automatically compressed by the Express
compression middleware.

Additionally, avoid sending compressed responses to clients that don't
specifically request them via the `Accept-Encoding`.

**Solution**: Compress the stream

Example:

```js
app.get('/messages', async (req, res, next) => {
  try {
    const stream = db('messages').select('*').stream()
    const jsonStream = stream.pipe(JSONStream.stringify())

    if (req.acceptsEncodings().includes('gzip')) {
      res.setHeader('Content-Encoding', 'gzip')

      jsonStream.pipe(zlib.createGzip()).pipe(res)
    } else {
      jsonStream.pipe(res)
    }

    // Add error handling, see above
    // Add Brotli compression handling if needed
  } catch (err) {
    next(err)
  }
})
```

## No backpressure handling

- memory pressure
- memory leak
- DB connection not released
- Runaway queries

No point in using streams without it. It has the exact same memory profile
as just sending a non-streamed response, only with additional overhead

**Solution**: Either use `pipe` which handles backpressure automatically or
don't `res.write` unless the previous call returned `true`


## Authors

[@nicholaswmin][https://github.com/nicholaswmin]
[pg-query]: https://www.npmjs.com/package/pg-query-stream
[req-on-err]: https://nodejs.org/en/learn/modules/anatomy-of-an-http-transaction#a-quick-thing-about-errors
