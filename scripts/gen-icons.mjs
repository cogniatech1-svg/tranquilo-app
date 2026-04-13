/**
 * Single-source icon generator — all app icons from one design.
 *
 * Outputs (all in /public/ root, no subdirectory):
 *   public/icon-192.png          — PWA install icon, apple-touch-icon
 *   public/icon-512.png          — PWA large icon / splash
 *   public/icon-maskable-512.png — Android adaptive icon (safe-zone padded)
 *   app/favicon.ico              — Browser tab (32×32 PNG wrapped in ICO)
 */

import sharp from 'sharp'
import { writeFileSync, readFileSync, rmSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const root  = resolve(__dir, '..')

// ── Brand background ─────────────────────────────────────────────────────────
const BG = { r: 13, g: 98, b: 89, alpha: 1 }   // #0D6259

// ── Leaf SVG — same design at any size ──────────────────────────────────────
const leafSVG = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <path d="M50 11 C50 11 80 16 81 44 C82 66 64 82 50 89 C36 82 18 66 19 44 C20 16 50 11 50 11Z"
        fill="white" opacity="0.96"/>
  <path d="M50 17 Q51 50 50 83"
        stroke="rgba(8,72,67,0.38)" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <path d="M50 28 Q40 33 33 43" stroke="rgba(8,72,67,0.30)" stroke-width="1.9" fill="none" stroke-linecap="round"/>
  <path d="M50 42 Q41 47 35 57" stroke="rgba(8,72,67,0.24)" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  <path d="M50 56 Q43 61 39 69" stroke="rgba(8,72,67,0.17)" stroke-width="1.3" fill="none" stroke-linecap="round"/>
  <path d="M50 28 Q60 33 67 43" stroke="rgba(8,72,67,0.30)" stroke-width="1.9" fill="none" stroke-linecap="round"/>
  <path d="M50 42 Q59 47 65 57" stroke="rgba(8,72,67,0.24)" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  <path d="M50 56 Q57 61 61 69" stroke="rgba(8,72,67,0.17)" stroke-width="1.3" fill="none" stroke-linecap="round"/>
</svg>`

// ── Render PNG ───────────────────────────────────────────────────────────────
async function makeIcon(size, outputPath, maskable = false) {
  // maskable: 12 % safe-zone (Google spec: content within centre 80 %)
  // any:       5 % padding — logo fills the icon assertively
  const padPct = maskable ? 0.12 : 0.05
  const pad    = Math.round(size * padPct)
  const inner  = size - pad * 2

  const bg = await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  }).png().toBuffer()

  await sharp(bg)
    .composite([{ input: Buffer.from(leafSVG(inner)), gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(outputPath)

  const bytes = readFileSync(outputPath).length
  console.log(`✓  ${outputPath.replace(root + '/', '')}  (${size}×${size}  ${(bytes/1024).toFixed(1)} KB)`)
}

// ── ICO wrapper (single 32×32 PNG frame) ────────────────────────────────────
function pngToIco(pngBuf) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)   // reserved
  header.writeUInt16LE(1, 2)   // type: icon
  header.writeUInt16LE(1, 4)   // one image

  const entry = Buffer.alloc(16)
  entry.writeUInt8(32, 0)      // width
  entry.writeUInt8(32, 1)      // height
  entry.writeUInt8(0, 2)       // colours (0 = truecolour)
  entry.writeUInt8(0, 3)       // reserved
  entry.writeUInt16LE(1, 4)    // colour planes
  entry.writeUInt16LE(32, 6)   // bits per pixel
  entry.writeUInt32LE(pngBuf.length, 8)  // image data size
  entry.writeUInt32LE(22, 12)  // image data offset (6 + 16)

  return Buffer.concat([header, entry, pngBuf])
}

// ── Generate ─────────────────────────────────────────────────────────────────

// 1. Favicon — resize existing icon-192-verde.png to 64×64 PNG
const iconSrc = resolve(root, 'public/icons/icon-192-verde.png')
const faviconPath = resolve(root, 'public/favicon.png')
await sharp(iconSrc)
  .resize(64, 64, { fit: 'contain', background: BG })
  .png()
  .toFile(faviconPath)
console.log(`✓  public/favicon.png  (64×64 PNG from icon-192-verde.png)`)
