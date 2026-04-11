// Pure-Node PNG icon generator — no npm deps required.
// Produces a solid teal (#0F766E) rounded-looking square for each size.

import { writeFileSync, mkdirSync } from 'fs'
import { deflateSync } from 'zlib'

function u32be(n) {
  const b = Buffer.alloc(4)
  b.writeUInt32BE(n, 0)
  return b
}

function crc32(buf) {
  let crc = 0xFFFFFFFF
  for (const byte of buf) {
    crc ^= byte
    for (let i = 0; i < 8; i++) crc = (crc & 1) ? (crc >>> 1) ^ 0xEDB88320 : crc >>> 1
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const payload   = Buffer.concat([typeBytes, data])
  return Buffer.concat([u32be(data.length), payload, u32be(crc32(payload))])
}

function makePNG(size, r, g, b) {
  // IHDR
  const ihdrData = Buffer.concat([u32be(size), u32be(size),
    Buffer.from([8, 2, 0, 0, 0])]) // 8-bit RGB
  const ihdr = chunk('IHDR', ihdrData)

  // Image data: each row = filter byte (0) + RGB pixels
  const row  = Buffer.alloc(1 + size * 3)
  row[0] = 0 // filter none
  for (let x = 0; x < size; x++) {
    row[1 + x * 3 + 0] = r
    row[1 + x * 3 + 1] = g
    row[1 + x * 3 + 2] = b
  }
  const raw  = Buffer.concat(Array(size).fill(row))
  const idat = chunk('IDAT', deflateSync(raw))
  const iend = chunk('IEND', Buffer.alloc(0))

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    ihdr, idat, iend,
  ])
}

mkdirSync('public/icons', { recursive: true })

for (const size of [192, 512]) {
  writeFileSync(`public/icons/icon-${size}.png`, makePNG(size, 0x0F, 0x76, 0x6E))
  console.log(`✓ public/icons/icon-${size}.png`)
}
