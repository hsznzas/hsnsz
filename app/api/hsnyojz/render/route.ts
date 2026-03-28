import { NextRequest, NextResponse } from 'next/server'
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import { getManalFonts } from '@/lib/hsnyojz/fonts'
import { processArabicLine, processArabicWords, type HeadlineWord } from '@/lib/hsnyojz/arabic'
import {
  createGlassHeroImages,
  createCurvedShadow,
} from '@/lib/hsnyojz/image-processing'
import { fetchFlagAsBase64 } from '@/lib/hsnyojz/flags'
import { createPatternBackground } from '@/lib/hsnyojz/background'
import {
  type PosterDesignConfig,
  DEFAULT_POSTER_CONFIG,
  DEFAULT_POSTER_CONFIG_4x5,
} from '@/lib/hsnyojz/poster-config'

export const maxDuration = 30
export const dynamic = 'force-dynamic'

// ── Satori Node Helpers ──

type SatoriNode = { type: string; props: Record<string, unknown> }

function el(
  type: string,
  props: Record<string, unknown>,
  ...children: (string | SatoriNode | null | false | undefined)[]
): SatoriNode {
  const filtered = children.filter(
    (c): c is string | SatoriNode => c != null && c !== false,
  )
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
      children:
        filtered.length === 0
          ? undefined
          : filtered.length === 1
            ? filtered[0]
            : filtered,
    },
  }
}

// ── Date Helper ──

function getFormattedDate(): string {
  const months = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
  ]
  const now = new Date()
  return `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`
}

// ── Headline Auto-Shrink ──

function calculateHeadlineShrink(
  headline: string,
  cfg: PosterDesignConfig,
  containerWidth: number,
): number {
  const { maxLines, shrinkStepPercent, minFontSizePercent } = cfg.headline
  const baseFontSize = cfg.headline.arabic.fontSize
  let scale = 1.0
  const minScale = minFontSizePercent / 100

  while (scale >= minScale) {
    const currentSize = baseFontSize * scale
    const avgCharWidth = currentSize * 0.55
    const charsPerLine = Math.floor(containerWidth / avgCharWidth)
    const estimatedLines = Math.ceil(headline.length / Math.max(1, charsPerLine))

    if (estimatedLines <= maxLines) return scale
    scale -= shrinkStepPercent / 100
  }

  return minScale
}

// ── Bullet Line Layout ──
// Pre-calculate line breaks for bullet text so we never rely on
// Satori's flexWrap (which mis-handles mixed-size RTL items).

const ARABIC_RANGE = /[\u0600-\u06FF\uFE70-\uFEFF\u0750-\u077F\u08A0-\u08FF]/

function estimateWordPx(text: string, fontSize: number): number {
  let w = 0
  for (const ch of text) {
    if (ARABIC_RANGE.test(ch)) w += fontSize * 0.58
    else if (ch === ' ') w += fontSize * 0.25
    else w += fontSize * 0.55
  }
  return w
}

function layoutBulletLines(
  words: HeadlineWord[],
  maxWidth: number,
  arFontSize: number,
  enFontSize: number,
): HeadlineWord[][] {
  const lines: HeadlineWord[][] = [[]]
  let used = 0
  const gap = 12

  for (const word of words) {
    const fs = word.isLatin ? enFontSize : arFontSize
    const extra = word.isLatin ? 22 : 10
    const wordPx = estimateWordPx(word.text, fs) + extra + gap

    if (used + wordPx > maxWidth && lines[lines.length - 1].length > 0) {
      lines.push([word])
      used = wordPx
    } else {
      lines[lines.length - 1].push(word)
      used += wordPx
    }
  }

  return lines.filter(l => l.length > 0)
}

// ── Hero Zone Builder ──

function buildHeroZone(
  cfg: PosterDesignConfig,
  innerBase64: string | null,
  outerBase64: string | null,
  imageBase64: string | null,
  shadowBase64: string | null,
): SatoriNode {
  const heroHeight = Math.round(
    (cfg.hero.heightPercent / 100) * cfg.canvasHeight,
  )
  const gradientHeight = Math.round(
    (cfg.hero.gradientHeightPercent / 100) * heroHeight,
  )

  const children: (SatoriNode | null | false)[] = []

  if (imageBase64 && cfg.hero.style === 'glass-refraction' && innerBase64 && outerBase64) {
    children.push(
      el('div', {
        style: {
          display: 'flex',
          width: cfg.hero.glass.outerCircleSizePx,
          height: cfg.hero.glass.outerCircleSizePx,
          borderRadius: '50%',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.15)',
        },
      },
        el('img', {
          src: outerBase64,
          style: {
            width: cfg.hero.glass.outerCircleSizePx,
            height: cfg.hero.glass.outerCircleSizePx,
            objectFit: 'cover',
          },
        }),
      ),
    )
    children.push(
      el('div', {
        style: {
          display: 'flex',
          position: 'absolute',
          width: cfg.hero.glass.outerCircleSizePx,
          height: cfg.hero.glass.outerCircleSizePx,
          borderRadius: '50%',
          background: cfg.backgroundColor,
          opacity: 1 - cfg.hero.glass.opacity,
        },
      }),
    )
    children.push(
      el('div', {
        style: {
          display: 'flex',
          position: 'absolute',
          width: cfg.hero.glass.innerCircleSizePx,
          height: cfg.hero.glass.innerCircleSizePx,
          borderRadius: '50%',
          overflow: 'hidden',
          border: '3px solid rgba(255,255,255,0.3)',
        },
      },
        el('img', {
          src: innerBase64,
          style: {
            width: cfg.hero.glass.innerCircleSizePx,
            height: cfg.hero.glass.innerCircleSizePx,
            objectFit: 'cover',
          },
        }),
      ),
    )
  } else if (imageBase64 && cfg.hero.style === 'plain') {
    const p = cfg.hero.plain
    const imgW = Math.round(cfg.canvasWidth * (p.imageWidthPercent / 100))
    const imgH = Math.round(heroHeight * (p.imageHeightPercent / 100))
    const shadowW = imgW + 60
    const shadowH = 100

    if (shadowBase64) {
      children.push(
        el('img', {
          src: shadowBase64,
          style: {
            position: 'absolute',
            bottom: -p.shadowOffsetY,
            left: Math.round((cfg.canvasWidth - shadowW) / 2),
            width: shadowW,
            height: shadowH,
            objectFit: 'contain',
          },
        }),
      )
    }
    children.push(
      el('img', {
        src: imageBase64,
        style: {
          width: imgW,
          height: imgH,
          objectFit: 'cover',
          borderRadius: p.borderRadius,
          boxShadow: '0 1px 4px rgba(0, 0, 0, 0.3)',
        },
      }),
    )
  }

  if (gradientHeight > 0) {
    children.push(
      el('div', {
        style: {
          display: 'flex',
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: cfg.canvasWidth,
          height: gradientHeight,
          backgroundImage: `linear-gradient(to bottom, rgba(249,249,249,0), ${cfg.hero.gradientColor})`,
        },
      }),
    )
  }

  return el(
    'div',
    {
      style: {
        display: 'flex',
        position: 'absolute',
        top: 0,
        left: 0,
        width: cfg.canvasWidth,
        height: heroHeight,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
      },
    },
    ...children,
  )
}

// ── Avatar + Flag Builder ──

function buildAvatarBlock(
  cfg: PosterDesignConfig,
  avatarBase64: string,
  flagBase64: string | null,
): SatoriNode {
  const avatarContainer = el(
    'div',
    {
      style: {
        display: 'flex',
        width: cfg.avatar.sizePx,
        height: cfg.avatar.sizePx,
        borderRadius: cfg.avatar.borderRadius,
        border: `${cfg.avatar.borderWidth}px solid ${cfg.avatar.borderColor}`,
        overflow: 'hidden',
        flexShrink: 0,
      },
    },
    el('img', {
      src: avatarBase64,
      style: {
        width: cfg.avatar.sizePx,
        height: cfg.avatar.sizePx,
        objectFit: 'cover',
        borderRadius: cfg.avatar.borderRadius,
      },
    }),
  )

  if (!flagBase64) return avatarContainer

  return el(
    'div',
    {
      style: {
        display: 'flex',
        position: 'relative',
        width: cfg.avatar.sizePx,
        height: cfg.avatar.sizePx,
        flexShrink: 0,
      },
    },
    avatarContainer,
    el('img', {
      src: flagBase64,
      style: {
        position: 'absolute',
        bottom: cfg.flag.offsetY,
        right: cfg.flag.offsetX,
        width: cfg.flag.sizePx,
        height: Math.round(cfg.flag.sizePx * 0.75),
        objectFit: 'contain',
      },
    }),
  )
}

// ── Poster Builder ──

function buildPoster(
  cfg: PosterDesignConfig,
  headline: string,
  bullets: string[],
  sourceLabel: string | undefined,
  customNotes: string | undefined,
  innerBase64: string | null,
  outerBase64: string | null,
  imageBase64: string | null,
  avatarBase64: string | null,
  flagBase64: string | null,
  patternBase64: string,
  shadowBase64: string | null,
): SatoriNode {
  const heroHeight = Math.round(
    (cfg.hero.heightPercent / 100) * cfg.canvasHeight,
  )
  const contentTop = heroHeight - cfg.content.overlapHeroPx
  const totalContentWidth = cfg.canvasWidth - 2 * cfg.content.paddingX

  const sourceText = sourceLabel ? sourceLabel.toUpperCase() : ''

  const shrinkScale = calculateHeadlineShrink(headline, cfg, totalContentWidth)
  const hlAr = {
    ...cfg.headline.arabic,
    fontSize: Math.round(cfg.headline.arabic.fontSize * shrinkScale),
  }
  const hlEn = {
    ...cfg.headline.english,
    fontSize: Math.round(cfg.headline.english.fontSize * shrinkScale),
  }

  // ── Source Tag + Date Row ──
  const dateText = processArabicLine(getFormattedDate())

  const sourceTagEl = el(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
        marginBottom: cfg.sourceTag.marginBottom,
        width: '100%',
      },
    },
    sourceText
      ? el(
          'span',
          {
            style: {
              display: 'flex',
              background: cfg.sourceTag.backgroundColor,
              padding: `${cfg.sourceTag.paddingY}px ${cfg.sourceTag.paddingX}px`,
              fontSize: cfg.sourceTag.fontSize,
              fontWeight: cfg.sourceTag.fontWeight,
              fontFamily: cfg.fonts.english,
              color: cfg.sourceTag.color,
              letterSpacing: 1,
            },
          },
          sourceText,
        )
      : null,
    el('div', {
      style: {
        display: 'flex',
        flex: 1,
        height: 1,
        background: cfg.sourceTag.lineColor,
      },
    }),
    el(
      'span',
      {
        style: {
          display: 'flex',
          fontSize: cfg.date.fontSize,
          fontFamily: cfg.fonts.arabic,
          fontWeight: 400,
          color: cfg.date.color,
          opacity: cfg.date.opacity,
          letterSpacing: 1,
          flexShrink: 0,
        },
      },
      dateText,
    ),
  )

  // ── Headline (per-word bilingual rendering) ──
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
        width: '100%',
      },
    },
    ...headlineWords.map((word) => {
      const isEn = word.isLatin
      return el(
        'span',
        {
          style: {
            display: 'flex',
            fontFamily: isEn ? cfg.fonts.english : cfg.fonts.arabic,
            fontWeight: isEn ? hlEn.fontWeight : hlAr.fontWeight,
            fontSize: isEn ? hlEn.fontSize : hlAr.fontSize,
            lineHeight: isEn ? hlEn.lineHeight : hlAr.lineHeight,
            letterSpacing: isEn ? hlEn.letterSpacing : hlAr.letterSpacing,
            color: isEn ? hlEn.color : hlAr.color,
            paddingLeft: isEn ? 10 : 0,
            paddingRight: isEn ? 10 : 0,
            paddingTop: isEn ? 14 : 0,
            marginLeft: 19,
          },
        },
        word.text,
      )
    }),
  )

  // ── Headline Row — always full width, avatar is independent ──
  const headlineRow = el(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        width: totalContentWidth,
      },
    },
    sourceTagEl,
    headlineTextEl,
  )

  // ── Avatar — always absolutely positioned, independent of headline ──
  const avatarEl = avatarBase64
    ? el(
        'div',
        {
          style: {
            display: 'flex',
            position: 'absolute',
            right: cfg.avatar.positionX,
            top: cfg.avatar.positionY,
          },
        },
        buildAvatarBlock(cfg, avatarBase64, flagBase64),
      )
    : null

  // ── Bullets (manual line layout — avoids Satori flexWrap bug) ──
  const blAr = cfg.bullets.arabic
  const blEn = cfg.bullets.english
  const bulletTextWidth =
    cfg.canvasWidth - 2 * cfg.content.paddingX - cfg.bullets.iconSize

  const bulletRows = bullets.map((bullet) => {
    const words = processArabicWords(bullet)
    const lines = layoutBulletLines(
      words, bulletTextWidth, blAr.fontSize, blEn.fontSize,
    )

    const iconElement = el('span', {
      style: {
        display: 'flex',
        fontSize: cfg.bullets.iconSize,
        color: cfg.bullets.iconColor,
        lineHeight: blAr.lineHeight,
        fontFamily: cfg.fonts.arabic,
        marginLeft: cfg.bullets.iconOffsetX,
        marginTop: cfg.bullets.iconOffsetY,
      },
    }, cfg.bullets.iconSymbol)

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
      el(
        'div',
        {
          style: {
            display: 'flex',
            width: cfg.bullets.iconSize,
            minWidth: cfg.bullets.iconSize,
            justifyContent: 'center',
          },
        },
        iconElement,
      ),
      el(
        'div',
        {
          style: {
            display: 'flex',
            flex: 1,
            flexDirection: 'column',
            alignItems: 'flex-end',
          },
        },
        ...lines.map((line) =>
          el(
            'div',
            {
              style: {
                display: 'flex',
                flexDirection: 'row-reverse',
                alignItems: 'baseline',
              },
            },
            ...line.map((word) => {
              const isEn = word.isLatin
              return el(
                'span',
                {
                  style: {
                    display: 'flex',
                    fontFamily: isEn ? cfg.fonts.english : cfg.fonts.arabic,
                    fontWeight: isEn ? blEn.fontWeight : blAr.fontWeight,
                    fontSize: isEn ? blEn.fontSize : blAr.fontSize,
                    lineHeight: isEn ? blEn.lineHeight : blAr.lineHeight,
                    color: isEn ? blEn.color : blAr.color,
                    letterSpacing: isEn ? 0.3 : 0,
                    paddingLeft: isEn ? 6 : 0,
                    paddingRight: isEn ? 6 : 0,
                    paddingTop: isEn ? 8 : 0,
                    marginLeft: 10,
                  },
                },
                word.text,
              )
            }),
          ),
        ),
      ),
    )
  })

  const bulletsContainer =
    bullets.length > 0
      ? el(
          'div',
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              gap: cfg.bullets.gap,
              width: '100%',
              borderRight:
                cfg.bullets.borderLineWidth > 0
                  ? `${cfg.bullets.borderLineWidth}px solid ${cfg.bullets.borderLineColor}`
                  : undefined,
              paddingRight:
                cfg.bullets.borderLineWidth > 0
                  ? cfg.bullets.paddingRight
                  : 0,
            },
          },
          ...bulletRows,
        )
      : null

  // ── Custom Notes ──
  const notesEl = customNotes
    ? el(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'row-reverse',
            width: '100%',
            marginTop: cfg.notes.marginTop,
          },
        },
        el(
          'span',
          {
            style: {
              display: 'flex',
              fontSize: cfg.notes.fontSize,
              color: cfg.notes.color,
              lineHeight: cfg.notes.lineHeight,
              fontFamily: cfg.fonts.arabic,
              fontWeight: 300,
              fontStyle: cfg.notes.fontStyle,
            },
          },
          processArabicLine(customNotes),
        ),
      )
    : null

  // ── Brand Footer ──
  const brandFooter = el(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        marginTop: 'auto',
        paddingTop: cfg.brand.paddingTop,
        paddingBottom: cfg.brand.paddingBottom,
        alignItems: 'center',
        width: '100%',
      },
    },
    cfg.brand.showBrandText
      ? el(
          'span',
          {
            style: {
              display: 'flex',
              fontFamily: 'RawasiArabic',
              fontSize: cfg.brand.fontSize,
              fontWeight: cfg.brand.fontWeight,
              color: cfg.brand.color,
              opacity: cfg.brand.opacity,
              letterSpacing: cfg.brand.letterSpacing,
            },
          },
          processArabicLine(cfg.brand.text),
        )
      : null,
    cfg.brand.showHandle
      ? el(
          'span',
          {
            style: {
              display: 'flex',
              fontFamily: cfg.fonts.english,
              fontSize: cfg.brand.handleFontSize,
              fontWeight: 400,
              color: cfg.brand.handleColor,
              opacity: cfg.brand.handleOpacity,
              marginTop: 4,
            },
          },
          cfg.brand.handle,
        )
      : null,
  )

  // ── Content Zone ──
  const contentZone = el(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        position: 'absolute',
        top: contentTop,
        left: cfg.content.paddingX,
        right: cfg.content.paddingX,
        bottom: 0,
      },
    },
    headlineRow,

    avatarEl,

    (bulletsContainer || notesEl)
      ? el(
          'div',
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              position: 'absolute',
              top: cfg.bullets.anchorY,
              left: cfg.bullets.positionX,
              right: -cfg.bullets.positionX,
            },
          },
          bulletsContainer,
          notesEl,
        )
      : null,

    brandFooter,
  )

  // ── Root ──
  return el(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: cfg.canvasWidth,
        height: cfg.canvasHeight,
        fontFamily: cfg.fonts.arabic,
        position: 'relative',
      },
    },
    el('img', {
      src: patternBase64,
      style: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: cfg.canvasWidth,
        height: cfg.canvasHeight,
        objectFit: 'cover',
      },
    }),
    buildHeroZone(cfg, innerBase64, outerBase64, imageBase64, shadowBase64),
    contentZone,
  )
}

// ── POST Handler ──

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
    const baseConfig =
      ratio === '4:5' ? DEFAULT_POSTER_CONFIG_4x5 : DEFAULT_POSTER_CONFIG
    const cfg: PosterDesignConfig = userConfig
      ? deepMergeConfig(baseConfig, userConfig)
      : { ...baseConfig, canvasHeight: ratio === '4:5' ? 1440 : 1920 }

    const bullets = summary.bullets || []

    // Glass refraction hero
    let innerBase64: string | null = null
    let outerBase64: string | null = null
    if (imageBase64 && cfg.hero.style === 'glass-refraction') {
      try {
        const result = await createGlassHeroImages(
          imageBase64,
          cfg.hero.glass.innerCircleSizePx,
          cfg.hero.glass.outerCircleSizePx,
          cfg.hero.glass.blurAmount,
        )
        innerBase64 = result.innerBase64
        outerBase64 = result.outerBase64
      } catch (err) {
        console.error('[HsnYojz Render] Glass processing failed:', err)
      }
    }

    // Plain hero shadow — lifted-edge effect
    let shadowBase64: string | null = null
    if (imageBase64 && cfg.hero.style === 'plain') {
      try {
        const p = cfg.hero.plain
        const imgW = Math.round(cfg.canvasWidth * (p.imageWidthPercent / 100))
        shadowBase64 = await createCurvedShadow(
          imgW + 60,
          100,
          p.shadowIntensity,
          p.shadowBlur,
        )
      } catch (err) {
        console.error('[HsnYojz Render] Shadow creation failed:', err)
      }
    }

    // Resolve flag
    let resolvedFlagBase64 = providedFlagBase64 || null
    if (!resolvedFlagBase64 && flagEmoji && avatarBase64) {
      try {
        resolvedFlagBase64 = await fetchFlagAsBase64(flagEmoji)
      } catch (err) {
        console.error('[HsnYojz Render] Flag resolution failed:', err)
      }
    }

    const [patternBase64, fonts] = await Promise.all([
      createPatternBackground(cfg.canvasWidth, cfg.canvasHeight),
      getManalFonts(),
    ])

    const element = buildPoster(
      cfg,
      summary.headline,
      bullets,
      summary.sourceLabel,
      summary.customNotes,
      innerBase64,
      outerBase64,
      imageBase64 || null,
      avatarBase64 || null,
      resolvedFlagBase64,
      patternBase64,
      shadowBase64,
    )

    const svg = await satori(element as React.ReactNode, {
      width: cfg.canvasWidth,
      height: cfg.canvasHeight,
      fonts,
    })

    const resvg = new Resvg(svg, {
      fitTo: { mode: 'width', value: cfg.canvasWidth },
    })
    const pngData = resvg.render()
    const pngBuffer = pngData.asPng()

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

// ── Utilities ──

function deepMergeConfig(
  base: PosterDesignConfig,
  overrides: Partial<PosterDesignConfig>,
): PosterDesignConfig {
  const result = JSON.parse(JSON.stringify(base))
  function merge(target: Record<string, unknown>, source: Record<string, unknown>) {
    for (const key of Object.keys(source)) {
      const val = source[key]
      if (val && typeof val === 'object' && !Array.isArray(val) && typeof target[key] === 'object' && target[key] !== null) {
        merge(target[key] as Record<string, unknown>, val as Record<string, unknown>)
      } else if (val !== undefined) {
        target[key] = val
      }
    }
  }
  merge(result, overrides as Record<string, unknown>)
  return result as PosterDesignConfig
}
