/*
* This example won't leak - even though it seems it should.
*
* Oilpan, the Garbage Collector, is smart enough not to allocate memory to a
* repeating string. Garbage Collectors are based on heuristics, so
* it's possible that something that leaks now won't (appear to) leak in
* a subsequent version of Node.JS
*
* This example will crash because of Invalid String Length error, which is
* not an OOM-type error.
*/

import { setTimeout as about } from 'node:timers/promises'
import Memstat from '../index.js'

const memstat = new Memstat({ watch: true })

memstat.start()

let leak = ''

for (let i = 0; i <= 1000; i++) {
  leak += 'hello-world'.repeat(50000) // ~ 1 MB

  // This works though, uncomment it and remove above lines
  //
  // leak += (Array.from({ length: 50000 },
  //   _ => Math.random().toString().substring(0, 'hello-world'.length)))
  //   .join('')

  await about(100)
}

console.log(memstat.stop())
