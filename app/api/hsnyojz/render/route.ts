import { NextRequest, NextResponse } from 'next/server'
import { fetchFlagAsBase64 } from '@/lib/hsnyojz/flags'
import {
  type PosterDesignConfig,
  DEFAULT_POSTER_CONFIG,
  DEFAULT_POSTER_CONFIG_4x5,
} from '@/lib/hsnyojz/poster-config'
import { getActiveConfig } from '@/lib/hsnyojz/active-config'
import { renderPageToPng } from '@/lib/hsnyojz/puppeteer'

export const maxDuration = 30
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      summary,
      imageBase64,
      avatarBase64,
      flagBase64: providedFlagBase64,
      flagEmoji,
      designConfig: userConfig,
      aspectRatio,
    } = body

    if (!summary?.headline) {
      return NextResponse.json(
        { error: 'Missing summary data' },
        { status: 400 },
      )
    }

    const ratio = aspectRatio || userConfig?.aspectRatio || '9:16'
    let cfg: PosterDesignConfig
    if (userConfig) {
      const base = ratio === '4:5' ? DEFAULT_POSTER_CONFIG_4x5 : DEFAULT_POSTER_CONFIG
      cfg = deepMergeConfig(base, userConfig)
    } else {
      const activeConfig = await getActiveConfig()
      const base = ratio === '4:5' ? DEFAULT_POSTER_CONFIG_4x5 : activeConfig
      cfg = { ...base }
    }

    let resolvedFlagBase64 = providedFlagBase64 || null
    if (!resolvedFlagBase64 && flagEmoji && avatarBase64) {
      try {
        resolvedFlagBase64 = await fetchFlagAsBase64(flagEmoji)
      } catch (err) {
        console.error('[HsnYojz Render] Flag resolution failed:', err)
      }
    }

    const origin = getOrigin(request)
    const renderUrl = `${origin}/hsnyojz/render-image`

    const pngBuffer = await renderPageToPng(
      renderUrl,
      {
        config: cfg,
        data: {
          headline: summary.headline,
          bullets: summary.bullets || [],
          sourceLabel: summary.sourceLabel,
          customNotes: summary.customNotes,
        },
        imageBase64: imageBase64 || null,
        avatarBase64: avatarBase64 || null,
        flagImageSrc: resolvedFlagBase64,
      },
      cfg.canvasWidth,
      cfg.canvasHeight,
    )

    return new NextResponse(new Uint8Array(pngBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `inline; filename="hsnyojz-${cfg.aspectRatio}.png"`,
      },
    })
  } catch (error) {
    console.error('[HsnYojz Render] Error:', error)
    return NextResponse.json(
      {
        error: `Render failed: ${error instanceof Error ? error.message : 'Unknown'}`,
      },
      { status: 500 },
    )
  }
}

function getOrigin(request: NextRequest): string {
  const url = new URL(request.url)
  if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    const proto = request.headers.get('x-forwarded-proto') || url.protocol.replace(':', '')
    const host = request.headers.get('host') || url.host
    return `${proto}://${host}`
  }
  return url.origin
}

function deepMergeConfig(
  base: PosterDesignConfig,
  overrides: Partial<PosterDesignConfig>,
): PosterDesignConfig {
  const result = JSON.parse(JSON.stringify(base))
  function merge(
    target: Record<string, unknown>,
    source: Record<string, unknown>,
  ) {
    for (const key of Object.keys(source)) {
      const val = source[key]
      if (
        val &&
        typeof val === 'object' &&
        !Array.isArray(val) &&
        typeof target[key] === 'object' &&
        target[key] !== null
      ) {
        merge(
          target[key] as Record<string, unknown>,
          val as Record<string, unknown>,
        )
      } else if (val !== undefined) {
        target[key] = val
      }
    }
  }
  merge(result, overrides as Record<string, unknown>)
  return result as PosterDesignConfig
}
