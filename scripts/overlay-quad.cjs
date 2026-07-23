/* Paint a candidate quad (corner fractions) onto a blank mockup and write a
 * debug PNG so we can verify corner-pin alignment WITHOUT the browser.
 * Usage: node scripts/overlay-quad.cjs <name> <tlx,tly> <trx,try> <brx,bry> <blx,bly>
 * No deps (manual PNG decode + encode). */
const fs = require('fs')
const zlib = require('zlib')

function decodePNG(path) {
  const buf = fs.readFileSync(path)
  let pos = 8
  let ihdr = null
  const idat = []
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos)
    const type = buf.toString('ascii', pos + 4, pos + 8)
    const data = buf.slice(pos + 8, pos + 8 + len)
    if (type === 'IHDR') ihdr = { width: data.readUInt32BE(0), height: data.readUInt32BE(4), colorType: data[9] }
    else if (type === 'IDAT') idat.push(data)
    else if (type === 'IEND') break
    pos += 12 + len
  }
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const { width, height, colorType } = ihdr
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : colorType === 4 ? 2 : 4
  const bpp = channels
  const stride = width * bpp
  const out = Buffer.alloc(height * stride)
  let p = 0
  for (let y = 0; y < height; y++) {
    const filter = raw[p++]
    for (let x = 0; x < stride; x++) {
      const val = raw[p++]
      const a = x >= bpp ? out[y * stride + x - bpp] : 0
      const b = y > 0 ? out[(y - 1) * stride + x] : 0
      const c = x >= bpp && y > 0 ? out[(y - 1) * stride + x - bpp] : 0
      let v = val
      switch (filter) {
        case 1: v = (v + a) & 255; break
        case 2: v = (v + b) & 255; break
        case 3: v = (v + ((a + b) >> 1)) & 255; break
        case 4: {
          const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c)
          const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c
          v = (v + pr) & 255; break
        }
      }
      out[y * stride + x] = v
    }
  }
  return { width, height, channels, data: out, stride }
}

const crcTable = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0 } return t })()
function crc32(buf) { let crc = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF]; return (crc ^ 0xFFFFFFFF) >>> 0 }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0); const t = Buffer.from(type, 'ascii'); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0); return Buffer.concat([len, t, data, crc]) }
function encodePNG(width, height, rgb) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 2
  const stride = width * 3
  const raw = Buffer.alloc(height * (stride + 1))
  for (let y = 0; y < height; y++) { raw[y * (stride + 1)] = 0; rgb.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride) }
  const idat = zlib.deflateSync(raw, { level: 6 })
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

function sign(px, py, ax, ay, bx, by) { return (px - bx) * (ay - by) - (ax - bx) * (py - by) }
function inTri(px, py, a, b, c) {
  const d1 = sign(px, py, a[0], a[1], b[0], b[1])
  const d2 = sign(px, py, b[0], b[1], c[0], c[1])
  const d3 = sign(px, py, c[0], c[1], a[0], a[1])
  const neg = d1 < 0 || d2 < 0 || d3 < 0
  const pos = d1 > 0 || d2 > 0 || d3 > 0
  return !(neg && pos)
}

const parse = (s) => s.split(',').map(Number)
const [, , name, tlS, trS, brS, blS] = process.argv
const dir = '/Users/qwikker/qwikkerdashboard/public/demo/'
const src = decodePNG(dir + name)
const { width, height, channels, data, stride } = src

// to RGB
const rgb = Buffer.alloc(width * height * 3)
for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
  const i = y * stride + x * channels, o = (y * width + x) * 3
  rgb[o] = data[i]; rgb[o + 1] = data[i + 1]; rgb[o + 2] = data[i + 2]
}

const TL = parse(tlS), TR = parse(trS), BR = parse(brS), BL = parse(blS)
const px = (pt) => [pt[0] * width, pt[1] * height]
const tl = px(TL), tr = px(TR), br = px(BR), bl = px(BL)

// translucent red fill over the quad (two triangles)
for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
  if (inTri(x, y, tl, tr, br) || inTri(x, y, tl, br, bl)) {
    const o = (y * width + x) * 3
    rgb[o] = Math.min(255, rgb[o] * 0.45 + 255 * 0.55)
    rgb[o + 1] = rgb[o + 1] * 0.45
    rgb[o + 2] = rgb[o + 2] * 0.45
  }
}
// corner markers (blue squares)
for (const [cx, cy] of [tl, tr, br, bl]) {
  for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) {
    const x = Math.round(cx + dx), y = Math.round(cy + dy)
    if (x < 0 || y < 0 || x >= width || y >= height) continue
    const o = (y * width + x) * 3
    rgb[o] = 40; rgb[o + 1] = 120; rgb[o + 2] = 255
  }
}

const out = dir + '_debug_' + name
fs.writeFileSync(out, encodePNG(width, height, rgb))
console.log('wrote', out, width + 'x' + height)
