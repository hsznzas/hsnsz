import type { PosterDesignConfig } from './poster-config'

const ARABIC_CHAR =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/

export interface TextSegment {
  text: string
  lang: 'arabic' | 'english' | 'neutral'
}

/**
 * Split mixed Arabic/English text into renderable tokens.
 * Words stay isolated so mixed-language wrapping can break at spaces.
 */
export function splitByLanguage(text: string): TextSegment[] {
  const tokens = text.match(/\s+|[^\s]+/g) || []
  return tokens.map((token) => {
    if (/^\s+$/.test(token)) {
      return { text: token, lang: 'neutral' as const }
    }
    return {
      text: token,
      lang: ARABIC_CHAR.test(token) ? 'arabic' as const : 'english' as const,
    }
  })
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
