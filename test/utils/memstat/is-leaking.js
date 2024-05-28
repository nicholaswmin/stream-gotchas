/*
* The worlds most daft memory leak detection filter
*
* Determines if a series of snapshots is considered a leak by checking
* whether the difference between the initial and last snapshot exceeds
* a certain size in megabytes.
*
* @nicholaswmin
*/

export default (points, toleranceMB = 10) => {
  const bytesInMegabyte = 1024 * 1024
  const first = points[0]
  const last = points[points.length - 1]

  return first && last && (last - first > (bytesInMegabyte * toleranceMB))
}
