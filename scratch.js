// Leaky Stream



app.get('/leaky/stream', (req , res) => {
  /*
  const monitor = new Monitor({
    title: 'Leaky Stream',
    ignore: ['pause', 'drain' ]
  })

  const stringifier = JSONStream.stringify()
  const gzip = zlib.createGzip()
  const readable = new Readable.from(
    Array.from({ length: 10000 }, (_, i) => {
      return { name: 'foobar-' + i, value: Math.random()
        .toString().repeat(5000) }
    })
  )
  const passthrough = new PassThrough({
    objectMode: true,
    construct(callback) {
      this.bytes = 0
      this.delay = 10
      callback()
    },
    transform(chunk, encoding, callback) {
      setTimeout(() => {
        callback(null, chunk)
        this.bytes += Buffer.byteLength(chunk)
      }, this.delay)
    },
    final(callback) {
      callback()
    }
  })  */

  const data = Array.from({ length: 500 },
      (_, i) => ({ foo: 'bar'.repeat(350000) }))

  const readable = new Readable.from(data)

  const passthrough = new PassThrough({
    objectMode: true,
    transform(obj, _, cb) {
      setTimeout(() =>
        cb(null, JSON.stringify(obj)) // ~100 KB
      , 1000)
    }
  })

  readable.pipe(passthrough).pipe(res)

  req.on('error', err => {
    if (err.message.includes('aborted'))
      [readable, passthrough, res]
        .forEach(stream => stream.destroy())

    console.error(err)
  })
  /*
  req.on('errosr', err => {
    if (err?.message.includes('aborted'))
      ;[readable, stringifier, passthrough, gzip, res]
        .forEach(stream => stream.destroy())
  })

  //readable.pipe(JSONStream.stringify()).pipe(passthrough).pipe(res)
  const pipe = readable.pipe(stringifier).pipe(passthrough).pipe(gzip).pipe(res)
  */
  /*
  monitor
    .add(readable)
    .add(stringifier)
    .add(passthrough)
    .add(gzip)
    .add(res)
    .add(pipe)
    */
})
