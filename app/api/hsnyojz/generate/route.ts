// HsnYojz - Generate API (for browser preview)
// Same pipeline as Telegram webhook but returns JSON with poster data

import { NextRequest, NextResponse } from 'next/server'
import { scrapeArticle } from '@/lib/hsnyojz/scraper'
import { summarizeArticle } from '@/lib/hsnyojz/summarizer'
import { generatePosterHtml } from '@/lib/hsnyojz/template'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 })
    }

    // Step 1: Scrape
    const article = await scrapeArticle(url)

    if (!article.content && !article.title) {
      return NextResponse.json({ error: 'Could not extract content from this URL' }, { status: 400 })
    }

    // Step 2: Fetch OG image as base64
    let imageBase64: string | null = null
    if (article.ogImage) {
      try {
        const imgRes = await fetch(article.ogImage, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
        })
        if (imgRes.ok) {
          const imgBuffer = await imgRes.arrayBuffer()
          const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
          imageBase64 = `data:${contentType};base64,${Buffer.from(imgBuffer).toString('base64')}`
        }
      } catch {
        // Skip image if fetch fails
      }
    }

    // Step 3: Summarize
    const summary = await summarizeArticle(article.title, article.content, article.siteName)

    // Step 4: Generate HTML
    const posterHtml = generatePosterHtml({
      summary,
      imageBase64,
      imageUrl: null,
    })

    // Step 5: Render to PNG
    let posterBase64: string | null = null
    try {
      const baseUrl = getBaseUrl(request)
      const renderRes = await fetch(`${baseUrl}/api/hsnyojz/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: posterHtml }),
      })

      if (renderRes.ok) {
        const arrayBuffer = await renderRes.arrayBuffer()
        posterBase64 = Buffer.from(arrayBuffer).toString('base64')
      }
    } catch (err) {
      console.error('[HsnYojz Generate] Render error:', err)
    }

    return NextResponse.json({
      summary: {
        headline: summary.headline,
        bullets: summary.bullets,
        sourceLabel: summary.sourceLabel,
      },
      article: {
        title: article.title,
        siteName: article.siteName,
        ogImage: article.ogImage,
      },
      posterBase64,
    })
  } catch (error) {
    console.error('[HsnYojz Generate] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    )
  }
}

function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get('host')
  const protocol = host?.includes('localhost') ? 'http' : 'https'
  return process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`
}
