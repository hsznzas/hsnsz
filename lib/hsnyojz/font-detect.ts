import type { PosterDesignConfig } from './poster-config'

const ARABIC_CHAR =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/

export interface TextSegment {
  text: string
  lang: 'arabic' | 'english' | 'neutral'
}

const INVISIBLE_CHARS =
  /[\u200B\u200C\u200D\u200E\u200F\u2028\u2029\u202A-\u202E\u2066-\u2069\uFEFF]/g

// Tashkeel / harakat: Fathatan through Sukun (U+064B-U+0652).
// Stripped because display fonts (e.g. Manal) have GSUB rules that
// produce zero-width glyphs for Alef + Tanween Fath, making "اً"
// disappear entirely. Stripping tashkeel is standard for Arabic
// headline / poster typography and does not affect readability.
const ARABIC_TASHKEEL = /[\u064B-\u0652]/g

/**
 * Split mixed Arabic/English text into renderable tokens.
 * Split on script changes too, so strings like "الـ11" render
 * Arabic letters and ASCII digits with their intended fonts while
 * keeping grouped numbers like "5,800" or "SAR 2,976" intact.
 */
export function splitByLanguage(text: string): TextSegment[] {
  const cleaned = text.replace(INVISIBLE_CHARS, '').replace(ARABIC_TASHKEEL, '')
  const arabicSource = ARABIC_CHAR.source.replace(/^\[|\]$/g, '')
  const tokenRe = new RegExp(
    [
      '\\s+',
      `[${arabicSource}]+`,
      '[$€£¥₹]?[A-Za-z0-9]+(?:[.,:%/+\\-][A-Za-z0-9]+)*[%$€£¥₹]?',
      '.',
    ].join('|'),
    'g',
  )

  const tokens = cleaned.match(tokenRe) || []
  const raw: TextSegment[] = tokens.map((token) => {
    if (/^\s+$/.test(token)) {
      return { text: token, lang: 'neutral' as const }
    }
    if (ARABIC_CHAR.test(token)) {
      return { text: token, lang: 'arabic' as const }
    }
    if (/[A-Za-z0-9]/.test(token)) {
      return { text: token, lang: 'english' as const }
    }
    return { text: token, lang: 'neutral' as const }
  })

  const merged: TextSegment[] = []
  let i = 0
  while (i < raw.length) {
    if (raw[i].lang === 'english') {
      let combined = raw[i].text
      let j = i + 1
      while (j < raw.length) {
        if (
          raw[j].lang === 'neutral' && /^\s+$/.test(raw[j].text) &&
          j + 1 < raw.length && raw[j + 1].lang === 'english'
        ) {
          combined += raw[j].text + raw[j + 1].text
          j += 2
        } else {
          break
        }
      }
      merged.push({ text: combined, lang: 'english' })
      i = j
    } else {
      merged.push(raw[i])
      i++
    }
  }
  return merged
}

export function detectLanguage(text: string): 'arabic' | 'english' {
  const arabicRe = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g
  const arabicChars = (text.match(arabicRe) || []).length
  const totalChars = text.replace(/\s/g, '').length
  if (totalChars === 0) return 'arabic'
  return arabicChars / totalChars > 0.3 ? 'arabic' : 'english'
}

export function getFontConfig(
  text: string,
  config: PosterDesignConfig,
  element: 'headline' | 'bullets',
) {
  const lang = detectLanguage(text)
  const fontFamily =
    lang === 'arabic' ? config.fonts.arabic : config.fonts.english
  const section = config[element][lang]
  return { fontFamily, ...section }
}
