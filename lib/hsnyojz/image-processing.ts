import sharp from 'sharp'

export async function createGlassHeroImages(
  imageBase64: string,
  innerSize: number,
  outerSize: number,
  blurAmount: number,
): Promise<{ innerBase64: string; outerBase64: string }> {
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')
  const imageBuffer = Buffer.from(base64Data, 'base64')

  const [innerBuffer, outerBuffer] = await Promise.all([
    sharp(imageBuffer)
      .resize(innerSize, innerSize, { fit: 'cover' })
      .png()
      .toBuffer(),
    sharp(imageBuffer)
      .resize(outerSize, outerSize, { fit: 'cover' })
      .blur(Math.max(1, blurAmount))
      .png()
      .toBuffer(),
  ])

  return {
    innerBase64: `data:image/png;base64,${innerBuffer.toString('base64')}`,
    outerBase64: `data:image/png;base64,${outerBuffer.toString('base64')}`,
  }
}

export async function createCurvedShadow(
  width: number,
  height: number,
  intensity: number = 0.45,
  blur: number = 10,
): Promise<string> {
  const patchW = width * 0.42
  const patchH = 18
  const patchY = height * 0.45
  const leftX = width * 0.06
  const rightX = width - patchW - width * 0.06

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="b" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="${blur}"/>
      </filter>
    </defs>
    <rect x="${leftX}" y="${patchY}" width="${patchW}" height="${patchH}" rx="3"
          fill="rgba(0,0,0,${intensity})" filter="url(#b)"
          transform="rotate(-3, ${leftX + patchW * 0.5}, ${patchY + patchH * 0.5})"/>
    <rect x="${rightX}" y="${patchY}" width="${patchW}" height="${patchH}" rx="3"
          fill="rgba(0,0,0,${intensity})" filter="url(#b)"
          transform="rotate(3, ${rightX + patchW * 0.5}, ${patchY + patchH * 0.5})"/>
  </svg>`

  const buffer = await sharp(Buffer.from(svg)).png().toBuffer()
  return `data:image/png;base64,${buffer.toString('base64')}`
}
