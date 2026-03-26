import sharp from 'sharp'

const W = 1080
const H = 1920
const HERO_H = 860

// The white scrim fades from fully opaque at top → transparent by this y
const WHITE_FADE_END_Y = 535

/**
 * Renders the CSS pattern texture as raw RGB pixels (1080x1920).
 * Full strength across the whole canvas — a separate white scrim layer
 * handles the transition from near-white at top to visible pattern below.
 */
function generatePatternPixels(): Buffer {
  const pixels = Buffer.alloc(W * H * 3)
  const BG = 0xdd
  const LIN = 0xc5
  const PAGE = 0xf9

  for (let y = 0; y < H; y++) {
    const linAlpha = 0.33 + 0.67 * (y / (H - 1))
    const afterLin = LIN * linAlpha + BG * (1 - linAlpha)

    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 3
      const d = Math.sqrt(x * x + y * y)
      const radAlpha = (d % 9) / 9
      const composited = BG * radAlpha + afterLin * (1 - radAlpha)
      const v = Math.round(composited * 0.8 + PAGE * 0.2)
      pixels[idx] = v
      pixels[idx + 1] = v
      pixels[idx + 2] = v
    }
  }

  return pixels
}

/**
 * Creates a white-to-transparent gradient PNG (1080 x WHITE_FADE_END_Y).
 * Compositing this on top of the pattern makes it appear near-white at the
 * top of the poster, smoothly revealing the full pattern below.
 */
async function generateWhiteScrim(): Promise<Buffer> {
  const rgba = Buffer.alloc(W * WHITE_FADE_END_Y * 4)
  const PAGE = 0xf9

  for (let y = 0; y < WHITE_FADE_END_Y; y++) {
    // Ease out: slow at start, faster toward the end
    const t = y / WHITE_FADE_END_Y
    const alpha = Math.round(255 * Math.max(0, 1 - t * t))

    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4
      rgba[idx] = PAGE
      rgba[idx + 1] = PAGE
      rgba[idx + 2] = PAGE
      rgba[idx + 3] = alpha
    }
  }

  return sharp(rgba, {
    raw: { width: W, height: WHITE_FADE_END_Y, channels: 4 },
  }).png().toBuffer()
}

/**
 * Build the full 1080x1920 poster background:
 *   1. Pattern texture (full strength)
 *   2. White scrim on top (near-white at top → transparent by ~980px)
 *   3. Hero image on top (sharp at top, Gaussian blur toward bottom,
 *      alpha-fading to transparent so the layers below show through)
 *
 * Returns a data:image/jpeg;base64 URI ready for satori <img>.
 */
export interface HeroOptions {
  heroHeight?: number
  blurStart?: number
  blurEnd?: number
  fadeStart?: number
  fadeEnd?: number
}

export async function generateBackground(heroDataUri?: string | null, heroOpts?: HeroOptions): Promise<string> {
  const [patternPixels, scrimPng] = await Promise.all([
    Promise.resolve(generatePatternPixels()),
    generateWhiteScrim(),
  ])

  if (!heroDataUri) {
    const buf = await sharp(patternPixels, {
      raw: { width: W, height: H, channels: 3 },
    })
      .composite([{ input: scrimPng, top: 0, left: 0, blend: 'over' as const }])
      .jpeg({ quality: 88 })
      .toBuffer()
    return `data:image/jpeg;base64,${buf.toString('base64')}`
  }

  const heroH = heroOpts?.heroHeight ?? HERO_H
  const base64 = heroDataUri.replace(/^data:image\/[^;]+;base64,/, '')
  const inputBuf = Buffer.from(base64, 'base64')

  const resized = sharp(inputBuf).resize(W, heroH, {
    fit: 'cover',
    position: 'centre',
  })

  const [originalRaw, blurredRaw] = await Promise.all([
    resized.clone().removeAlpha().raw().toBuffer(),
    resized.clone().blur(40).removeAlpha().raw().toBuffer(),
  ])

  const BLUR_START = heroOpts?.blurStart ?? 0.35
  const BLUR_END = heroOpts?.blurEnd ?? 0.80
  const FADE_START = heroOpts?.fadeStart ?? 0.58
  const FADE_END = heroOpts?.fadeEnd ?? 1.0

  const heroRGBA = Buffer.alloc(W * heroH * 4)

  for (let y = 0; y < heroH; y++) {
    const yf = y / heroH

    let blurT = 0
    if (yf > BLUR_START) {
      blurT = Math.min(1, (yf - BLUR_START) / (BLUR_END - BLUR_START))
    }

    let alpha = 255
    if (yf > FADE_START) {
      alpha = Math.round(255 * Math.max(0, 1 - (yf - FADE_START) / (FADE_END - FADE_START)))
    }

    for (let x = 0; x < W; x++) {
      const src = (y * W + x) * 3
      const dst = (y * W + x) * 4
      heroRGBA[dst] = Math.round(originalRaw[src] * (1 - blurT) + blurredRaw[src] * blurT)
      heroRGBA[dst + 1] = Math.round(originalRaw[src + 1] * (1 - blurT) + blurredRaw[src + 1] * blurT)
      heroRGBA[dst + 2] = Math.round(originalRaw[src + 2] * (1 - blurT) + blurredRaw[src + 2] * blurT)
      heroRGBA[dst + 3] = alpha
    }
  }

  const heroPng = await sharp(heroRGBA, {
    raw: { width: W, height: heroH, channels: 4 },
  }).png().toBuffer()

  const result = await sharp(patternPixels, {
    raw: { width: W, height: H, channels: 3 },
  })
    .composite([
      // Layer 1: white scrim makes the upper canvas near-white
      { input: scrimPng, top: 0, left: 0, blend: 'over' as const },
      // Layer 2: hero image fades through the scrim zone into the pattern
      { input: heroPng, top: 0, left: 0, blend: 'over' as const },
    ])
    .jpeg({ quality: 88 })
    .toBuffer()

  return `data:image/jpeg;base64,${result.toString('base64')}`
}
