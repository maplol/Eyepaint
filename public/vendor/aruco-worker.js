/* global AR, importScripts */
/**
 * Classic worker — importScripts js-aruco2 from same origin.
 */
let detector = null

self.onmessage = function (event) {
  var data = event.data

  if (data.type === 'init') {
    var base = data.baseUrl
    if (base.charAt(base.length - 1) !== '/') base += '/'
    try {
      importScripts(
        base + 'vendor/js-aruco2/cv.js',
        base + 'vendor/js-aruco2/aruco.js',
        base + 'vendor/js-aruco2/dictionaries/aruco_4x4_1000.js',
      )
      detector = new AR.Detector({
        dictionaryName: 'ARUCO_4X4_1000',
        maxHammingDistance: 3,
      })
      self.postMessage({ type: 'ready' })
    } catch (error) {
      self.postMessage({
        type: 'error',
        message: error && error.message ? error.message : String(error),
      })
    }
    return
  }

  if (data.type === 'frame') {
    if (!detector) {
      self.postMessage({ type: 'markers', markers: [] })
      return
    }
    try {
      var imageData = new ImageData(new Uint8ClampedArray(data.buffer), data.width, data.height)
      var markers = detector.detect(imageData) || []
      self.postMessage({
        type: 'markers',
        markers: markers.map(function (m) {
          return {
            id: m.id,
            hammingDistance: m.hammingDistance || 0,
            corners: (m.corners || []).map(function (c) {
              return { x: c.x, y: c.y }
            }),
          }
        }),
      })
    } catch (error) {
      self.postMessage({ type: 'markers', markers: [] })
    }
  }
}
