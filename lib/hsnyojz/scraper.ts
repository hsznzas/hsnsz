// HsnYojz - Article Scraper
// Extracts title, content text, and OG image from a news URL

export interface ScrapedArticle {
  title: string
  content: string
  ogImage: string | null
  siteName: string | null
  url: string
}

export async function scrapeArticle(url: string): Promise<ScrapedArticle> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ar,en;q=0.9',
      },
      redirect: 'follow',
    })

    if (!res.ok) {
      throw new Error(`Failed to fetch URL: ${res.status}`)
    }

    const html = await res.text()

    // Extract meta tags
    const title = extractMeta(html, 'og:title') || extractTitle(html) || ''
    const ogImage = extractMeta(html, 'og:image') || extractMeta(html, 'twitter:image') || null
    const siteName = extractMeta(html, 'og:site_name') || null

    // Extract article content
    const content = extractContent(html)

    return { title, content, ogImage, siteName, url }
  } catch (error) {
    console.error('[HsnYojz Scraper] Error:', error)
    throw new Error(`Failed to scrape article: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

function extractMeta(html: string, property: string): string | null {
  // Try og/twitter meta tags
  const patterns = [
    new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${property}["']`, 'i'),
    new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${property}["']`, 'i'),
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match) return match[1]
  }
  return null
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return match ? match[1].trim() : null
}

function extractContent(html: string): string {
  // Remove script, style, nav, header, footer tags
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')

  // Try to find article body
  const articleMatch = cleaned.match(/<article[\s\S]*?<\/article>/i)
  if (articleMatch) {
    cleaned = articleMatch[0]
  }

  // Extract text from paragraphs
  const paragraphs: string[] = []
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi
  let match
  while ((match = pRegex.exec(cleaned)) !== null) {
    const text = match[1]
      .replace(/<[^>]+>/g, '') // Strip inner HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()

    if (text.length > 30) {
      paragraphs.push(text)
    }
  }

  return paragraphs.join('\n\n')
}
