## Failure Cases

> @nicholaswmin

## No compression

Userland streams are not automatically compressed by the Express compression
middleware.

Dont send compressed responses to clients that don't specifically request
them via the `Accept-Encoding` header.

**Solution**: Compress the stream

## No backpressure handling

- memory pressure
- memory leak
- DB connection not released
- Errant queries

No point in using streams without it. It has the exact same memory profile
as just sending a non-streamed response, only with additional overhead

**Solution**: Either use `pipe` which handles backpressure automatically or
don't `res.write` unless the previous call returned `true`

## No handling of request abort

- memory leak
- DB connection not released
- Errant queries

**Solution**:

- Handle `req.on(error, fn)` event. Destroy all streams.
- Cancel pending queries
- Manually release the db connection

## No handling of datastream error

- process crash even with `try/catch`
- HTTP request pending indefinetely
- memory leak even if req. abort is handled
- DB connection not released

Requires small `statement_timeout` to reproduce (`10ms` is enough to fetch `10MB`)

**Solution**:

- Handle all `stream.on(error, fn)` events. Destroy all streams.
- Cancel pending queries
- Manually release the db connection
- Enforce request timeouts as an additional guard

Notes:

- db conn is released in this case
- query might be errant depending on the driver/database

## No handling of any stream error

- process crash even with try/catch
- memory leak
- errant queries
- DB connection not released

**Solution**:

- Handle all `stream.on(error, fn)` events. Destroy all streams.
- Cancel pending queries
- Manually release the connection
- Enforce request timeouts as an additional guard

## Slow client connections

- process crash even with try/catch
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

# Sending HTTP status while in-flight

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

# Superflous query-abort errors

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
