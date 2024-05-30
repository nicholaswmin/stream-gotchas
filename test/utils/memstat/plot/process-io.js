// # Process IO
//
// Monkey patches `stdio`/`stderr`, otherwise anything writing to the
// terminal, will throw off a live-updating single line ASCII plot
//
// > @WARNING
// > This module suspends any writes to `stdout`/`stderr`, therefore
// > any `console.log` or `console.error` etc will *NOT* output anything.
//
// Ensure you restore them by calling `restoreIO` after you're done.
//
// While i/o is intercepted, the only way to write to output is to include a
// '*' in the text, i.e: `console.log('*' + 'yo')`
//
// ## Usage:
//
// ```js
// import {suspendIO, restoreIO } from 'suspend-io'
//
// suspendIO()
//
// // Do whatever...
//
// // console.log('wow') // does nothing
//
// // ... and when done:
//
// restoreIO
//```
//
// Calling `restoreIO()` will also log all the writes that took place while
// it was suspended, at the correct stream, in the correct order.
//
// ## Authors:
// - Nik Kyriakides, @nicholaswmin
//

let buffer = []
const stdoutFn = process.stdout.write
const stderrFn = process.stderr.write

const writeOut = function () {
  return arguments[0].includes('*') ?
    stdoutFn.apply(process.stdout, arguments) :
    buffer.push({ dest: 'stdout', val: arguments[0] })
}

const writeErr = function () {
  return arguments[0].includes('*') ?
    stderrFn.apply(process.stderr, arguments) :
    buffer.push({ dest: 'stderr', val: arguments[0] })
}

const suspendIO = () => {
  console.info('INFO: stdout/stderr writes are suspended...')

  process.stdout.write = writeOut
  process.stderr.write = writeErr
}

const restoreIO = () => {
  process.stdout.write = stdoutFn
  process.stderr.write = stderrFn

  if (buffer.length)
    console.info('INFO: Dumping previous stdout/stderr writes...')

  buffer.forEach(write => write.dest === 'stderr' ?
      process.stderr.write(write.val) :
      process.stdout.write(write.val))

  buffer = []
}

export { restoreIO, suspendIO }
