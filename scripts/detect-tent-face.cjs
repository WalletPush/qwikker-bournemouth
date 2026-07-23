/* Detect the BRIGHT WHITE front face of a tent/card mockup and compute its four
 * corners automatically (no eyeballing). The front face is the brightest large
 * white region; the back panel is dimmer (in shadow) and excluded by threshold.
 *
 * Method: build a bright-white mask, keep the largest connected component,
 * (optionally) restrict to its left N% to isolate the front panel, then take
 * corners as the extremes of (x+y) and (x-y).
 *
 * Usage: node scripts/detect-tent-face.cjs <name> [minBright] [leftFrac]
 *   name      : file in public/demo
 *   minBright : min of R,G,B to count as white (default 205)
 *   leftFrac  : keep only pixels whose x <= leftFrac of the component's width
 *               (default 1.0 = whole component). Use ~0.62 to drop the back panel.
 * Prints the four corners as fractions and writes a verification overlay.
 * No deps. */
const fs = require('fs')
const zlib = require('zlib')
const path = require('path')
const { execFileSync } = require('child_process')

function decodePNG(buf) {
  let p = 8, w = 0, h = 0, bitDepth = 0, colorType = 0
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

const [name, minBrightS, leftFracS] = process.argv.slice(2)
const minBright = parseInt(minBrightS || '205', 10)
const leftFrac = parseFloat(leftFracS || '1.0')
const img = decodePNG(fs.readFileSync(path.join('public/demo', name)))
const { w, h, data } = img

// bright-white + low-saturation mask
const mask = new Uint8Array(w * h)
for (let i = 0; i < w * h; i++) {
  const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2]
  const mn = Math.min(r, g, b), mx = Math.max(r, g, b)
  if (mn >= minBright && mx - mn <= 40) mask[i] = 1
}

// largest connected component (4-neighbour flood)
const label = new Int32Array(w * h).fill(0)
let best = { id: 0, count: 0 }
let cur = 0
const stack = []
for (let s = 0; s < w * h; s++) {
  if (!mask[s] || label[s]) continue
  cur++
  let count = 0
  stack.push(s); label[s] = cur
  while (stack.length) {
    const p = stack.pop(); count++
    const x = p % w, y = (p / w) | 0
    if (x > 0 && mask[p - 1] && !label[p - 1]) { label[p - 1] = cur; stack.push(p - 1) }
    if (x < w - 1 && mask[p + 1] && !label[p + 1]) { label[p + 1] = cur; stack.push(p + 1) }
    if (y > 0 && mask[p - w] && !label[p - w]) { label[p - w] = cur; stack.push(p - w) }
    if (y < h - 1 && mask[p + w] && !label[p + w]) { label[p + w] = cur; stack.push(p + w) }
  }
  if (count > best.count) best = { id: cur, count }
}

// bounds of the component
let minX = w, maxX = 0
for (let i = 0; i < w * h; i++) if (label[i] === best.id) { const x = i % w; if (x < minX) minX = x; if (x > maxX) maxX = x }
const cutX = minX + (maxX - minX) * leftFrac

// corners via extremes of x+y and x-y, restricted to left fraction
let tl = null, tr = null, br = null, bl = null
let tlv = Infinity, trv = -Infinity, brv = -Infinity, blv = Infinity
for (let i = 0; i < w * h; i++) {
  if (label[i] !== best.id) continue
  const x = i % w, y = (i / w) | 0
  if (x > cutX) continue
  const spq = x + y, dif = x - y
  if (spq < tlv) { tlv = spq; tl = [x, y] }
  if (spq > brv) { brv = spq; br = [x, y] }
  if (dif > trv) { trv = dif; tr = [x, y] }
  if (dif < blv) { blv = dif; bl = [x, y] }
}

const f = (p) => [`${(p[0] / w).toFixed(3)}`, `${(p[1] / h).toFixed(3)}`]
const fr = (p) => `${(p[0] / w).toFixed(3)},${(p[1] / h).toFixed(3)}`
console.log(`component px=${best.count} bounds x[${minX}-${maxX}] cutX=${cutX | 0}`)
console.log(`tl ${f(tl)}  tr ${f(tr)}  br ${f(br)}  bl ${f(bl)}`)
console.log(`OVERLAY: node scripts/overlay-quad.cjs ${name} ${fr(tl)} ${fr(tr)} ${fr(br)} ${fr(bl)}`)
try {
  execFileSync('node', ['scripts/overlay-quad.cjs', name, fr(tl), fr(tr), fr(br), fr(bl)], { stdio: 'inherit' })
} catch {}
