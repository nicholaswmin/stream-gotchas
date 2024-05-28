// Sample leaky Express server for tests

import { setTimeout as wait } from 'node:timers/promises'
import express from 'express'

const app = express()

// Always leaks

let leakyAlways = []

app.get('/leaky/always', (req , res) => {
  const megabyte = Array.from({ length: 55000 }, _ => Math.random())

  leakyAlways.push(JSON.stringify(megabyte))

  wait(10).then(() => res.sendStatus(204))
})

// Leaks sometimes

let leakySometimes = []

app.get('/leaky/sometimes', (req, res) => {
  const megabyte = Array.from({ length: 55000 }, _ => Math.random())

  if (Math.random() > 0.50)
    leakySometimes.push(JSON.stringify(megabyte))

  wait(10).then(() => res.sendStatus(204))
})

// Uses a significant amount of memory, but does not leak

app.get('/spikey', async ({ originalUrl }, res) => {
  let baz = [],
      twoMegabyte = Array.from({ length: 275000 }, _ => Math.random()),
      randomPos = Math.round(Math.random() * 275000)

  baz.push(JSON.stringify(twoMegabyte))

  wait(10).then(() => res.json(baz[randomPos]))
})

// No problemo

app.get('/watertight', (req, res) => {
  wait(10).then(() => res.json({ first: 'John', last: 'Doe' }))
})

export default app.listen(0)
