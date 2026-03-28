/**
 * Flag emoji → ISO 3166-1 alpha-2 country code → flagpedia CDN URLs.
 * Flag emojis are two regional indicator symbols (U+1F1E6–U+1F1FF),
 * each corresponding to a letter A–Z.
 */

export function flagEmojiToCountryCode(emoji: string): string | null {
  if (!emoji || emoji.length < 2) return null
  const codePoints = Array.from(emoji).map((c) => c.codePointAt(0) || 0)
  if (codePoints.length !== 2) return null
  const first = codePoints[0] - 0x1f1e6 + 65
  const second = codePoints[1] - 0x1f1e6 + 65
  if (first < 65 || first > 90 || second < 65 || second > 90) return null
  return String.fromCharCode(first, second).toLowerCase()
}

export function getWavingFlagUrl(countryCode: string, size = '256x192'): string {
  return `https://flagcdn.com/${size}/${countryCode}.png`
}

export function getFlatFlagUrl(countryCode: string, size = 'w160'): string {
  return `https://flagcdn.com/${size}/${countryCode}.png`
}

export async function fetchFlagAsBase64(
  flagEmoji: string,
  style: 'waving' | 'flat' = 'waving',
  size?: string,
): Promise<string | null> {
  const code = flagEmojiToCountryCode(flagEmoji)
  if (!code) return null

  const url =
    style === 'waving'
      ? getWavingFlagUrl(code, size || '256x192')
      : getFlatFlagUrl(code, size || 'w160')

  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buffer = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') || 'image/png'
    return `data:${contentType};base64,${Buffer.from(buffer).toString('base64')}`
  } catch {
    return null
  }
}
