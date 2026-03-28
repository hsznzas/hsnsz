import { readFile } from 'fs/promises'
import { join } from 'path'

interface FontEntry {
  name: string
  data: ArrayBuffer
  weight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
  style: 'normal'
}

let fontCache: FontEntry[] | null = null

async function loadFont(filename: string): Promise<ArrayBuffer> {
  const fontPath = join(process.cwd(), 'public', 'fonts', filename)
  const buffer = await readFile(fontPath)
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
}

export async function getManalFonts(): Promise<FontEntry[]> {
  if (fontCache) return fontCache

  const [manalLight, manalMedium, manalBold, manalBlack, serifRegular, serifSemiBold, serifBold, rawasiRegular] =
    await Promise.all([
      loadFont('ah-manal-light.ttf'),
      loadFont('ah-manal-medium.ttf'),
      loadFont('ah-manal-bold.ttf'),
      loadFont('ah-manal-black.ttf'),
      loadFont('source-serif-4-regular.ttf'),
      loadFont('source-serif-4-semibold.ttf'),
      loadFont('source-serif-4-bold.ttf'),
      loadFont('itfRawasiArabic-Regular.otf'),
    ])

  fontCache = [
    { name: 'Manal', data: manalLight, weight: 300, style: 'normal' },
    { name: 'Manal', data: manalMedium, weight: 400, style: 'normal' },
    { name: 'Manal', data: manalBold, weight: 700, style: 'normal' },
    { name: 'Manal', data: manalBlack, weight: 900, style: 'normal' },
    { name: 'SourceSerif', data: serifRegular, weight: 400, style: 'normal' },
    { name: 'SourceSerif', data: serifSemiBold, weight: 600, style: 'normal' },
    { name: 'SourceSerif', data: serifBold, weight: 700, style: 'normal' },
    { name: 'RawasiArabic', data: rawasiRegular, weight: 400, style: 'normal' },
  ]

  return fontCache
}
