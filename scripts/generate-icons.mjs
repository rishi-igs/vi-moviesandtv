import { writeFileSync } from 'fs'
import { deflateSync } from 'zlib'

function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeB = Buffer.from(type)
  const crcData = Buffer.concat([typeB, data])
  const crcV = Buffer.alloc(4)
  crcV.writeUInt32BE(crc32(crcData))
  return Buffer.concat([len, typeB, data, crcV])
}

function createPNG(size, r, g, b) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const raw = Buffer.alloc(size * (size * 3 + 1))
  for (let y = 0; y < size; y++) {
    const off = y * (size * 3 + 1)
    raw[off] = 0
    for (let x = 0; x < size; x++) {
      raw[off + 1 + x * 3] = r
      raw[off + 2 + x * 3] = g
      raw[off + 3 + x * 3] = b
    }
  }

  const compressed = deflateSync(raw)
  const idat = chunk('IDAT', compressed)
  const ihdrC = chunk('IHDR', ihdr)
  const iend = chunk('IEND', Buffer.alloc(0))

  return Buffer.concat([sig, ihdrC, idat, iend])
}

const extDir = 'extension'
writeFileSync(`${extDir}/icon16.png`, createPNG(16, 37, 99, 235))
writeFileSync(`${extDir}/icon48.png`, createPNG(48, 37, 99, 235))
writeFileSync(`${extDir}/icon128.png`, createPNG(128, 37, 99, 235))
console.log('Icons generated in extension/')
