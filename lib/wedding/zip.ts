// Minimal, dependency-free ZIP writer (STORE method — no compression).
// Photos are already compressed (JPEG/PNG/HEIC) so there's nothing to gain from deflate,
// and "stored" entries are simple + robust. Produces a standard .zip that macOS Finder,
// Windows Explorer, iOS Files and Android all open natively.
// Note: 32-bit sizes/offsets — fine for wedding albums (no single 4GB+ file / >4GB total).

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

export interface ZipFile {
  name: string
  data: Buffer
}

export function createZip(files: ZipFile[]): Buffer {
  const localParts: Buffer[] = []
  const centralParts: Buffer[] = []
  let offset = 0

  // Fixed DOS date/time (1980-01-01 00:00) — we don't rely on per-file timestamps.
  const dosTime = 0
  const dosDate = 0x0021

  for (const file of files) {
    const nameBuf = Buffer.from(file.name, 'utf8')
    const data = file.data
    const crc = crc32(data)
    const size = data.length

    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0) // local file header signature
    local.writeUInt16LE(20, 4) // version needed
    local.writeUInt16LE(0x0800, 6) // flags: UTF-8 filename
    local.writeUInt16LE(0, 8) // method: store
    local.writeUInt16LE(dosTime, 10)
    local.writeUInt16LE(dosDate, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(size, 18) // compressed size
    local.writeUInt32LE(size, 22) // uncompressed size
    local.writeUInt16LE(nameBuf.length, 26)
    local.writeUInt16LE(0, 28) // extra length
    localParts.push(local, nameBuf, data)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0) // central dir header signature
    central.writeUInt16LE(20, 4) // version made by
    central.writeUInt16LE(20, 6) // version needed
    central.writeUInt16LE(0x0800, 8) // flags: UTF-8
    central.writeUInt16LE(0, 10) // method: store
    central.writeUInt16LE(dosTime, 12)
    central.writeUInt16LE(dosDate, 14)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(size, 20)
    central.writeUInt32LE(size, 24)
    central.writeUInt16LE(nameBuf.length, 28)
    central.writeUInt16LE(0, 30) // extra length
    central.writeUInt16LE(0, 32) // comment length
    central.writeUInt16LE(0, 34) // disk number start
    central.writeUInt16LE(0, 36) // internal attrs
    central.writeUInt32LE(0, 38) // external attrs
    central.writeUInt32LE(offset, 42) // relative offset of local header
    centralParts.push(central, nameBuf)

    offset += local.length + nameBuf.length + size
  }

  const centralBuf = Buffer.concat(centralParts)
  const centralSize = centralBuf.length

  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0) // end of central dir signature
  end.writeUInt16LE(0, 4) // disk number
  end.writeUInt16LE(0, 6) // disk with central dir
  end.writeUInt16LE(files.length, 8) // entries on this disk
  end.writeUInt16LE(files.length, 10) // total entries
  end.writeUInt32LE(centralSize, 12)
  end.writeUInt32LE(offset, 16) // offset of central dir
  end.writeUInt16LE(0, 20) // comment length

  return Buffer.concat([...localParts, centralBuf, end])
}
