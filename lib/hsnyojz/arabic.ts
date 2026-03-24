// Arabic text pre-processing for satori rendering.
// Satori's font engine doesn't apply OpenType GSUB shaping rules,
// so we convert Arabic characters to Presentation Forms-B (pre-shaped
// connected glyphs) and apply Unicode bidi reordering for visual LTR output.

// @ts-expect-error -- arabic-reshaper has no type declarations
import ArabicReshaper from 'arabic-reshaper'
import bidiFactory from 'bidi-js'

const bidi = bidiFactory()

const ARABIC_RE = /[\u0600-\u06FF\uFE70-\uFEFF\u0750-\u077F\u08A0-\u08FF]/

function isArabicWord(word: string): boolean {
  return ARABIC_RE.test(word)
}

function applyBidiReorder(text: string): string {
  const embeddingLevels = bidi.getEmbeddingLevels(text, 'rtl')
  const flips = bidi.getReorderSegments(text, embeddingLevels)
  const chars = [...text]
  for (const [start, end] of flips) {
    let i = start
    let j = end
    while (i < j) {
      ;[chars[i], chars[j]] = [chars[j], chars[i]]
      i++
      j--
    }
  }
  return chars.join('')
}

/**
 * Process a single line of Arabic text: reshape letters + bidi reorder.
 * Use for short text guaranteed not to wrap (bullets, brand, date, labels).
 */
export function processArabicLine(text: string): string {
  const reshaped = ArabicReshaper.convertArabic(text)
  return applyBidiReorder(reshaped)
}

export interface HeadlineWord {
  text: string
  isLatin: boolean
}

/**
 * Process a headline into word segments for flex rendering.
 * - Arabic words: reshaped + bidi-reversed individually
 * - Consecutive Latin words are grouped together (e.g. "Vision Pro" stays as one unit)
 * - Returns metadata so the caller can assign per-word font (Manal vs SourceSerif)
 */
export function processArabicWords(text: string): HeadlineWord[] {
  const rawWords = text.split(/\s+/).filter(Boolean)
  const segments: HeadlineWord[] = []

  let latinBuffer: string[] = []

  const flushLatin = () => {
    if (latinBuffer.length > 0) {
      segments.push({ text: latinBuffer.join(' '), isLatin: true })
      latinBuffer = []
    }
  }

  for (const word of rawWords) {
    if (isArabicWord(word)) {
      flushLatin()
      const reshaped = ArabicReshaper.convertArabic(word)
      segments.push({ text: applyBidiReorder(reshaped), isLatin: false })
    } else {
      latinBuffer.push(word)
    }
  }
  flushLatin()

  return segments
}
