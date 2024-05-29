import Memstat from './index.js'

if (process.argv.includes('--memstat')) {
  const memstat = new Memstat({
    watch: process.argv.some(flag => flag.includes('memstat')),
    drawPlot: false
  })

  memstat.start()
}

export default {}
