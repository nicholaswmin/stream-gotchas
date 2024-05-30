// HTTPie helpers
import { execa } from 'execa'

const normal = async url => {
  return execa`http ${url} --ignore-stdin`
}

const thenAbort = async (url, { times = 1, afterMs = 0 }) => {
  const requestThenAbort = async ({ times, afterMs }) => {
    if (times <= 0)
      return true

    try {
      const ctrl = new AbortController()

      let lines = 0

      for await (const line of execa({
        cancelSignal: ctrl.signal
      })`http --chunked ${url} --ignore-stdin`) {
        if (afterMs) {
          setTimeout(() => ctrl.abort(), afterMs)
        } else {
          if (line.length > 1000)
            ctrl.abort()
          }
      }
    } catch (err) {
      if (err.code === 'ABORT_ERR')
        return requestThenAbort({ times: --times, afterMs })

      throw err
    }
  }

  if (isNaN(times) || times < 1 || times > 20)
    throw new Error('"times" must be a number 1 - 20')

  if (isNaN(afterMs) || afterMs < 0 || afterMs > 2000000)
    throw new Error('"afterMs" must be a number 1 - 2000000')

  return requestThenAbort({ times: --times, afterMs })
}

const request = url => {
  return {
    normal: () => normal(url),
    thenAbort: options => thenAbort(url, options)
  }
}

export default request
