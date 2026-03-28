// Arabic text pre-processing for satori rendering.
// Satori's font engine doesn't apply OpenType GSUB shaping rules,
// so we convert Arabic characters to Presentation Forms-B (pre-shaped
// connected glyphs) and apply Unicode bidi reordering for visual LTR output.

// @ts-expect-error -- arabic-reshaper has no type declarations
import ArabicReshaper from 'arabic-reshaper'
// @ts-expect-error -- bidi-js has no type declarations
import bidiFactory from 'bidi-js'

const bidi = bidiFactory()

const ARABIC_RE = /[\u0600-\u06FF\uFE70-\uFEFF\u0750-\u077F\u08A0-\u08FF]/

function isArabicWord(word: string): boolean {
  return ARABIC_RE.test(word)
}

function applyBidiReorder(text: string): string {
  const embeddingLevels = bidi.getEmbeddingLevels(text, 'rtl')
  const flips = bidi.getReorderSegments(text, embeddingLevels)
  const chars = Array.from(text)
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
 * - Consecutive Arabic words are reshaped as a group so letter forms
 *   (initial/medial/final) are computed with full context, then split
 *   back into individual words for per-word flex layout.
 * - Consecutive Latin words are grouped together (e.g. "Vision Pro" stays as one unit)
 * - Returns metadata so the caller can assign per-word font (Manal vs SourceSerif)
 */
export function processArabicWords(text: string): HeadlineWord[] {
  const rawWords = text.split(/\s+/).filter(Boolean)
  const segments: HeadlineWord[] = []

  let arabicBuffer: string[] = []
  let latinBuffer: string[] = []

  const flushArabic = () => {
    if (arabicBuffer.length === 0) return
    const joined = arabicBuffer.join(' ')
    const reshaped = ArabicReshaper.convertArabic(joined)
    const reshapedWords = reshaped.split(' ').filter(Boolean)
    for (const w of reshapedWords) {
      segments.push({ text: applyBidiReorder(w), isLatin: false })
    }
    arabicBuffer = []
  }

  const flushLatin = () => {
    if (latinBuffer.length === 0) return
    segments.push({ text: latinBuffer.join(' '), isLatin: true })
    latinBuffer = []
  }

  for (const word of rawWords) {
    if (isArabicWord(word)) {
      flushLatin()
      arabicBuffer.push(word)
    } else {
      flushArabic()
      latinBuffer.push(word)
    }
  }
  flushArabic()
  flushLatin()

  return segments
}

/**
 * Process text into script runs for bullet rendering.
 * Unlike processArabicWords which splits Arabic into individual words,
 * this keeps consecutive Arabic words as a single contiguous run.
 * This prevents English/number text from being forced onto a new line
 * in Satori's flex-wrap layout (fewer, wider flex items wrap more naturally).
 */
export function processArabicRuns(text: string): HeadlineWord[] {
  const rawWords = text.split(/\s+/).filter(Boolean)
  const segments: HeadlineWord[] = []

  let arabicBuffer: string[] = []
  let latinBuffer: string[] = []

  const flushArabic = () => {
    if (arabicBuffer.length === 0) return
    const joined = arabicBuffer.join(' ')
    const reshaped = ArabicReshaper.convertArabic(joined)
    segments.push({ text: applyBidiReorder(reshaped), isLatin: false })
    arabicBuffer = []
  }

  const flushLatin = () => {
    if (latinBuffer.length === 0) return
    segments.push({ text: latinBuffer.join(' '), isLatin: true })
    latinBuffer = []
  }

  for (const word of rawWords) {
    if (isArabicWord(word)) {
      flushLatin()
      arabicBuffer.push(word)
    } else {
      flushArabic()
      latinBuffer.push(word)
    }
  }
  flushArabic()
  flushLatin()

  return segments
}
