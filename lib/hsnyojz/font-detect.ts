import type { PosterDesignConfig } from './poster-config'

const ARABIC_CHAR =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/

export interface TextSegment {
  text: string
  lang: 'arabic' | 'english'
}

/**
 * Split mixed Arabic/English text into contiguous language segments.
 * Spaces and punctuation inherit the language of the surrounding text.
 */
export function splitByLanguage(text: string): TextSegment[] {
  const segments: TextSegment[] = []
  let currentLang: 'arabic' | 'english' | null = null
  let buf = ''

  for (const char of Array.from(text)) {
    const isArabic = ARABIC_CHAR.test(char)
    const isNeutral = /[\s.,،؛:!?؟\-()\[\]%\u2022•"'`@#$&*+=<>\/\\|~^{}٠-٩]/.test(char)

    let charLang: 'arabic' | 'english'
    if (isNeutral) {
      charLang = currentLang || 'arabic'
    } else if (isArabic) {
      charLang = 'arabic'
    } else {
      charLang = 'english'
    }

    if (currentLang === null) {
      currentLang = charLang
      buf = char
    } else if (charLang === currentLang) {
      buf += char
    } else {
      if (buf.trim()) segments.push({ text: buf, lang: currentLang })
      else if (buf && segments.length > 0) segments[segments.length - 1].text += buf
      currentLang = charLang
      buf = char
    }
  }

  if (buf.trim() || (buf && segments.length > 0)) {
    segments.push({ text: buf, lang: currentLang || 'arabic' })
  }

  return segments
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
