/*
- From: Calculating an “up trend” with JavaScript
- Author: Mustafa Onur Çelik
- Adapted by: @nicholaswmin

https://medium.com/@onurcelik.dev/calculating-an-up-trend-with-javascript-f8c6fc698e6f
*/

function calculateUptrend(points, { maPeriod, rsiPeriod }) {
  // Calculate the moving average
  const ma = calculateMA(points, maPeriod)

  // Calculate the RSI
  const rsi = calculateRSI(points, rsiPeriod)

  // Check for an uptrend
  const uptrend = (ma > 0) && (rsi > 50)

  return uptrend
}

// Moving Average
function calculateMA(points, period) {
  let sum = 0

  for (let i = 0; i < period; i++)
    sum += points[i]

  return sum / period
}

function calculateRSI(points, period) {
  // Calculate the average of the upward changes
  let avgUpwardChange = 0

  for (let i = 1; i < points.length; i++)
    avgUpwardChange += Math.max(0, points[i] - points[i - 1])

  avgUpwardChange /= points.length

  // Calculate the average of the downward changes
  let avgDownwardChange = 0

  for (let i = 1; i < points.length; i++)
    avgDownwardChange += Math.max(0, points[i - 1] - points[i])

  avgDownwardChange /= points.length

  // Calculate the RSI
  const rsi = 100 - (100 / (1 + (avgUpwardChange / avgDownwardChange)))

  return rsi
}

export default calculateUptrend
