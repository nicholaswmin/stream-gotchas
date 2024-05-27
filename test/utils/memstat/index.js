// Stats Collector
//
// Collects heap size after a GC compaction,
// and calculates whether there's a persistent uptrend to it
//
// Authors: Nik Kyriakides
// @nicholaswmin

import v8 from 'node:v8'
import vm from 'node:vm'
import { setTimeout as sleep } from 'node:timers/promises'
import { PerformanceObserver } from 'node:perf_hooks'

import calculateUptrend from './uptrend.js'
import Plot from './plot/index.js'

v8.setFlagsFromString('--expose-gc')
global.gc = vm.runInNewContext('gc')

export default class Memstat {
  constructor() {
    this.snapshots = []
    this.initial = v8.getHeapStatistics().used_heap_size

    this.current = null
    this.uptrend = false

    this.plot = new Plot({ initial: this.initial })
    this.observer = new PerformanceObserver(list =>
      this.plot.update(this.update().getStats()))
    this.observer.observe({ entryTypes: ['gc'] })
  }

  update() {
    this.current = v8.getHeapStatistics().used_heap_size
    this.snapshots.push(this.current)
    this.uptrend = calculateUptrend(this.snapshots, {
      maPeriod: this.snapshots.length,
      rsiPeriod: this.snapshots.length
    })

    this.plot.update(this.getStats())

    return this
  }

  getStats() {
    return {
      snapshots: [ ...this.snapshots ],
      current: this.current,
      uptrend: this.uptrend
    }
  }

  stop() {
    this.observer.disconnect()

    global.gc()

    this.update().plot.end()

    return {
      stats: this.getStats(),
      plot: this.plot.generate({ colors: [] })
    }
  }
}
