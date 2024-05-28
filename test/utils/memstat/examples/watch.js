/*
* This example starts in `watch: true` mode.
*
* This draws the plot and keeps it live, updating in real-time.
*
* > @WARNING
* > This mode suspends any writes to `stdout`/`stderr`, therefore any
* > `console.log` or `console.error` etc will *NOT* output anything while
* > it's running.  
*/

import { setTimeout as about } from 'node:timers/promises'
import Memstat from '../index.js'

const memstat = new Memstat({ watch: true })

memstat.start()

let leak = []

for (let i = 0; i <= 1000; i++) {
  const val = Array.from({ length: 55000 }, _ => Math.random()) // ~ 1 MB

  leak.push(JSON.stringify(val))

  await about(20)
}

console.log(memstat.stop())
