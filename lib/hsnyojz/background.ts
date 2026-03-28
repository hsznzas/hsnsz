import sharp from 'sharp'

/**
 * Generate a dot-grid pattern background as a base64 PNG data URI.
 * Replicates the visual effect of:
 *   background-color: #ececec
 *   repeating-radial-gradient(circle at 0 0, transparent 0, #ececec 19px)
 *   repeating-linear-gradient(#d0d0d055, #d0d0d0)
 *   opacity: 0.3
 */
export async function createPatternBackground(
  width: number,
  height: number,
): Promise<string> {
  const tileSize = 19

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${width}" height="${height}" fill="#ececec"/>
    <defs>
      <radialGradient id="rg" cx="0" cy="0" r="${tileSize}" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="transparent"/>
        <stop offset="100%" stop-color="#ececec"/>
      </radialGradient>
      <pattern id="radialDots" x="0" y="0" width="${tileSize}" height="${tileSize}" patternUnits="userSpaceOnUse">
        <rect width="${tileSize}" height="${tileSize}" fill="#ececec"/>
        <rect width="${tileSize}" height="${tileSize}" fill="url(#rg)"/>
      </pattern>
      <linearGradient id="lg" x1="0" y1="0" x2="0" y2="${tileSize}" gradientUnits="userSpaceOnUse" spreadMethod="repeat">
        <stop offset="0%" stop-color="#d0d0d0" stop-opacity="0.33"/>
        <stop offset="100%" stop-color="#d0d0d0" stop-opacity="1"/>
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#radialDots)"/>
    <rect width="${width}" height="${height}" fill="url(#lg)" opacity="0.15"/>
    <rect width="${width}" height="${height}" fill="white" opacity="0.7"/>
  </svg>`

  const buffer = await sharp(Buffer.from(svg))
    .png()
    .toBuffer()

  return `data:image/png;base64,${buffer.toString('base64')}`
}
