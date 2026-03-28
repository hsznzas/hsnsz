import 'server-only'
import { readFile } from 'fs/promises'
import { join } from 'path'
import type { PosterDesignConfig } from './poster-config'
import { PosterCanvas } from './poster-view'

export interface PosterRenderData {
  headline: string
  bullets: string[]
  sourceLabel?: string
  customNotes?: string | null
  imageBase64?: string | null
  avatarBase64?: string | null
  flagBase64?: string | null
  config: PosterDesignConfig
}

interface FontDef {
  file: string
  family: string
  weight: number
  format: string
  mime: string
}

const FONT_DEFS: FontDef[] = [
  { file: 'ah-manal-light.ttf', family: 'Manal', weight: 300, format: 'truetype', mime: 'font/ttf' },
  { file: 'ah-manal-medium.ttf', family: 'Manal', weight: 400, format: 'truetype', mime: 'font/ttf' },
  { file: 'ah-manal-bold.ttf', family: 'Manal', weight: 700, format: 'truetype', mime: 'font/ttf' },
  { file: 'ah-manal-black.ttf', family: 'Manal', weight: 900, format: 'truetype', mime: 'font/ttf' },
  { file: 'source-serif-4-regular.ttf', family: 'Source Serif 4', weight: 400, format: 'truetype', mime: 'font/ttf' },
  { file: 'source-serif-4-semibold.ttf', family: 'Source Serif 4', weight: 600, format: 'truetype', mime: 'font/ttf' },
  { file: 'source-serif-4-bold.ttf', family: 'Source Serif 4', weight: 700, format: 'truetype', mime: 'font/ttf' },
  { file: 'itfRawasiArabic-Regular.otf', family: 'Rawasi Arabic', weight: 400, format: 'opentype', mime: 'font/otf' },
]

let fontCssCache: string | null = null

async function getFontFaceCSS(): Promise<string> {
  if (fontCssCache) return fontCssCache

  const fontDir = join(process.cwd(), 'public', 'fonts')
  const rules = await Promise.all(
    FONT_DEFS.map(async (def) => {
      const buf = await readFile(join(fontDir, def.file))
      const b64 = buf.toString('base64')
      return `@font-face{font-family:'${def.family}';src:url(data:${def.mime};base64,${b64}) format('${def.format}');font-weight:${def.weight};font-style:normal}`
    }),
  )

  fontCssCache = rules.join('\n')
  return fontCssCache
}

export async function buildPosterHtml(data: PosterRenderData): Promise<string> {
  const fontCSS = await getFontFaceCSS()
  const { renderToStaticMarkup } = await import('react-dom/server')
  const posterMarkup = renderToStaticMarkup(
    PosterCanvas({
      config: data.config,
      data: {
        headline: data.headline,
        bullets: data.bullets,
        sourceLabel: data.sourceLabel,
        customNotes: data.customNotes,
      },
      imageBase64: data.imageBase64 || null,
      avatarBase64: data.avatarBase64 || null,
      flagImageSrc: data.flagBase64 || null,
      rootId: 'poster',
    }),
  )

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{margin:0;padding:0;background:transparent}
${fontCSS}
</style>
</head>
<body>
${posterMarkup}
</body>
</html>`
}
