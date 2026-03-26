// HsnYojz - Satori + Resvg Poster Renderer (Masthead Editorial Design)
// POST: receives { summary, imageBase64, avatarBase64, flagEmoji }, returns 1080x1920 PNG

import { NextRequest, NextResponse } from 'next/server'
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import { getManalFonts } from '@/lib/hsnyojz/fonts'
import { processArabicLine, processArabicWords } from '@/lib/hsnyojz/arabic'
import { generateBackground } from '@/lib/hsnyojz/background'

export const maxDuration = 30
export const dynamic = 'force-dynamic'

type SatoriNode = {
  type: string
  props: Record<string, unknown>
}

function el(
  type: string,
  props: Record<string, unknown>,
  ...children: (string | SatoriNode | null | false | undefined)[]
): SatoriNode {
  const filtered = children.filter((c): c is string | SatoriNode => c != null && c !== false)

  // Strip undefined style values — Satori doesn't handle them like React does
  if (props.style && typeof props.style === 'object') {
    const raw = props.style as Record<string, unknown>
    const clean: Record<string, unknown> = {}
    for (const k of Object.keys(raw)) {
      if (raw[k] !== undefined) clean[k] = raw[k]
    }
    props = { ...props, style: clean }
  }

  return {
    type,
    props: {
      ...props,
      children: filtered.length === 0 ? undefined : filtered.length === 1 ? filtered[0] : filtered,
    },
  }
}

function getArabicDate(): string {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
  const months = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
  ]
  const now = new Date()
  const toArabic = (n: number) =>
    String(n).split('').map((d) => arabicDigits[parseInt(d)]).join('')
  return `${toArabic(now.getDate())} ${months[now.getMonth()]} ${toArabic(now.getFullYear())}`
}

const DEFAULTS = {
  sidePadding: 91,
  headlineWordGap: 19,
  headlineLetterSpacing: -2.5,
  headlineLineHeight: 0.85,
  headlineTextScale: 100,
  bulletWordGap: 10,
  bulletLetterSpacing: 0,
  bulletLineHeight: 0.7,
  bulletTextScale: 123,
  bulletLineSpacing: 96,
  sourceSpacing: 38,
  sourceTextScale: 200,
  footerBottom: 200,
  contentTop: 607,
  headlineBulletsGap: 94,
  avatarSize: 108,
  avatarBorderRadius: 67,
  avatarGap: 25,
  avatarOffsetY: 66,
  flagSize: 32,
  flagOffsetBottom: -20,
  flagOffsetHorizontal: 0,
  flagEmojiSize: 28,
  dateTop: 126,
  dateLeft: 97,
  dateFontSize: 44,
  headlineShadowX: 3,
  headlineShadowY: 3,
  headlineShadowBlur: 3,
  headlineShadowOpacity: 97,
  bulletShadowX: 1,
  bulletShadowY: 1,
  bulletShadowBlur: 1,
  bulletShadowOpacity: 67,
  sourceShadowX: 0,
  sourceShadowY: 0,
  sourceShadowBlur: 0,
  sourceShadowOpacity: 0,
  dateShadowX: 3,
  dateShadowY: 3,
  dateShadowBlur: 14,
  dateShadowOpacity: 33,
}

const COLOR_DEFAULTS = {
  headlineColor: '#000000',
  bulletColor: '#2a3d66',
  sourceTagColor: '#5a6061',
  dateColor: '#757c7d',
  dateOpacity: 70,
  headlineShadowColor: '#ffffff',
  bulletShadowColor: '#ffffff',
  sourceShadowColor: '#ffffff',
  dateShadowColor: '#000000',
}

export type StyleOverrides = Partial<typeof DEFAULTS>
export type ColorOverrides = Partial<typeof COLOR_DEFAULTS>

const ARABIC_HEADLINE_SIZE = 96
const ENGLISH_HEADLINE_SIZE = 59
const ARABIC_BULLET_SIZE = 55
const ENGLISH_BULLET_SIZE = 33

function buildTextShadow(x: number, y: number, blur: number, color: string, opacity: number): string | undefined {
  if (opacity === 0) return undefined
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)
  return `${x}px ${y}px ${blur}px rgba(${r},${g},${b},${opacity / 100})`
}

// ── Avatar + Flag Builder ──

interface AvatarParams {
  size: number
  borderRadius: number
  flagSize: number
  flagOffsetBottom: number
  flagOffsetHorizontal: number
  flagEmojiSize: number
}

function buildAvatarBlock(avatarBase64: string, flagEmoji: string | null, ap: AvatarParams): SatoriNode {
  const avatarImage = el('img', {
    src: avatarBase64,
    style: {
      width: ap.size,
      height: ap.size,
      objectFit: 'cover',
      borderRadius: ap.borderRadius,
    },
  })

  // Flag centered horizontally at bottom border, with adjustable offsets
  const flagLeft = Math.round((ap.size - ap.flagSize) / 2) + ap.flagOffsetHorizontal

  const flagOverlay = flagEmoji
    ? el(
        'div',
        {
          style: {
            display: 'flex',
            width: ap.flagSize,
            height: ap.flagSize,
            borderRadius: '50%',
            background: 'white',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'absolute',
            bottom: ap.flagOffsetBottom,
            left: flagLeft,
          },
        },
        el('span', {
          style: {
            display: 'flex',
            fontSize: ap.flagEmojiSize,
          },
        }, flagEmoji),
      )
    : null

  return el(
    'div',
    {
      style: {
        display: 'flex',
        position: 'relative',
        width: ap.size,
        height: ap.size,
        flexShrink: 0,
        borderRadius: ap.borderRadius,
        border: '2px solid rgba(0,0,0,0.08)',
        overflow: 'visible',
      },
    },
    avatarImage,
    flagOverlay,
  )
}

function buildPoster(
  headline: string,
  bullets: string[],
  bgDataUri: string,
  sourceLabel?: string,
  overrides?: StyleOverrides,
  avatarBase64?: string | null,
  flagEmoji?: string | null,
  customNotes?: string | null,
  colorOverrides?: ColorOverrides,
): SatoriNode {
  const s = { ...DEFAULTS, ...overrides }
  const c = { ...COLOR_DEFAULTS, ...colorOverrides }
  const SIDE_PADDING = s.sidePadding


  const hlScale = s.headlineTextScale / 100
  const blScale = s.bulletTextScale / 100
  const scaledArabicHL = Math.round(ARABIC_HEADLINE_SIZE * hlScale)
  const scaledEnglishHL = Math.round(ENGLISH_HEADLINE_SIZE * hlScale)
  const scaledArabicBL = Math.round(ARABIC_BULLET_SIZE * blScale)
  const scaledEnglishBL = Math.round(ENGLISH_BULLET_SIZE * blScale)

  const hlShadow = buildTextShadow(s.headlineShadowX, s.headlineShadowY, s.headlineShadowBlur, c.headlineShadowColor, s.headlineShadowOpacity)
  const blShadow = buildTextShadow(s.bulletShadowX, s.bulletShadowY, s.bulletShadowBlur, c.bulletShadowColor, s.bulletShadowOpacity)
  const srcShadow = buildTextShadow(s.sourceShadowX, s.sourceShadowY, s.sourceShadowBlur, c.sourceShadowColor, s.sourceShadowOpacity)
  const dtShadow = buildTextShadow(s.dateShadowX, s.dateShadowY, s.dateShadowBlur, c.dateShadowColor, s.dateShadowOpacity)

  // ── Full-canvas background ──

  const bgImage = el('img', {
    src: bgDataUri,
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: 1080,
      height: 1920,
      objectFit: 'cover',
    },
  })

  // ── Title Zone ──

  const categoryTag = sourceLabel
    ? el(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'row-reverse',
            alignItems: 'center',
            gap: 12,
            marginBottom: 16,
          },
        },
        el('span', {
          style: {
            display: 'flex',
            background: 'rgba(240,240,240,0.7)',
            padding: `2px ${s.sourceSpacing}px`,
            fontSize: Math.round(20 * s.sourceTextScale / 100),
            fontWeight: 700,
            fontFamily: 'Manal',
            color: c.sourceTagColor,
            letterSpacing: 1,
            textShadow: srcShadow,
          },
        }, processArabicLine(sourceLabel)),
        el('div', {
          style: {
            display: 'flex',
            width: 32,
            height: 1,
            background: 'rgba(173, 179, 180, 0.3)',
          },
        }),
      )
    : null

  const headlineWords = processArabicWords(headline)
  const headlineTextEl = el(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        alignItems: 'baseline',
        color: c.headlineColor,
        lineHeight: s.headlineLineHeight,
        width: '100%',
      },
    },
    ...headlineWords.map((word) =>
      el('span', {
        style: {
          display: 'flex',
          fontFamily: word.isLatin ? 'SourceSerif' : 'Manal',
          fontWeight: word.isLatin ? 600 : 400,
          fontSize: word.isLatin ? scaledEnglishHL : scaledArabicHL,
          letterSpacing: word.isLatin ? 0.5 : s.headlineLetterSpacing,
          paddingLeft: word.isLatin ? 10 : 0,
          paddingRight: word.isLatin ? 10 : 0,
          marginLeft: s.headlineWordGap,
          textShadow: hlShadow,
        },
      }, word.text),
    ),
  )

  const avatarParams: AvatarParams = {
    size: s.avatarSize,
    borderRadius: s.avatarBorderRadius,
    flagSize: s.flagSize,
    flagOffsetBottom: s.flagOffsetBottom,
    flagOffsetHorizontal: s.flagOffsetHorizontal,
    flagEmojiSize: s.flagEmojiSize,
  }

  // Explicit pixel widths — satori doesn't reliably compute flex widths in nested layouts
  const totalContentWidth = 1080 - 2 * SIDE_PADDING
  const headlineColWidth = avatarBase64
    ? totalContentWidth - s.avatarSize - s.avatarGap
    : totalContentWidth

  const headlineRow = avatarBase64
    ? el(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            width: totalContentWidth,
          },
        },
        el(
          'div',
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              width: headlineColWidth,
            },
          },
          categoryTag,
          headlineTextEl,
        ),
        el('div', { style: { display: 'flex', width: s.avatarGap } }),
        el('div', {
          style: {
            display: 'flex',
            marginTop: s.avatarOffsetY,
            flexShrink: 0,
          },
        }, buildAvatarBlock(avatarBase64, flagEmoji ?? null, avatarParams)),
      )
    : el(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            width: totalContentWidth,
          },
        },
        categoryTag,
        headlineTextEl,
      )

  // ── Bullets Zone ──

  const ARROW_COL_WIDTH = 64

  const bulletRows = bullets.map((bullet) => {
    const words = processArabicWords(bullet)

    const arrowCol = el('div', {
      style: {
        display: 'flex',
        width: ARROW_COL_WIDTH,
        minWidth: ARROW_COL_WIDTH,
        justifyContent: 'center',
        alignItems: 'flex-start',
        marginTop: 6,
      },
    }, el('span', {
      style: {
        display: 'flex',
        fontFamily: 'SourceSerif',
        fontWeight: 400,
        fontSize: scaledArabicBL,
        color: c.bulletColor,
        textShadow: blShadow,
      },
    }, '←'))

    const textCol = el(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'row-reverse',
          flexWrap: 'wrap',
          justifyContent: 'flex-start',
          alignItems: 'baseline',
          flex: 1,
          lineHeight: s.bulletLineHeight,
        },
      },
      ...words.map((word) =>
        el('span', {
          style: {
            display: 'flex',
            fontFamily: word.isLatin ? 'SourceSerif' : 'Manal',
            fontWeight: word.isLatin ? 600 : 400,
            fontSize: word.isLatin ? scaledEnglishBL : scaledArabicBL,
            color: c.bulletColor,
            letterSpacing: word.isLatin ? 0.3 : s.bulletLetterSpacing,
            paddingLeft: word.isLatin ? 6 : 0,
            paddingRight: word.isLatin ? 6 : 0,
            marginLeft: s.bulletWordGap,
            textShadow: blShadow,
          },
        }, word.text),
      ),
    )

    return el(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'row-reverse',
          alignItems: 'flex-start',
          width: '100%',
        },
      },
      arrowCol,
      textCol,
    )
  })

  // Dynamic bullet spacing: 72px default, auto-reduce for >4 bullets
  // based on remaining vertical space (only when no explicit override)
  let effectiveBulletSpacing = s.bulletLineSpacing
  if (bullets.length > 4 && overrides?.bulletLineSpacing === undefined) {
    const POSTER_HEIGHT = 1920
    const BRAND_FOOTER_HEIGHT = 50
    const HEADLINE_ZONE_ESTIMATE = sourceLabel ? 300 : 250

    const bulletsStartY = s.contentTop + HEADLINE_ZONE_ESTIMATE + s.headlineBulletsGap
    const bulletsEndY = POSTER_HEIGHT - s.footerBottom - BRAND_FOOTER_HEIGHT
    const availableHeight = bulletsEndY - bulletsStartY

    const perBulletHeight = scaledArabicBL * Math.max(s.bulletLineHeight, 1) * 1.3
    const totalTextHeight = bullets.length * perBulletHeight
    const remainingSpace = availableHeight - totalTextHeight
    const gapCount = bullets.length - 1

    if (gapCount > 0 && remainingSpace > 0) {
      effectiveBulletSpacing = Math.max(16, Math.min(s.bulletLineSpacing, Math.floor(remainingSpace / gapCount)))
    } else if (gapCount > 0) {
      effectiveBulletSpacing = 16
    }
  }

  // Only render bullets container if there are bullets
  const bulletsContainer = bullets.length > 0
    ? el(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            gap: effectiveBulletSpacing,
            width: '100%',
          },
        },
        ...bulletRows,
      )
    : null

  // Custom notes section
  const notesEl = customNotes
    ? el(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'row-reverse',
            width: '100%',
            marginTop: 20,
          },
        },
        el('span', {
          style: {
            display: 'flex',
            fontSize: 28,
            color: '#2d3435',
            lineHeight: 1.5,
            fontFamily: 'Manal',
            fontWeight: 300,
            fontStyle: 'italic',
          },
        }, processArabicLine(customNotes)),
      )
    : null

  const brandFooter = el(
    'div',
    {
      style: {
        display: 'flex',
        marginTop: 'auto',
        paddingBottom: s.footerBottom,
        width: '100%',
        justifyContent: 'center',
      },
    },
    el('span', {
      style: {
        display: 'flex',
        fontFamily: 'Manal',
        fontSize: 34,
        fontWeight: 300,
        color: 'rgba(28, 25, 23, 0.22)',
        letterSpacing: 1,
      },
    }, processArabicLine('حسن يوجز')),
  )

  // ── Single flowing content zone: headline → gap → bullets → notes → footer ──

  const contentZone = el(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        position: 'absolute',
        top: s.contentTop,
        left: SIDE_PADDING,
        right: SIDE_PADDING,
        bottom: 0,
      },
    },
    headlineRow,
    (bullets.length > 0 || notesEl)
      ? el('div', { style: { display: 'flex', height: s.headlineBulletsGap, width: '100%' } })
      : null,
    bulletsContainer,
    notesEl,
    brandFooter,
  )

  // ── Date Label ──

  const dateLabel = el(
    'div',
    {
      style: {
        display: 'flex',
        position: 'absolute',
        top: s.dateTop,
        left: s.dateLeft,
      },
    },
    el('span', {
      style: {
        display: 'flex',
        fontSize: s.dateFontSize,
        fontFamily: 'Manal',
        fontWeight: 400,
        color: c.dateColor,
        opacity: c.dateOpacity / 100,
        letterSpacing: 1,
        textShadow: dtShadow,
      },
    }, processArabicLine(getArabicDate())),
  )

  // ── Root ──

  return el(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: 1080,
        height: 1920,
        fontFamily: 'Manal',
        position: 'relative',
      },
    },
    bgImage,
    contentZone,
    dateLabel,
  )
}

export async function POST(request: NextRequest) {
  try {
    const { summary, imageBase64, styleOverrides, avatarBase64, flagEmoji, heroOptions, colorOverrides } = await request.json()

    if (!summary?.headline) {
      return NextResponse.json({ error: 'Missing summary data' }, { status: 400 })
    }

    const bullets = summary.bullets || []

    const [bgDataUri, fonts] = await Promise.all([
      generateBackground(imageBase64 || null, heroOptions || undefined),
      getManalFonts(),
    ])

    const element = buildPoster(
      summary.headline,
      bullets,
      bgDataUri,
      summary.sourceLabel,
      styleOverrides,
      avatarBase64 || null,
      flagEmoji || null,
      summary.customNotes || null,
      colorOverrides || undefined,
    )

    const svg = await satori(element as React.ReactNode, {
      width: 1080,
      height: 1920,
      fonts,
    })

    const resvg = new Resvg(svg, {
      fitTo: { mode: 'width', value: 1080 },
    })
    const pngData = resvg.render()
    const pngBuffer = pngData.asPng()
    const pngBytes = new Uint8Array(pngBuffer)

    return new NextResponse(pngBytes, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': 'inline; filename="hsnyojz-story.png"',
      },
    })
  } catch (error) {
    console.error('[HsnYojz Render] Error:', error)
    return NextResponse.json(
      { error: `Render failed: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 },
    )
  }
}
