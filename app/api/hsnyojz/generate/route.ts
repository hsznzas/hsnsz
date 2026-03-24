// HsnYojz - Generate API (for browser preview)
// Supports: URL, raw text, image (base64), or combinations

import { NextRequest, NextResponse } from 'next/server'
import { scrapeArticle } from '@/lib/hsnyojz/scraper'
import { summarizeArticle, summarizeFromText, summarizeFromImage, type NewsSummary } from '@/lib/hsnyojz/summarizer'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { url, text, imageBase64: userImageBase64 } = await request.json()

    if (!url && !text && !userImageBase64) {
      return NextResponse.json({ error: 'أرسل رابط أو نص أو صورة' }, { status: 400 })
    }

    let summary: NewsSummary
    let imageBase64: string | null = userImageBase64 || null

    if (url) {
      // LINK_ONLY or LINK_WITH_IMAGE
      const article = await scrapeArticle(url)

      if (!article.content && !article.title) {
        return NextResponse.json(
          { error: 'تعذّر استخراج محتوى من هذا الرابط — جرّب نسخ النص يدوياً واستخدم وضع "نص"' },
          { status: 400 }
        )
      }

      summary = await summarizeArticle(article.title, article.content, article.siteName)

      if (!imageBase64 && article.ogImage) {
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

    } else if (text) {
      // TEXT_ONLY or TEXT_WITH_IMAGE
      summary = await summarizeFromText(text)

    } else if (userImageBase64) {
      // IMAGE_ONLY — OCR via Claude Vision
      const rawBase64 = userImageBase64.replace(/^data:image\/\w+;base64,/, '')
      summary = await summarizeFromImage(rawBase64)

    } else {
      return NextResponse.json({ error: 'No valid input provided' }, { status: 400 })
    }

    let posterBase64: string | null = null
    try {
      const baseUrl = getBaseUrl(request)
      const renderRes = await fetch(`${baseUrl}/api/hsnyojz/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: { headline: summary.headline, bullets: summary.bullets },
          imageBase64,
        }),
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
