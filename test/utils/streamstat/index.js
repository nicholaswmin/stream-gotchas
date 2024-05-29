/*
# Stream Monitor

Monitor stream lifecycle events and log a report.

**Note:** `data` & `readable` events are ignored, since they
affect stream flow behavior

## Usage

```js
import Monitor from 'streamstat' // not published yet!

// Instantiate a monitor

const monitor = new Monitor({
  title: 'Compresion Endpoint Test',
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

// Report 1: Reports each stream, grouped with its logs

setTimeout(() => monitor.reportGroups({
  filter: ['drain', 'resume', 'pause'] // optional: exclude events
}), 4000)

// or ..
// Report 2: All logs from all streams

setTimeout(() => monitor.report({
  filter: ['drain', 'resume', 'pause'] // optional: exclude events
}), 4000)
```
*/

import crypto from 'node:crypto'
import { styleText as col } from 'node:util'

export default class Monitor {
  constructor({ title = 'Report', ignore = [] } = {}) {
    this.title = title
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

      // - Error
      'readableFlowing': 'blue',
      'writeableNeedDrain': 'red',

      // - Warn
      'readableAborted': 'yellow',
      'writeableAborted': 'yellow',
      'destroyed': 'yellow',
      'aborted': 'yellow'
    }

    console.info('\n', 'Monitor started...')
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
        return this[prop] ?
            acc.concat({ name: prop, value: stream[prop] }) :
            acc
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
    this
      ._printTitle('Report: ' + this.title)
      ._print('------------')

    this.getCollatedReindexedLogs()
      .forEach(styled => {
        console.log(styled.index, styled.src, styled.event, styled.err)
      })
  }

  reportGroups() {
    this._printTitle('Report: ' + this.title)

    const logs = this.getCollatedReindexedLogs()

    this.streams.forEach(stream => {
      this._printSubtitle(`Stream: ${stream.mnt.name}`)
      ._print('-------')

      stream
        .getStyledProps()
        .forEach(styled => {
          console.log(styled.name, ':', styled.value)
        })

      this._print('--')

      logs
        .filter(log => log.original_src === stream.mnt.name)
        .forEach(styled => {
          console.log(styled.index, styled.event, styled.err)
        })
    })
  }

  _printTitle(t) {
    console.log('\n')
    console.log(col(['bold', 'magenta'], `${t}`))

    return this
  }

  _printSubtitle(t) {
    console.log('\n')
    console.log(col(['magenta'], `${t}`))

    return this
  }

  _print(t) {
    console.log(t)
  }
}
