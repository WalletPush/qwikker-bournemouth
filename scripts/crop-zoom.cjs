/* Crop a fractional region of a blank mockup and scale it up so we can measure
 * an exact corner WITHOUT the browser. Draws a light grid (every 5% of the
 * ORIGINAL image) with fractional labels burned in as tick marks.
 * Usage: node scripts/crop-zoom.cjs <name> <x0> <y0> <x1> <y1> [scale]
 * No deps (manual PNG decode + encode). */
const fs = require('fs')
const zlib = require('zlib')
const path = require('path')

function decodePNG(buf) {
  let p = 8
  let w = 0, h = 0, bitDepth = 0, colorType = 0
  const idat = []
  while (p < buf.length) {
    const len = buf.readUInt32BE(p); const type = buf.toString('ascii', p + 4, p + 8)
    const data = buf.subarray(p + 8, p + 8 + len)
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9] }
    else if (type === 'IDAT') idat.push(data)
    else if (type === 'IEND') break
    p += 12 + len
  }
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 1
  const bpp = channels * (bitDepth / 8)
  const stride = w * bpp
  const out = Buffer.alloc(w * h * 4)
  let pos = 0
  const prevRow = Buffer.alloc(stride)
  let cur = Buffer.alloc(stride)
  const paeth = (a, b, c) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c }
  for (let y = 0; y < h; y++) {
    const ft = raw[pos++]; const row = raw.subarray(pos, pos + stride); pos += stride
    cur = Buffer.from(row)
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0
      const b = prevRow[i]
      const c = i >= bpp ? prevRow[i - bpp] : 0
      let v = cur[i]
      if (ft === 1) v = (v + a) & 255
      else if (ft === 2) v = (v + b) & 255
      else if (ft === 3) v = (v + ((a + b) >> 1)) & 255
      else if (ft === 4) v = (v + paeth(a, b, c)) & 255
      cur[i] = v
    }
    for (let x = 0; x < w; x++) {
      const s = x * bpp; const d = (y * w + x) * 4
      if (channels >= 3) { out[d] = cur[s]; out[d + 1] = cur[s + 1]; out[d + 2] = cur[s + 2]; out[d + 3] = channels === 4 ? cur[s + 3] : 255 }
      else { out[d] = out[d + 1] = out[d + 2] = cur[s]; out[d + 3] = 255 }
    }
    cur.copy(prevRow)
  }
  return { w, h, data: out }
}

function encodePNG(w, h, data) {
  const stride = w * 4
  const raw = Buffer.alloc((stride + 1) * h)
  for (let y = 0; y < h; y++) { raw[y * (stride + 1)] = 0; data.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride) }
  const comp = zlib.deflateSync(raw)
  const crcTable = []
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c >>> 0 }
  const crc = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
  const chunk = (type, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length, 0); const t = Buffer.from(type, 'ascii'); const c = Buffer.alloc(4); c.writeUInt32BE(crc(Buffer.concat([t, d])), 0); return Buffer.concat([len, t, d, c]) }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', comp), chunk('IEND', Buffer.alloc(0))])
}

const [name, x0s, y0s, x1s, y1s, scaleS, suffix] = process.argv.slice(2)
const scale = parseInt(scaleS || '4', 10)
const src = decodePNG(fs.readFileSync(path.join('public/demo', name)))
const [x0, y0, x1, y1] = [x0s, y0s, x1s, y1s].map(Number)
const px0 = Math.floor(x0 * src.w), py0 = Math.floor(y0 * src.h)
const px1 = Math.ceil(x1 * src.w), py1 = Math.ceil(y1 * src.h)
const cw = px1 - px0, ch = py1 - py0
const ow = cw * scale, oh = ch * scale
const out = Buffer.alloc(ow * oh * 4)
for (let y = 0; y < oh; y++) for (let x = 0; x < ow; x++) {
  const sx = px0 + Math.floor(x / scale), sy = py0 + Math.floor(y / scale)
  const s = (sy * src.w + sx) * 4, d = (y * ow + x) * 4
  out[d] = src.data[s]; out[d + 1] = src.data[s + 1]; out[d + 2] = src.data[s + 2]; out[d + 3] = 255
}
// grid every 2.5% of ORIGINAL image, labelled by original fraction via tick density
const line = (fracX) => { const ox = Math.round((fracX * src.w - px0) * scale); if (ox < 0 || ox >= ow) return; for (let y = 0; y < oh; y++) { const d = (y * ow + ox) * 4; out[d] = 0; out[d + 1] = 200; out[d + 2] = 255; out[d + 3] = 255 } }
const hline = (fracY) => { const oy = Math.round((fracY * src.h - py0) * scale); if (oy < 0 || oy >= oh) return; for (let x = 0; x < ow; x++) { const d = (oy * ow + x) * 4; out[d] = 0; out[d + 1] = 200; out[d + 2] = 255; out[d + 3] = 255 } }
for (let f = 0; f <= 1.0001; f += 0.025) { line(f); hline(f) }
// brighter lines every 10%
const line2 = (fracX, r, g, b) => { const ox = Math.round((fracX * src.w - px0) * scale); if (ox < 0 || ox >= ow) return; for (let y = 0; y < oh; y++) { const d = (y * ow + ox) * 4; out[d] = r; out[d + 1] = g; out[d + 2] = b } }
const hline2 = (fracY, r, g, b) => { const oy = Math.round((fracY * src.h - py0) * scale); if (oy < 0 || oy >= oh) return; for (let x = 0; x < ow; x++) { const d = (oy * ow + x) * 4; out[d] = r; out[d + 1] = g; out[d + 2] = b } }
for (let f = 0; f <= 1.0001; f += 0.05) { line2(f, 255, 90, 90); hline2(f, 255, 90, 90) }
const outName = path.join('public/demo', `_zoom_${suffix ? suffix + '_' : ''}${name}`)
fs.writeFileSync(outName, encodePNG(ow, oh, out))
console.log(`wrote ${outName} ${ow}x${oh} — crop [${x0},${y0}]..[${x1},${y1}] | red lines every 5%, cyan every 2.5%`)
