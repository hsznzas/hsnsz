// HsnYojz - Generate API (for browser preview)
// Uses the engine layer for processing + rendering

import { NextRequest, NextResponse } from 'next/server'
import {
  processSources,
  type PosterConfig,
} from '@/lib/hsnyojz/engine'
import { resolveAvatar } from '@/lib/hsnyojz/avatars'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const {
      url,
      text,
      imageBase64: userImageBase64,
      style = 'default',
      bulletCount = 3,
      customFramingPrompt,
    } = await request.json()

    if (!url && !text && !userImageBase64) {
      return NextResponse.json({ error: 'أرسل رابط أو نص أو صورة' }, { status: 400 })
    }

    let sourceType: PosterConfig['sourceType'] = 'text'
    let rawContent: string | undefined

    if (url) {
      sourceType = 'link'
    } else if (userImageBase64 && !text) {
      sourceType = 'image'
      rawContent = userImageBase64
    } else if (text) {
      sourceType = 'text'
      rawContent = text
    }

    const config: PosterConfig = {
      sourceUrl: url || undefined,
      sourceType,
      rawContent,
      heroImageBase64: userImageBase64 || null,
      style,
      bulletCount,
      customFramingPrompt,
    }

    const processed = await processSources(config)

    // Resolve avatar
    const avatarBase64 = await resolveAvatar(processed.entityName, processed.entityOrg)
    const effectiveFlag = avatarBase64 ? processed.flagEmoji : null

    // Render poster
    let posterBase64: string | null = null
    try {
      const baseUrl = getBaseUrl(request)
      const renderRes = await fetch(`${baseUrl}/api/hsnyojz/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: {
            headline: processed.headline,
            bullets: processed.bullets,
            sourceLabel: processed.sourceLabel,
          },
          imageBase64: processed.heroImageBase64,
          avatarBase64,
          flagEmoji: effectiveFlag,
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
        headline: processed.headline,
        bullets: processed.bullets,
        sourceLabel: processed.sourceLabel,
        entityName: processed.entityName,
        entityOrg: processed.entityOrg,
        flagEmoji: processed.flagEmoji,
      },
      posterBase64,
    })
  } catch (error) {
    console.error('[HsnYojz Generate] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 },
    )
  }
}

function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get('host')
  const protocol = host?.includes('localhost') ? 'http' : 'https'
  return process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`
}
