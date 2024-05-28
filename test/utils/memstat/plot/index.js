import asciichart from 'asciichart'
import singleLineLog from 'single-line-log'

import { suspendIO, restoreIO }  from './process-io.js'
import plot from './plot.js'

const bytesToMB = bytes => Math.ceil((bytes / 1024) / 1024)

// discard equal points if they are next to each other; consecutive.
// i.e:
// - `[1, 3, 3, 4, 4, 4, 1, 3]` becomes `[1, 3, 4, 1, 3]`
// - we always make sure we keep first/last elements
const areEqualConsecutive = (point, i, arr) => i == 0 || point !== arr[i - 1]

// pick elements of equal distance between them.
// i.e for an `array.length: 10` & `minCount:2`
// we'll end up with 3 elements at equal distance at the array index from
// each other; always keeping the first/last elements.
//
// This: `[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]` becomes `[1, 6, 10]`
// @NOTE Unused
const toMinimumEquidistant = minCount => (acc, point, i, arr) => {
  const isFirst = i === 0
  const isLast = arr.length - 1
  const isEquidistant = i % Math.ceil(arr.length / minCount) === 0

  return isFirst || isLast || isEquidistant ? [...acc, point] : acc
}

export default class Plot {
  constructor({ initial = 0, watch }) {
    this.watch = watch
    this.window = {
      width: process.stdout.columns - 20,
      height: process.stdout.rows - 10
    }

    this.snapshots = []
    this.initial = bytesToMB(initial)
    this.current = 0
    this.leaks = false

    if (this.watch)
      suspendIO()
  }

  update({ snapshots, current, leaks }) {
    this.snapshots = snapshots.map(bytesToMB).filter(areEqualConsecutive)
    this.current = bytesToMB(current)
    this.leaks = leaks

    if (this.watch)
      singleLineLog.stdout(this.generate({ current, snapshots, leaks }))

    return this
  }

  end() {
    if (this.watch)
      restoreIO()

    return this
  }

  generate(opts) {
    opts = opts || {}

    const colors = typeof opts.colors !== 'undefined' ? opts.colors : true

    return plot(this.snapshots, {
      title: '-- Heap size following GC --',
      sublabels: [ this.leaks ? 'Possible Leakage' : 'No leakage' ],
      lineLabels: [ 'heap size' ],
      xLabel: 'GC Cycles: ' + this.snapshots.length,
      yLabels: [
        'Cur: ' + this.current + ' MB',
        'Max: ' + Math.max(...this.snapshots) + ' MB'
      ],
      xStartLabel: 'Initial: ' + this.initial + ' MB',
      min: 1,
      max: Math.ceil(20 + this.current * 1.25),
      margin: 1,
      height: this.window.height - 10,
      width: this.window.width - 5,
      hideXLabel: true,
      colors: [ this.leaks ? asciichart.red : asciichart.green ],
      ...opts
    })
  }
}
