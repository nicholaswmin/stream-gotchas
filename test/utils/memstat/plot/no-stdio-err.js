// Monkey patch `stdio`/`stderr` otherwise anything
// writing to the console, will throw off the single line plot
// chart
//
// Ensure we restore it back after we're done
// While i/o is intercepted, use `stdout` and `stderr``
// for logging.
//
// Authors:
// Nik Kyriakides
// @nicholaswmin

const logs = []
const stdoutFn = process.stdout.write
const stderrFn = process.stderr.write

const writeOut = function () {
  if (arguments[0].includes('*'))
    stdoutFn.apply(process.stdout, arguments)
  else
    logs.push(arguments[0])
}

const writeErr = function () {
  if (arguments[0].includes('*'))
    stderrFn.apply(process.stderr, arguments)
  else
    logs.push(arguments[0])
}

process.stdout.write = writeOut
process.stderr.write = writeErr

const restoreIO = () => {
  process.stdout.write = stdoutFn
  process.stderr.write = stderrFn
}

export { logs, restoreIO }
