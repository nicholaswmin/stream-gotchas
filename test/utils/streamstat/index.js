/*
# Stream Monitor

Monitor stream lifecycle events and log a report.

**Note:** `data` & `readable` events are ignored, since they
affect stream flow behavior

## Usage

```js
import Monitor from 'streamstat' // not published yet!
import single from 'single-line-log'

// Instantiate a monitor

const monitor = new Monitor({
   // optional: ignore noisy events
  ignore: ['pause', 'drain' ]
})

// Create/Acquire streams as usual

const readable = new stream.Readable()
const passthrough = new stream.PassThrough()
const writeable = new stream.Writeable()

// Add them to the monitor asapr

monitor
  .add(readable, 'foo-stream') // give name to each
  .add(passthrough, 'bar-stream')
  .add(writeable)

// do whatever you were going to do with them, ie:

readable.pipe(passthrough).pipe(writeable)

// Log their lifecycle and current state:
// @NOTE Start process with --streamwatch

// or ...
// Report 1:  Reports each stream, grouped with its logs

let i = 0
process.argv.includes('--streamwatch') ? setInterval(() => {
  const report = monitor.reportGroups()
  single.stdout(pretty({i: ++i, report}))
}) : null

// or ...
// Report 3: Log their buffer size

let i = 0
process.argv.includes('--streamwatch') ? setInterval(() => {
  const report = monitor.reportBuffersize()
  single.stdout(pretty({i: ++i, report}))
}) : null
```
*/

import crypto from 'node:crypto'
import prettyOutput from 'prettyoutput'
import { styleText as col } from 'node:util'

export default class Monitor {
  constructor({ ignore = [] } = {}) {
    this.ignore = ignore
    this.streams = []

    this._ended = false
    this._logCounter = 0

    this._reportedProps = [
      // readable
      'readableFlowing',
      'readableAborted',

      // writeable
      'writeableNeedDrain',
      'writeableAborted',
      {
        name: 'writableLength',
        fn: bytes => Math.round(bytes) + ' bytes'
      },
      {
        name: 'readableLength',
        fn: bytes => Math.round(bytes) + ' bytes'
      },


      // all
      'aborted',
      'destroyed',
      'errored'
    ]

    this._colors = {
      // -- Events --

      // - Info
      '*': 'blue',
      'monitored': 'cyan',

      // - Success
      'finish': 'green',

      // - Warn
      'pause': 'yellow',

      // - Error
      'error': 'red',

      // -- Props --

      'readableFlowing': 'blue',

      // - Error
      'aborted': 'red',
      'writeableNeedDrain': 'red',
      'errored': 'red',

      // - Warn
      'destroyed': 'yellow',
      'writableLength': 'yellow',
      'readableLength': 'yellow'
    }
  }

  add(stream, name) {
    const self = this

    stream.mnt = {}
    stream.mnt.logs = []
    stream.mnt.name = name
    stream.log = function(event, err) {
      this.mnt.logs.push({ index: ++self._logCounter, event, err })

      if (self._ended)
        console.warn(style('orange', 'WARNING: %s emitted after report'), event)
    }

    stream.getStyledProps = function() {
      return self._reportedProps.reduce((acc, prop) => {
        return typeof prop !== 'string' && typeof this[prop.name] !== 'undefined' ?
          acc.concat({ name: prop.name, value: prop.fn(this[prop.name]) }) :
            this[prop] ? acc.concat({ name: prop, value: stream[prop] }) : acc
          }, [])
        .map(prop => {
          const color = prop.value && self._colors[prop.name] ?
            self._colors[prop.name] : self._colors['*']

          return {
            name: col(color, prop.name),
            value: col(color, prop.value.toString())
          }
        })
    }

    stream.styleLog = function(log) {
      return {
        original_index: log.index,
        original_src: this.mnt.name,
        index: col('gray', log.index.toString()),
        event: col(self._colors[log.event] || self._colors['*'], log.event),
        src: this.mnt.name,
        err: log.err ? log.err.message : ''
      }
    }

    stream.getStyledLogs = function() {
      return this.mnt.logs
        .filter(log => !self.ignore.includes(log.event))
        .map(this.styleLog.bind(this))
    }

    if (stream.readable) {
      // Ignoring `readable` & `data` handlers which affect flow.
      stream
        .on('close', function() { this.log('close' )})
        .on('end', function() { this.log('close' )})
        .on('error', function(err) { this.log('error', err) })
        .on('pause', function() { this.log('pause' )})
        .on('resume', function() { this.log('resume' )})
    }

    if (stream.writable) {
      stream
        .on('close', function() { this.log('close' )})
        .on('drain', function() { this.log('drain' )})
        .on('error', function(err) { this.log('error', err )})
        .on('finish', function() { this.log('finish' )})
        .on('pipe', function() { this.log('pipe') })
        .on('unpipe', function() { this.log('unpipe' )})
    }

    stream.log('monitored')

    this.streams.push(stream)

    return this
  }

  end() {
    this._ended = true

    return this
  }

  getCollatedReindexedLogs() {
    return this.streams
      .reduce((acc, stream) => acc.concat(stream.getStyledLogs()), [])
      .sort((a, b) => a.original_index - b.original_index)
      .map((log, i) => {
        const iLen = 3 - i.toString().length
        const pad = Array.from({ length: iLen }).fill(' ').join('')

        return { ...log, index: i + pad }
      })
  }

  report() {
    return this.getCollatedReindexedLogs()
      .map(styled => `${styled.src}: ${styled.event} ${styled.err || ''}`)
  }

  reportGroups() {
    const logs = this.getCollatedReindexedLogs()

    return this.streams.map(stream => {
      return {
        name: stream.mnt.name,
        props: stream
          .getStyledProps()
          .map(styled => `${styled.name}: ${styled.value}`),
          logs: logs
            .filter(log => log.original_src === stream.mnt.name)
            .map(styled => `${styled.index}: ${styled.event} ${styled.err || ''}`)
      }
    })
  }

  reportBuffersize() {
    return this.streams.map(stream => {
      return stream.getStyledProps()
        .filter(styled => styled.name.includes('Length'))
        .map(styled => `${stream.mnt.name} : ${styled.name}: buffer: ${styled.value}`)
    })
  }
}
