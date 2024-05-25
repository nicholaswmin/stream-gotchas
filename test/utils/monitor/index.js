/*
# Stream Monitor

Monitor stream lifecycle events and log a report.

**Note:** `data` & `readable` events are ignored, since they
affect stream flow behavior

## Usage

```js
import Monitor from './index.js' // keep it terse

// Instantiate a monitor

const monitor = new Monitor({
  name: 'Compresion', // name the report
  exclude: ['pause', 'drain' ] // optional: ignore these
})

// Create/Acquire streams as usual

const readable = new stream.Readable()
const passthrough = new stream.PassThrough()
const writeable = new stream.Writeable()

// Add them to the monitor asap
//  - optionally give them names for easy id later

monitor
  .add(readable, 'foo-stream')
  .add(passthrough, 'bar-stream')
  .add(writeable)

// do whatever you were going to do with them, ie:

readable.pipe(passthrough).pipe(writeable)

// Log their lifecycle and current state:

// Report 1: All logs collated

setTimeout(() => monitor.reportGroups({
  filter: ['drain', 'resume', 'pause'] // optional: exclude events
}), 4000)

// or ..
// Report 2: Group logs per stream

setTimeout(() => monitor.report({
  filter: ['drain', 'resume', 'pause'] // optional: exclude events
}), 4000)
```
*/

import crypto from 'node:crypto'
import { styleText as col } from 'node:util'

export default class Monitor {
  constructor({name = 'Report', exclude = [] } = {}) {
    this.name = name
    this.exclude = exclude

    this.streams = []
    this.logs = []

    this._ended = false
    this._logCounter = 0
    this._mappings = {
      // -- Events --

      // - Info
      '*': 'blue',

      // - Success
      'finish': 'green',

      // - Warn
      'pause': 'yellow',

      // - Error
      'error': 'red',

      // -- Props --

      // - Error
      'readableFlowing': 'red',
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
    const id = crypto.randomUUID()

    if (stream._readableState) {
      // Ignoring `readable`, `data` handlers which affect flow.
      stream
        .on('close', () => this._log('close', id))
        .on('end', () => this._log('close', id))
        .on('error', err => this._log('error', id, err))
        .on('pause', () => this._log('pause', id))
        .on('resume', () => this._log('resume', id))
        // readableFlowing
        // readableAborted
        // destroyed
        // errored
    }

    if (stream._writableState) {
      stream
        .on('close', () => this._log('close', id))
        .on('drain', () => this._log('drain', id))
        .on('error', err => this._log('error', id, err))
        .on('finish', () => this._log('finish', id))
        .on('pipe', () => this._log('pipe', id))
        .on('unpipe', () => this._log('unpipe', id))
        // writeableNeedDrain
        // writeableAborted
        // destroyed
        // aborted
        // errored
    }

    this._log('monitored', id)
    this.streams.push({ id, name })

    return this
  }

  end() {
    this._ended = true

    return this
  }

  report(opts) {
    this._printTitle('Report: ' + this.name).end()

    this._getLogs().forEach(this._printLog())
  }

  reportGroups(opts) {
    this._printTitle(this.name).end()

    this.streams.map(stream => {
      return {
        ...stream,
        logs: this._getLogs().filter(log => log.id === stream.id)
      }
    })
    .forEach(stream => {
        this._printTitle(stream.name)

        stream.logs.forEach(this._printLog({ skipName: true }))
      })
  }

  _log(event, id, err) {
    this.logs.push({ index: ++this._logCounter, event, id, err })

    if (this._ended)
      console.log(style('orange', '%s emitted after report generation'), event)
  }

  _getLogs() {
    return this.logs
      .filter(log => !this.exclude.includes(log.event))
      .sort((a, b) => a.index - b.index)
      .map((log, i) => ({ ...log, index: i + 1 }))
  }

  _printTitle(text) {
    console.log('\n', col(['bold', 'magenta'], text), '\n')

    return this
  }

  _printLog(opts) {
    return log => {
      const format = {
        index: col('gray', log.index.toString()),
        event: col(this._mappings[log.event] || this._mappings['*'], log.event),
        name: this.streams.find(stream => stream.id === log.id).name,
        err: log.err ? log.err.message : ''
      }

      opts?.skipName ?
        console.log(format.index, format.event, format.err) :
        console.log(format.index, format.name, format.event, format.err)
    }
  }
}
