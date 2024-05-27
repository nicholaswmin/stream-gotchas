import { setTimeout as sleep } from 'node:timers/promises'
import Memstat from '../index.js'

const memstat = new Memstat()

let leak = ''

for (let i = 0; i <= 10000; i++) {
  leak += JSON.stringify({ foo: 'bar' })
  await sleep(0)
}

const stats = memstat.stop()
console.log(stats)

// without a reference to the leak, the GC is smart enough
// to clear it even though it wasn't explicitly unreferenced
console.log(leak.length)
