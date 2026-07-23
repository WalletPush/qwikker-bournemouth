/* Detect the bright product "face" quad in each blank mockup and print the
 * corner fractions for the launch-pack corner-pin. No deps (manual PNG decode). */
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
    if (type === 'IHDR') ihdr = { width: data.readUInt32BE(0), height: data.readUInt32BE(4), bitDepth: data[8], colorType: data[9] }
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

function analyze(path, T, S) {
  const { width, height, channels, data, stride } = decodePNG(path)
  const mask = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * stride + x * channels
      const r = data[i], g = data[i + 1], b = data[i + 2]
      const bright = (r + g + b) / 3
      const sat = Math.max(r, g, b) - Math.min(r, g, b)
      if (bright >= T && sat <= S) mask[y * width + x] = 1
    }
  }
  // largest connected component
  const label = new Int32Array(width * height).fill(0)
  let best = { size: 0, id: 0 }
  let id = 0
  const stack = []
  for (let s = 0; s < width * height; s++) {
    if (!mask[s] || label[s]) continue
    id++
    let size = 0
    stack.push(s)
    label[s] = id
    while (stack.length) {
      const cur = stack.pop()
      size++
      const cx = cur % width, cy = (cur / width) | 0
      const nb = [cur - 1, cur + 1, cur - width, cur + width]
      if (cx === 0) nb[0] = -1
      if (cx === width - 1) nb[1] = -1
      for (const n of nb) {
        if (n < 0 || n >= width * height) continue
        if (mask[n] && !label[n]) { label[n] = id; stack.push(n) }
      }
    }
    if (size > best.size) best = { size, id }
  }
  // corners of the largest blob via min/max of (x+y) and (x-y)
  let tl = null, tr = null, bl = null, br = null
  let minSum = Infinity, maxSum = -Infinity, minDiff = Infinity, maxDiff = -Infinity
  let minX = width, maxX = 0, minY = height, maxY = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (label[y * width + x] !== best.id) continue
      const sum = x + y, diff = x - y
      if (sum < minSum) { minSum = sum; tl = [x, y] }
      if (sum > maxSum) { maxSum = sum; br = [x, y] }
      if (diff > maxDiff) { maxDiff = diff; tr = [x, y] }
      if (diff < minDiff) { minDiff = diff; bl = [x, y] }
      if (x < minX) minX = x; if (x > maxX) maxX = x
      if (y < minY) minY = y; if (y > maxY) maxY = y
    }
  }
  const f = (pt) => [(pt[0] / width).toFixed(3), (pt[1] / height).toFixed(3)]
  return { width, height, area: (best.size / (width * height) * 100).toFixed(1) + '%', bbox: { minX, minY, maxX, maxY }, corners: { tl: f(tl), tr: f(tr), br: f(br), bl: f(bl) } }
}

const dir = '/Users/qwikker/qwikkerdashboard/public/demo/'
for (const [name, T, S] of [['demo-blank-sticker.png', 175, 30], ['demo-blank-tent.png', 225, 22], ['demo-blank-counter.png', 238, 16]]) {
  try {
    console.log('====', name, '====')
    console.log(JSON.stringify(analyze(dir + name, T, S)))
  } catch (e) {
    console.log('ERR', name, e.message)
  }
}
