export interface FontStyleConfig {
  fontSize: number
  fontWeight: number
  lineHeight: number
  color: string
}

export interface HeadlineFontConfig extends FontStyleConfig {
  letterSpacing: number
}

export interface ShadowConfig {
  offsetX: number
  offsetY: number
  blur: number
  color: string
  opacity: number
}

export type PatternType = 'none' | 'dots' | 'waves' | 'topography' | 'cross-dots'

export type PatternGradientMode = 'per-line' | 'overall'

export interface PatternConfig {
  type: PatternType
  color: string
  opacity: number
  scale: number
  strokeWidth: number
  wavelength: number
  gradientEnabled: boolean
  gradientColorEnd: string
  gradientAngle: number
  gradientMode: PatternGradientMode
}

export interface BackgroundGradientConfig {
  enabled: boolean
  colorEnd: string
  angle: number
}

export interface PosterDesignConfig {
  aspectRatio: '9:16' | '4:5'
  canvasWidth: number
  canvasHeight: number
  backgroundColor: string
  backgroundGradient: BackgroundGradientConfig
  pattern: PatternConfig

  hero: {
    heightPercent: number
    style: 'glass-refraction' | 'plain'
    glass: {
      innerCircleSizePx: number
      outerCircleSizePx: number
      blurAmount: number
      opacity: number
    }
    plain: {
      imageWidthPercent: number
      imageHeightPercent: number
      borderRadius: number
      shadowIntensity: number
      shadowBlur: number
      shadowOffsetY: number
    }
    gradientHeightPercent: number
    gradientColor: string
    placeholderColor: string
  }

  avatar: {
    sizePx: number
    borderRadius: number
    borderWidth: number
    borderColor: string
    positionX: number
    positionY: number
    gapFromHeadline: number
  }

  flag: {
    sizePx: number
    offsetX: number
    offsetY: number
    source: 'flagpedia-waving' | 'flagpedia-flat'
    flagpediaSize: string
    backgroundCircleSizePx: number
    borderRadius: number
  }

  date: {
    fontSize: number
    color: string
    opacity: number
    positionTop: number
    positionLeft: number
  }

  sourceTag: {
    fontSize: number
    fontWeight: number
    color: string
    backgroundColor: string
    positionX: number
    positionY: number
    paddingX: number
    paddingY: number
    lineWidth: number
    lineColor: string
    marginBottom: number
  }

  headline: {
    arabic: HeadlineFontConfig
    english: HeadlineFontConfig
    shadow: ShadowConfig
    marginBottom: number
    maxLines: number
    shrinkStepPercent: number
    minFontSizePercent: number
    fontSize: number
    fontWeight: number
    lineHeight: number
    letterSpacing: number
    color: string
    englishScale: number
  }

  bullets: {
    arabic: FontStyleConfig
    english: FontStyleConfig
    shadow: ShadowConfig
    iconShadow: ShadowConfig
    gap: number
    lineSpacingPx: number
    anchorY: number
    positionX: number
    borderLineWidth: number
    borderLineColor: string
    iconSymbol: string
    iconSize: number
    iconColor: string
    iconOffsetX: number
    iconOffsetY: number
    paddingRight: number
    marginBottom: number
    dotSize: number
    dotColor: string
    dotOffsetX: number
    fontSize: number
    fontWeight: number
    lineHeight: number
    color: string
    englishScale: number
    iconType: string
  }

  notes: {
    fontSize: number
    color: string
    lineHeight: number
    fontStyle: 'normal' | 'italic'
    marginTop: number
  }

  brand: {
    text: string
    handle: string
    fontSize: number
    fontWeight: number
    color: string
    opacity: number
    letterSpacing: number
    paddingTop: number
    paddingBottom: number
    showBrandText: boolean
    showHandle: boolean
    handleFontSize: number
    handleColor: string
    handleOpacity: number
  }

  content: {
    paddingX: number
    overlapHeroPx: number
  }

  fonts: {
    arabic: string
    english: string
  }
}

export const DEFAULT_POSTER_CONFIG: PosterDesignConfig = {
  aspectRatio: '9:16',
  canvasWidth: 1080,
  canvasHeight: 1920,
  backgroundColor: '#f7f7f7',
  backgroundGradient: {
    enabled: false,
    colorEnd: '#e8e8e8',
    angle: 180,
  },
  pattern: {
    type: 'waves',
    color: '#ffffff',
    opacity: 0.48,
    scale: 0.9,
    strokeWidth: 1.9,
    wavelength: 1.7,
    gradientEnabled: true,
    gradientColorEnd: '#aaa6c9',
    gradientAngle: 0,
    gradientMode: 'overall',
  },

  hero: {
    heightPercent: 37,
    style: 'glass-refraction',
    glass: {
      innerCircleSizePx: 382,
      outerCircleSizePx: 452,
      blurAmount: 28,
      opacity: 0.63,
    },
    plain: {
      imageWidthPercent: 88,
      imageHeightPercent: 94,
      borderRadius: 4,
      shadowIntensity: 0.89,
      shadowBlur: 13,
      shadowOffsetY: 9,
    },
    gradientHeightPercent: 0,
    gradientColor: '#f9f9f9',
    placeholderColor: '#e5e5e5',
  },

  avatar: {
    sizePx: 121,
    borderRadius: 163,
    borderWidth: 12,
    borderColor: 'rgba(0,0,0,0.08)',
    positionX: 239,
    positionY: -230,
    gapFromHeadline: 44,
  },

  flag: {
    sizePx: 47,
    offsetX: 34,
    offsetY: -11,
    source: 'flagpedia-waving',
    flagpediaSize: '256x192',
    backgroundCircleSizePx: 96,
    borderRadius: 28,
  },

  date: {
    fontSize: 37,
    color: '#757c7d',
    opacity: 0,
    positionTop: 500,
    positionLeft: 486,
  },

  sourceTag: {
    fontSize: 30,
    fontWeight: 900,
    color: '#ffffff',
    backgroundColor: '#000000',
    positionX: 8,
    positionY: -5,
    paddingX: 21,
    paddingY: 4,
    lineWidth: 36,
    lineColor: 'rgba(173,179,180,0.3)',
    marginBottom: -12,
  },

  headline: {
    arabic: {
      fontSize: 76,
      fontWeight: 700,
      lineHeight: 1.05,
      letterSpacing: -1,
      color: '#000000',
    },
    english: {
      fontSize: 60,
      fontWeight: 700,
      lineHeight: 1.25,
      letterSpacing: -1.5,
      color: '#000000',
    },
    shadow: {
      offsetX: 1,
      offsetY: 3,
      blur: 3,
      color: '#ccd2ff',
      opacity: 0.94,
    },
    marginBottom: 17,
    maxLines: 3,
    shrinkStepPercent: 5,
    minFontSizePercent: 58,
    fontSize: 84,
    fontWeight: 700,
    lineHeight: 1.25,
    letterSpacing: 0,
    color: '#000000',
    englishScale: 0.9,
  },

  bullets: {
    arabic: {
      fontSize: 63,
      fontWeight: 400,
      lineHeight: 0.5,
      color: '#3d4b7f',
    },
    english: {
      fontSize: 45,
      fontWeight: 400,
      lineHeight: 1.5,
      color: '#3d4b7f',
    },
    shadow: {
      offsetX: 2,
      offsetY: 3,
      blur: 3,
      color: '#b8b8b8',
      opacity: 0.62,
    },
    iconShadow: {
      offsetX: 4,
      offsetY: 7,
      blur: 4,
      color: '#b8b8b8',
      opacity: 0.74,
    },
    gap: 41,
    lineSpacingPx: 0,
    anchorY: 314,
    positionX: -20,
    borderLineWidth: 0,
    borderLineColor: 'rgba(95,94,94,0.2)',
    iconSymbol: '←',
    iconSize: 66,
    iconColor: '#3d4b7f',
    iconOffsetX: 7,
    iconOffsetY: -1,
    paddingRight: -21,
    marginBottom: 43,
    dotSize: 10,
    dotColor: '#5f5e5e',
    dotOffsetX: -9,
    fontSize: 48,
    fontWeight: 400,
    lineHeight: 1,
    color: '#5a6061',
    englishScale: 0.5,
    iconType: 'image',
  },

  notes: {
    fontSize: 39,
    color: '#2d3435',
    lineHeight: 1.5,
    fontStyle: 'italic',
    marginTop: 20,
  },

  brand: {
    text: 'حسن يوجز',
    handle: '@Hassan Alsharif',
    fontSize: 43,
    fontWeight: 300,
    color: '#2d3435',
    opacity: 0.35,
    letterSpacing: 1,
    paddingTop: 15,
    paddingBottom: 73,
    showBrandText: true,
    showHandle: true,
    handleFontSize: 23,
    handleColor: '#c2c2c2',
    handleOpacity: 1,
  },

  content: {
    paddingX: 84,
    overlapHeroPx: 60,
  },

  fonts: {
    arabic: 'Manal',
    english: 'SourceSerif',
  },
}

export const DEFAULT_POSTER_CONFIG_4x5: PosterDesignConfig = {
  ...DEFAULT_POSTER_CONFIG,
  aspectRatio: '4:5',
  canvasHeight: 1440,
  hero: {
    ...DEFAULT_POSTER_CONFIG.hero,
    heightPercent: 35,
    glass: {
      ...DEFAULT_POSTER_CONFIG.hero.glass,
      innerCircleSizePx: 360,
      outerCircleSizePx: 440,
    },
  },
  headline: {
    ...DEFAULT_POSTER_CONFIG.headline,
    arabic: { ...DEFAULT_POSTER_CONFIG.headline.arabic, fontSize: 60 },
    english: { ...DEFAULT_POSTER_CONFIG.headline.english, fontSize: 44 },
    marginBottom: 28,
  },
  bullets: {
    ...DEFAULT_POSTER_CONFIG.bullets,
    arabic: { ...DEFAULT_POSTER_CONFIG.bullets.arabic, fontSize: 56 },
    english: { ...DEFAULT_POSTER_CONFIG.bullets.english, fontSize: 36 },
    gap: 50,
    anchorY: 250,
    iconSize: 48,
  },
  brand: {
    ...DEFAULT_POSTER_CONFIG.brand,
    fontSize: 44,
    paddingBottom: 36,
    paddingTop: 20,
  },
  content: {
    ...DEFAULT_POSTER_CONFIG.content,
    overlapHeroPx: 64,
  },
}
