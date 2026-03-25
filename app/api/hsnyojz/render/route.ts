// HsnYojz - Satori + Resvg Poster Renderer (Masthead Editorial Design)
// POST: receives { summary, imageBase64 }, returns 1080x1920 PNG
//
// Background: pre-rendered by sharp (pattern texture + hero image with
// gradient blur + gradient fade). Satori handles text layout only.

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

const SIDE_PADDING = 130
const ARABIC_HEADLINE_SIZE = 96
const ENGLISH_HEADLINE_SIZE = 59
const ARABIC_BULLET_SIZE = 55
const ENGLISH_BULLET_SIZE = 33

const TITLE_ZONE_TOP = 540
const TITLE_ZONE_HEIGHT = 400
const BULLETS_TOP = TITLE_ZONE_TOP + TITLE_ZONE_HEIGHT

function buildPoster(
  headline: string,
  bullets: string[],
  bgDataUri: string,
  sourceLabel?: string,
): SatoriNode {
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
            padding: '2px 8px',
            fontSize: 20,
            fontWeight: 700,
            fontFamily: 'Manal',
            color: '#5a6061',
            letterSpacing: 1,
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
  const headlineEl = el(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        alignItems: 'baseline',
        color: '#000000',
        lineHeight: 1.05,
        gap: '0px 24px',
        width: '100%',
      },
    },
    ...headlineWords.map((word) =>
      el('span', {
        style: {
          display: 'flex',
          fontFamily: word.isLatin ? 'SourceSerif' : 'Manal',
          fontWeight: 400,
          fontSize: word.isLatin ? ENGLISH_HEADLINE_SIZE : ARABIC_HEADLINE_SIZE,
          letterSpacing: word.isLatin ? 0.5 : -2,
          paddingLeft: word.isLatin ? 10 : 0,
          paddingRight: word.isLatin ? 10 : 0,
        },
      }, word.text),
    ),
  )

  const titleZone = el(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-end',
        position: 'absolute',
        top: TITLE_ZONE_TOP,
        left: SIDE_PADDING,
        right: SIDE_PADDING,
        height: TITLE_ZONE_HEIGHT,
      },
    },
    categoryTag,
    headlineEl,
  )

  // ── Bullets Zone: double-dash prefix, per-word font switching ──

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
        fontSize: ARABIC_BULLET_SIZE,
        color: '#2a3d66',
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
          gap: '2px 14px',
        },
      },
      ...words.map((word) =>
        el('span', {
          style: {
            display: 'flex',
            fontFamily: word.isLatin ? 'SourceSerif' : 'Manal',
            fontWeight: 400,
            fontSize: word.isLatin ? ENGLISH_BULLET_SIZE : ARABIC_BULLET_SIZE,
            color: '#2a3d66',
            letterSpacing: word.isLatin ? 0.3 : 0,
            paddingLeft: word.isLatin ? 6 : 0,
            paddingRight: word.isLatin ? 6 : 0,
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

  const bulletsContainer = el(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 44,
        width: '100%',
      },
    },
    ...bulletRows,
  )

  const brandFooter = el(
    'div',
    {
      style: {
        display: 'flex',
        marginTop: 'auto',
        paddingBottom: 80,
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

  const bulletsZone = el(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        position: 'absolute',
        top: BULLETS_TOP,
        left: SIDE_PADDING,
        right: SIDE_PADDING,
        bottom: 0,
      },
    },
    bulletsContainer,
    brandFooter,
  )

  // ── Date Label ──

  const dateLabel = el(
    'div',
    {
      style: {
        display: 'flex',
        position: 'absolute',
        top: 24,
        left: 32,
      },
    },
    el('span', {
      style: {
        display: 'flex',
        fontSize: 20,
        fontFamily: 'Manal',
        fontWeight: 400,
        color: 'rgba(117, 124, 125, 0.7)',
        letterSpacing: 1,
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
    titleZone,
    bulletsZone,
    dateLabel,
  )
}

export async function POST(request: NextRequest) {
  try {
    const { summary, imageBase64 } = await request.json()

    if (!summary?.headline || !summary?.bullets) {
      return NextResponse.json({ error: 'Missing summary data' }, { status: 400 })
    }

    const [bgDataUri, fonts] = await Promise.all([
      generateBackground(imageBase64 || null),
      getManalFonts(),
    ])

    const element = buildPoster(
      summary.headline,
      summary.bullets,
      bgDataUri,
      summary.sourceLabel,
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
