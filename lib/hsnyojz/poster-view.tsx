import type { CSSProperties } from 'react'
import { splitByLanguage } from './font-detect'
import type { PosterDesignConfig } from './poster-config'

export interface PosterCanvasData {
  headline: string
  bullets: string[]
  sourceLabel?: string
  customNotes?: string | null
}

function getFormattedDate(): string {
  const months = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
  ]
  const now = new Date()
  return `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`
}

function MixedText({
  text,
  arabicStyle,
  englishStyle,
}: {
  text: string
  arabicStyle: CSSProperties
  englishStyle: CSSProperties
}) {
  const segments = splitByLanguage(text)
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.lang === 'neutral') return seg.text
        return (
          <span
            key={i}
            style={{
              ...(seg.lang === 'arabic' ? arabicStyle : englishStyle),
              direction: seg.lang === 'arabic' ? 'rtl' : 'ltr',
              unicodeBidi: 'isolate',
            }}
          >
            {seg.text}
          </span>
        )
      })}
    </>
  )
}

export function generatePatternSvgUri(
  type: string,
  color: string,
  scale: number,
): string | null {
  const enc = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg)}`

  switch (type) {
    case 'dots': {
      const s = Math.round(20 * scale)
      const r = Math.max(1.5, s * 0.1)
      return enc(
        `<svg width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg"><circle cx="${s / 2}" cy="${s / 2}" r="${r}" fill="${color}"/></svg>`,
      )
    }
    case 'waves': {
      const w = Math.round(100 * scale)
      const h = Math.round(20 * scale)
      const mid = h / 2
      const sw = Math.max(0.8, scale * 1)
      return enc(
        `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><path d="M0 ${mid} Q${w / 4} 0 ${w / 2} ${mid} Q${(w * 3) / 4} ${h} ${w} ${mid}" fill="none" stroke="${color}" stroke-width="${sw}"/></svg>`,
      )
    }
    case 'topography': {
      const w = Math.round(200 * scale)
      const h = Math.round(120 * scale)
      const sw = Math.max(0.5, scale * 0.8)
      return enc(
        `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">` +
          `<path d="M0 ${h * 0.12} C${w * 0.15} ${h * 0.02} ${w * 0.35} ${h * 0.28} ${w * 0.5} ${h * 0.14} C${w * 0.65} 0 ${w * 0.85} ${h * 0.22} ${w} ${h * 0.12}" fill="none" stroke="${color}" stroke-width="${sw}"/>` +
          `<path d="M0 ${h * 0.38} C${w * 0.12} ${h * 0.28} ${w * 0.28} ${h * 0.48} ${w * 0.48} ${h * 0.35} C${w * 0.68} ${h * 0.22} ${w * 0.88} ${h * 0.45} ${w} ${h * 0.38}" fill="none" stroke="${color}" stroke-width="${sw}"/>` +
          `<path d="M0 ${h * 0.62} C${w * 0.18} ${h * 0.5} ${w * 0.38} ${h * 0.72} ${w * 0.55} ${h * 0.58} C${w * 0.72} ${h * 0.44} ${w * 0.9} ${h * 0.68} ${w} ${h * 0.62}" fill="none" stroke="${color}" stroke-width="${sw}"/>` +
          `<path d="M0 ${h * 0.88} C${w * 0.14} ${h * 0.76} ${w * 0.32} ${h * 0.95} ${w * 0.52} ${h * 0.84} C${w * 0.72} ${h * 0.73} ${w * 0.86} ${h * 0.92} ${w} ${h * 0.88}" fill="none" stroke="${color}" stroke-width="${sw}"/>` +
          `</svg>`,
      )
    }
    case 'cross-dots': {
      const s = Math.round(24 * scale)
      const c = s / 2
      const arm = s * 0.22
      const sw = Math.max(0.5, scale * 0.7)
      return enc(
        `<svg width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg"><line x1="${c}" y1="${c - arm}" x2="${c}" y2="${c + arm}" stroke="${color}" stroke-width="${sw}"/><line x1="${c - arm}" y1="${c}" x2="${c + arm}" y2="${c}" stroke="${color}" stroke-width="${sw}"/></svg>`,
      )
    }
    default:
      return null
  }
}

export function PosterCanvas({
  config,
  data,
  imageBase64,
  avatarBase64,
  flagImageSrc,
  showDimensionsBadge = false,
  rootId,
}: {
  config: PosterDesignConfig
  data: PosterCanvasData
  imageBase64: string | null
  avatarBase64: string | null
  flagImageSrc: string | null
  showDimensionsBadge?: boolean
  rootId?: string
}) {
  const heroHeight = Math.round(
    (config.hero.heightPercent / 100) * config.canvasHeight,
  )
  const contentTop = heroHeight - config.content.overlapHeroPx

  const hlAr = config.headline.arabic
  const hlEn = config.headline.english
  const blAr = config.bullets.arabic
  const blEn = config.bullets.english
  const p = config.hero.plain

  const pattern = config.pattern ?? {
    type: 'dots',
    color: '#d0d0d0',
    opacity: 0.3,
    scale: 1,
  }
  const patternUri =
    pattern.type !== 'none'
      ? generatePatternSvgUri(pattern.type, pattern.color, pattern.scale)
      : null

  return (
    <div
      id={rootId}
      style={{
        width: config.canvasWidth,
        height: config.canvasHeight,
        backgroundColor: config.backgroundColor,
        position: 'relative',
        fontFamily: "'Manal', 'Source Serif 4', serif",
      }}
    >
      {patternUri && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `url("${patternUri}")`,
            backgroundRepeat: 'repeat',
            opacity: pattern.opacity,
          }}
        />
      )}

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: config.canvasWidth,
          height: heroHeight,
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {imageBase64 && config.hero.style === 'glass-refraction' && (
          <>
            <div
              style={{
                width: config.hero.glass.outerCircleSizePx,
                height: config.hero.glass.outerCircleSizePx,
                borderRadius: '50%',
                overflow: 'hidden',
                position: 'relative',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              <img
                src={imageBase64}
                alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  filter: `blur(${config.hero.glass.blurAmount}px)`,
                  transform: 'scale(1.1)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: config.backgroundColor,
                  opacity: 1 - config.hero.glass.opacity,
                }}
              />
            </div>
            <div
              style={{
                position: 'absolute',
                width: config.hero.glass.innerCircleSizePx,
                height: config.hero.glass.innerCircleSizePx,
                borderRadius: '50%',
                overflow: 'hidden',
                border: '3px solid rgba(255,255,255,0.3)',
              }}
            >
              <img
                src={imageBase64}
                alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </div>
          </>
        )}

        {imageBase64 && config.hero.style === 'plain' && (
          <div
            style={{
              position: 'relative',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                position: 'absolute',
                bottom: -p.shadowOffsetY,
                left: '10%',
                width: '80%',
                height: 40,
                borderRadius: '50%',
                backgroundColor: `rgba(0,0,0,${p.shadowIntensity})`,
                filter: `blur(${p.shadowBlur}px)`,
              }}
            />
            <img
              src={imageBase64}
              alt=""
              style={{
                width: `${p.imageWidthPercent}%`,
                height: `${p.imageHeightPercent}%`,
                objectFit: 'cover',
                borderRadius: p.borderRadius,
              }}
            />
          </div>
        )}

        {!imageBase64 && (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: config.hero.placeholderColor,
            }}
          />
        )}

        {config.hero.gradientHeightPercent > 0 && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '100%',
              height: `${config.hero.gradientHeightPercent}%`,
              background: `linear-gradient(to bottom, transparent, ${config.hero.gradientColor})`,
            }}
          />
        )}
      </div>

      <div
        dir="rtl"
        style={{
          position: 'absolute',
          top: contentTop,
          left: config.content.paddingX,
          right: config.content.paddingX,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: config.sourceTag.marginBottom,
          }}
        >
          {data.sourceLabel && (
            <span
              style={{
                background: config.sourceTag.backgroundColor,
                padding: `${config.sourceTag.paddingY}px ${config.sourceTag.paddingX}px`,
                fontSize: config.sourceTag.fontSize,
                fontWeight: config.sourceTag.fontWeight,
                color: config.sourceTag.color,
                fontFamily: "'Source Serif 4', serif",
                letterSpacing: 1,
              }}
            >
              {data.sourceLabel.toUpperCase()}
            </span>
          )}
          <div
            style={{
              flex: 1,
              height: 1,
              background: config.sourceTag.lineColor,
            }}
          />
          <span
            style={{
              fontSize: config.date.fontSize,
              color: config.date.color,
              opacity: config.date.opacity,
              fontFamily: "'Manal', sans-serif",
              letterSpacing: 1,
              direction: 'ltr',
              unicodeBidi: 'embed',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {getFormattedDate()}
          </span>
        </div>

        <div
          style={{
            width: '100%',
            lineHeight: hlAr.lineHeight,
          }}
        >
          <MixedText
            text={data.headline}
            arabicStyle={{
              fontFamily: "'Manal', sans-serif",
              fontSize: hlAr.fontSize,
              fontWeight: hlAr.fontWeight,
              lineHeight: hlAr.lineHeight,
              letterSpacing: hlAr.letterSpacing,
              color: hlAr.color,
            }}
            englishStyle={{
              fontFamily: "'Source Serif 4', serif",
              fontSize: hlEn.fontSize,
              fontWeight: hlEn.fontWeight,
              lineHeight: hlEn.lineHeight,
              letterSpacing: hlEn.letterSpacing,
              color: hlEn.color,
              paddingLeft: 10,
              paddingRight: 10,
              paddingTop: 14,
            }}
          />
        </div>

        {avatarBase64 && (
          <div
            style={{
              position: 'absolute',
              right: config.avatar.positionX,
              top: config.avatar.positionY,
              zIndex: 10,
            }}
          >
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  width: config.avatar.sizePx,
                  height: config.avatar.sizePx,
                  borderRadius: config.avatar.borderRadius,
                  border: `${config.avatar.borderWidth}px solid ${config.avatar.borderColor}`,
                  overflow: 'hidden',
                }}
              >
                <img
                  src={avatarBase64}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </div>
              {flagImageSrc && (
                <img
                  src={flagImageSrc}
                  alt=""
                  style={{
                    position: 'absolute',
                    bottom: config.flag.offsetY,
                    right: config.flag.offsetX,
                    width: config.flag.sizePx,
                    height: Math.round(config.flag.sizePx * 0.75),
                    objectFit: 'contain',
                  }}
                />
              )}
            </div>
          </div>
        )}

        {(data.bullets.length > 0 || data.customNotes) && (
          <div
            style={{
              position: 'absolute',
              top: config.bullets.anchorY,
              left: config.bullets.positionX,
              right: -config.bullets.positionX,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {data.bullets.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: config.bullets.gap,
                  borderRight:
                    config.bullets.borderLineWidth > 0
                      ? `${config.bullets.borderLineWidth}px solid ${config.bullets.borderLineColor}`
                      : undefined,
                  paddingRight:
                    config.bullets.borderLineWidth > 0
                      ? config.bullets.paddingRight
                      : 0,
                }}
              >
                {data.bullets.map((bullet, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        width: config.bullets.iconSize,
                        minWidth: config.bullets.iconSize,
                        display: 'flex',
                        justifyContent: 'center',
                      }}
                    >
                      <span
                        style={{
                          fontSize: config.bullets.iconSize,
                          color: config.bullets.iconColor,
                          lineHeight: blAr.lineHeight,
                          fontFamily: "'Manal', sans-serif",
                          marginLeft: config.bullets.iconOffsetX,
                          marginTop: config.bullets.iconOffsetY,
                        }}
                      >
                        {config.bullets.iconSymbol}
                      </span>
                    </div>
                    <div
                      style={{
                        flex: 1,
                      }}
                    >
                      <MixedText
                        text={bullet}
                        arabicStyle={{
                          fontFamily: "'Manal', sans-serif",
                          fontSize: blAr.fontSize,
                          fontWeight: blAr.fontWeight,
                          lineHeight: blAr.lineHeight,
                          color: blAr.color,
                        }}
                        englishStyle={{
                          fontFamily: "'Source Serif 4', serif",
                          fontSize: blEn.fontSize,
                          fontWeight: blEn.fontWeight,
                          lineHeight: blEn.lineHeight,
                          color: blEn.color,
                          paddingLeft: 6,
                          paddingRight: 6,
                          paddingTop: 8,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {data.customNotes && (
              <div
                style={{
                  display: 'flex',
                  width: '100%',
                  marginTop: config.notes.marginTop,
                }}
              >
                <span
                  style={{
                    fontSize: config.notes.fontSize,
                    color: config.notes.color,
                    lineHeight: config.notes.lineHeight,
                    fontFamily: "'Manal', sans-serif",
                    fontWeight: 300,
                    fontStyle: config.notes.fontStyle,
                  }}
                >
                  {data.customNotes}
                </span>
              </div>
            )}
          </div>
        )}

        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            paddingTop: config.brand.paddingTop,
            paddingBottom: config.brand.paddingBottom,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {config.brand.showBrandText && (
            <span
              style={{
                fontSize: config.brand.fontSize,
                fontWeight: config.brand.fontWeight,
                color: config.brand.color,
                opacity: config.brand.opacity,
                letterSpacing: config.brand.letterSpacing,
                fontFamily: "'Rawasi Arabic', 'Manal', sans-serif",
              }}
            >
              {config.brand.text}
            </span>
          )}
          {config.brand.showHandle && (
            <span
              style={{
                fontSize: config.brand.handleFontSize,
                color: config.brand.handleColor,
                opacity: config.brand.handleOpacity,
                fontFamily: "'Source Serif 4', serif",
                marginTop: 4,
              }}
            >
              {config.brand.handle}
            </span>
          )}
        </div>
      </div>

      {showDimensionsBadge && (
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            fontSize: 14,
            color: 'rgba(0,0,0,0.2)',
            fontFamily: 'monospace',
          }}
        >
          {config.canvasWidth} × {config.canvasHeight}
        </div>
      )}
    </div>
  )
}
