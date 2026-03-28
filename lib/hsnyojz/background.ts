import sharp from 'sharp'
import type { PatternConfig } from './poster-config'

const DEFAULT_PATTERN: PatternConfig = {
  type: 'dots',
  color: '#d0d0d0',
  opacity: 0.3,
  scale: 1,
}

function buildPatternTileSvg(
  type: string,
  color: string,
  scale: number,
): { svg: string; tileW: number; tileH: number } | null {
  switch (type) {
    case 'dots': {
      const s = Math.round(20 * scale)
      const r = Math.max(1.5, s * 0.1)
      return {
        tileW: s,
        tileH: s,
        svg: `<svg width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg"><circle cx="${s / 2}" cy="${s / 2}" r="${r}" fill="${color}"/></svg>`,
      }
    }
    case 'waves': {
      const w = Math.round(100 * scale)
      const h = Math.round(20 * scale)
      const mid = h / 2
      const sw = Math.max(0.8, scale * 1)
      return {
        tileW: w,
        tileH: h,
        svg: `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><path d="M0 ${mid} Q${w / 4} 0 ${w / 2} ${mid} Q${(w * 3) / 4} ${h} ${w} ${mid}" fill="none" stroke="${color}" stroke-width="${sw}"/></svg>`,
      }
    }
    case 'topography': {
      const w = Math.round(200 * scale)
      const h = Math.round(120 * scale)
      const sw = Math.max(0.5, scale * 0.8)
      return {
        tileW: w,
        tileH: h,
        svg:
          `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">` +
          `<path d="M0 ${h * 0.12} C${w * 0.15} ${h * 0.02} ${w * 0.35} ${h * 0.28} ${w * 0.5} ${h * 0.14} C${w * 0.65} 0 ${w * 0.85} ${h * 0.22} ${w} ${h * 0.12}" fill="none" stroke="${color}" stroke-width="${sw}"/>` +
          `<path d="M0 ${h * 0.38} C${w * 0.12} ${h * 0.28} ${w * 0.28} ${h * 0.48} ${w * 0.48} ${h * 0.35} C${w * 0.68} ${h * 0.22} ${w * 0.88} ${h * 0.45} ${w} ${h * 0.38}" fill="none" stroke="${color}" stroke-width="${sw}"/>` +
          `<path d="M0 ${h * 0.62} C${w * 0.18} ${h * 0.5} ${w * 0.38} ${h * 0.72} ${w * 0.55} ${h * 0.58} C${w * 0.72} ${h * 0.44} ${w * 0.9} ${h * 0.68} ${w} ${h * 0.62}" fill="none" stroke="${color}" stroke-width="${sw}"/>` +
          `<path d="M0 ${h * 0.88} C${w * 0.14} ${h * 0.76} ${w * 0.32} ${h * 0.95} ${w * 0.52} ${h * 0.84} C${w * 0.72} ${h * 0.73} ${w * 0.86} ${h * 0.92} ${w} ${h * 0.88}" fill="none" stroke="${color}" stroke-width="${sw}"/>` +
          `</svg>`,
      }
    }
    case 'cross-dots': {
      const s = Math.round(24 * scale)
      const c = s / 2
      const arm = s * 0.22
      const sw = Math.max(0.5, scale * 0.7)
      return {
        tileW: s,
        tileH: s,
        svg: `<svg width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg"><line x1="${c}" y1="${c - arm}" x2="${c}" y2="${c + arm}" stroke="${color}" stroke-width="${sw}"/><line x1="${c - arm}" y1="${c}" x2="${c + arm}" y2="${c}" stroke="${color}" stroke-width="${sw}"/></svg>`,
      }
    }
    default:
      return null
  }
}

export async function createPatternBackground(
  width: number,
  height: number,
  pattern?: PatternConfig,
): Promise<string | null> {
  const p = pattern ?? DEFAULT_PATTERN
  if (p.type === 'none') return null

  const tile = buildPatternTileSvg(p.type, p.color, p.scale)
  if (!tile) return null

  const tiledSvg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="p" width="${tile.tileW}" height="${tile.tileH}" patternUnits="userSpaceOnUse">
        ${tile.svg.replace(/<\/?svg[^>]*>/g, '')}
      </pattern>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#p)" opacity="${p.opacity}"/>
  </svg>`

  const buffer = await sharp(Buffer.from(tiledSvg)).png().toBuffer()
  return `data:image/png;base64,${buffer.toString('base64')}`
}
