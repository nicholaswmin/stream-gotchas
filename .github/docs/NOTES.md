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
