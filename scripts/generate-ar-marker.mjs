#!/usr/bin/env node
/** Regenerate ARUCO_4X4_1000 markers for js-aruco2 (bit1=white). */
import fs from 'fs'
import zlib from 'zlib'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
require('../node_modules/js-aruco2/src/cv.js')
const { AR } = require('../node_modules/js-aruco2/src/aruco.js')
require('../node_modules/js-aruco2/src/dictionaries/aruco_4x4_1000.js')

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const t = Buffer.from(type)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crc])
}
function encodePNG(width, height, rgba) {
  const rows = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    rows[y * (width * 4 + 1)] = 0
    rgba.copy(rows, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}
function bitsFromId(id) {
  const dic = new AR.Dictionary('ARUCO_4X4_1000')
  const code = dic.codeList[id]
  const grid = []
  for (let r = 0; r < 4; r++) {
    const row = []
    for (let c = 0; c < 4; c++) row.push(Number(code[r * 4 + c]))
    grid.push(row)
  }
  return grid
}
function drawArucoRGB(bits, sizePx) {
  const n = 4
  const border = 1
  const cells = n + border * 2
  const cell = Math.floor(sizePx / cells)
  const size = cell * cells
  const rgba = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const cx = Math.floor(x / cell)
      const cy = Math.floor(y / cell)
      let black
      if (cx === 0 || cy === 0 || cx === cells - 1 || cy === cells - 1) black = true
      else black = bits[cy - border][cx - border] === 0
      const i = (y * size + x) * 4
      const v = black ? 0 : 255
      rgba[i] = rgba[i + 1] = rgba[i + 2] = v
      rgba[i + 3] = 255
    }
  return { size, rgba }
}
function fill(rgba, w, h, color) {
  for (let i = 0; i < w * h; i++) {
    rgba[i * 4] = color[0]
    rgba[i * 4 + 1] = color[1]
    rgba[i * 4 + 2] = color[2]
    rgba[i * 4 + 3] = 255
  }
}
function blit(dst, dw, src, sw, sh, dx, dy) {
  for (let y = 0; y < sh; y++)
    for (let x = 0; x < sw; x++) {
      const si = (y * sw + x) * 4
      const di = ((dy + y) * dw + (dx + x)) * 4
      dst[di] = src[si]
      dst[di + 1] = src[si + 1]
      dst[di + 2] = src[si + 2]
      dst[di + 3] = 255
    }
}

const DPI = 300
const mm = (v) => Math.round((v / 25.4) * DPI)
const PAPER = [245, 247, 248]
const ACCENT = [224, 154, 106]
const OUT = new URL('../public/markers/', import.meta.url)

{
  const bits = bitsFromId(0)
  const { size, rgba } = drawArucoRGB(bits, mm(90))
  fs.writeFileSync(new URL('eyepaint-aruco-id0.png', OUT), encodePNG(size, size, rgba))
}
{
  const W = mm(150)
  const H = mm(150)
  const rgba = Buffer.alloc(W * H * 4)
  fill(rgba, W, H, PAPER)
  const { size, rgba: m } = drawArucoRGB(bitsFromId(0), mm(70))
  const quiet = Math.round(size * 0.12)
  const frame = size + quiet * 2
  const plate = Buffer.alloc(frame * frame * 4)
  fill(plate, frame, frame, [255, 255, 255])
  blit(plate, frame, m, size, size, quiet, quiet)
  const ox = Math.floor((W - frame) / 2)
  const oy = Math.floor((H - frame) / 2) + 30
  blit(rgba, W, plate, frame, frame, ox, oy)
  fs.writeFileSync(new URL('eyepaint-ar-marker-card.png', OUT), encodePNG(W, H, rgba))
}
{
  const W = mm(210)
  const H = mm(297)
  const rgba = Buffer.alloc(W * H * 4)
  fill(rgba, W, H, PAPER)
  const { size, rgba: m } = drawArucoRGB(bitsFromId(0), mm(90))
  const quiet = Math.round(size * 0.18)
  const frame = size + quiet * 2
  const plate = Buffer.alloc(frame * frame * 4)
  fill(plate, frame, frame, [255, 255, 255])
  blit(plate, frame, m, size, size, quiet, quiet)
  const ox = Math.floor((W - frame) / 2)
  const oy = Math.floor(H * 0.28)
  blit(rgba, W, plate, frame, frame, ox, oy)
  const csize = mm(28)
  const margin = mm(18)
  const corners = [
    [margin, margin, 1],
    [W - margin - csize, margin, 2],
    [margin, H - margin - csize, 3],
    [W - margin - csize, H - margin - csize, 4],
  ]
  for (const [x, y, id] of corners) {
    const { size: s, rgba: cm } = drawArucoRGB(bitsFromId(id), csize)
    blit(rgba, W, cm, s, s, x, y)
  }
  fs.writeFileSync(new URL('eyepaint-ar-marker-a4.png', OUT), encodePNG(W, H, rgba))
}
fs.writeFileSync(
  new URL('marker.json', OUT),
  JSON.stringify(
    {
      name: 'EYEPAINT AR marker',
      dictionary: 'ARUCO_4X4_1000',
      detector: 'js-aruco2',
      centerId: 0,
      cornerIds: [1, 2, 3, 4],
      centerSizeMm: 90,
      cornerSizeMm: 28,
      sheet: 'eyepaint-ar-marker-a4.png',
      card: 'eyepaint-ar-marker-card.png',
      solo: 'eyepaint-aruco-id0.png',
      print: 'A4, 100% scale, matte paper preferred',
    },
    null,
    2,
  ) + '\n',
)
console.log('markers regenerated')
