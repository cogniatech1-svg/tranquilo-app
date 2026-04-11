/**
 * Generates PWA icons using sharp (ships with Next.js).
 * Design: deep desaturated teal background + white olive-branch leaf with veins.
 */

import sharp from 'sharp'
import { mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const root  = resolve(__dir, '..')

mkdirSync(resolve(root, 'public/icons'), { recursive: true })

// ── Premium leaf SVG ──────────────────────────────────────────────────────
// Scaled to fit inside a `size × size` canvas with optional safe-zone padding.
const leafSVG = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">

  <!-- Main leaf shape: elongated, slightly asymmetric for a natural look -->
  <path d="M50 11
           C50 11 80 16 81 44
           C82 66 64 82 50 89
           C36 82 18 66 19 44
           C20 16 50 11 50 11Z"
        fill="white" opacity="0.96"/>

  <!-- Center vein — slightly curved, runs full leaf height -->
  <path d="M50 17 Q51 50 50 83"
        stroke="rgba(8,72,67,0.38)" stroke-width="2.4"
        fill="none" stroke-linecap="round"/>

  <!-- Primary left veins -->
  <path d="M50 28 Q40 33 33 43"
        stroke="rgba(8,72,67,0.30)" stroke-width="1.9"
        fill="none" stroke-linecap="round"/>
  <path d="M50 42 Q41 47 35 57"
        stroke="rgba(8,72,67,0.24)" stroke-width="1.6"
        fill="none" stroke-linecap="round"/>
  <path d="M50 56 Q43 61 39 69"
        stroke="rgba(8,72,67,0.17)" stroke-width="1.3"
        fill="none" stroke-linecap="round"/>

  <!-- Primary right veins -->
  <path d="M50 28 Q60 33 67 43"
        stroke="rgba(8,72,67,0.30)" stroke-width="1.9"
        fill="none" stroke-linecap="round"/>
  <path d="M50 42 Q59 47 65 57"
        stroke="rgba(8,72,67,0.24)" stroke-width="1.6"
        fill="none" stroke-linecap="round"/>
  <path d="M50 56 Q57 61 61 69"
        stroke="rgba(8,72,67,0.17)" stroke-width="1.3"
        fill="none" stroke-linecap="round"/>

  <!-- Subtle secondary veins for depth (512px only reads these; 192px they merge into the noise floor) -->
  <path d="M50 34 Q44 36 40 40"
        stroke="rgba(8,72,67,0.13)" stroke-width="1.1"
        fill="none" stroke-linecap="round"/>
  <path d="M50 34 Q56 36 60 40"
        stroke="rgba(8,72,67,0.13)" stroke-width="1.1"
        fill="none" stroke-linecap="round"/>
  <path d="M50 49 Q45 51 42 55"
        stroke="rgba(8,72,67,0.11)" stroke-width="1.0"
        fill="none" stroke-linecap="round"/>
  <path d="M50 49 Q55 51 58 55"
        stroke="rgba(8,72,67,0.11)" stroke-width="1.0"
        fill="none" stroke-linecap="round"/>
</svg>`

// ── Background colour ─────────────────────────────────────────────────────
// #0D6259 — desaturated from #0F766E: same hue, saturation down ~18 pts,
// brightness down ~4 pts. Richer and less neon, maintains deep-teal identity.
const BG = { r: 13, g: 98, b: 89, alpha: 1 }

async function makeIcon(size, outputPath, maskable = false) {
  // Maskable icons need 12% safe-zone padding on all sides
  const padding = maskable ? Math.round(size * 0.12) : Math.round(size * 0.07)
  const inner   = size - padding * 2

  const bg = await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  }).png().toBuffer()

  await sharp(bg)
    .composite([{ input: Buffer.from(leafSVG(inner)), gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(outputPath)

  const { width, height, size: fileSize } = await sharp(outputPath).metadata()
  console.log(`✓  ${outputPath.replace(root + '/', '')}  ${width}×${height}  (${(fileSize/1024).toFixed(1)} KB)`)
}

await makeIcon(192,  resolve(root, 'public/icons/icon-192.png'))
await makeIcon(512,  resolve(root, 'public/icons/icon-512.png'))
await makeIcon(512,  resolve(root, 'public/icons/icon-maskable-512.png'), true)
