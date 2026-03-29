'use client'

import { useState, useEffect, useCallback } from 'react'
import { PosterCanvas, type PosterCanvasData } from '@/lib/hsnyojz/poster-view'
import type { PosterDesignConfig } from '@/lib/hsnyojz/poster-config'

interface RenderData {
  config: PosterDesignConfig
  data: PosterCanvasData
  imageBase64: string | null
  avatarBase64: string | null
  flagImageSrc: string | null
}

declare global {
  interface Window {
    __pageReady?: boolean
    __setPosterData?: (data: RenderData) => void
    __debugStyles?: Record<string, unknown>
  }
}

export default function RenderImagePage() {
  const [renderData, setRenderData] = useState<RenderData | null>(null)

  const setPosterData = useCallback((data: RenderData) => {
    setRenderData(data)
    // #region agent log
    requestAnimationFrame(() => requestAnimationFrame(() => {
      function getElDebug(selector: string) {
        const el = document.querySelector(`[data-debug="${selector}"]`) as HTMLElement | null
        if (!el) return { selector, error: 'not found' }
        const cs = getComputedStyle(el)
        const rect = el.getBoundingClientRect()
        return {
          selector,
          fontSize: cs.fontSize,
          lineHeight: cs.lineHeight,
          fontFamily: cs.fontFamily,
          fontWeight: cs.fontWeight,
          letterSpacing: cs.letterSpacing,
          width: Math.round(rect.width * 100) / 100,
          height: Math.round(rect.height * 100) / 100,
        }
      }
      window.__debugStyles = {
        userAgent: navigator.userAgent,
        fonts: {
          manal400: document.fonts.check('400 63px Manal'),
          manal700: document.fonts.check('700 76px Manal'),
          manal900: document.fonts.check('900 76px Manal'),
          sourceSerif700: document.fonts.check('700 60px "Source Serif 4"'),
        },
        headline: getElDebug('headline'),
        bulletsContainer: getElDebug('bullets-container'),
        bullet0: getElDebug('bullet-0'),
        bullet1: getElDebug('bullet-1'),
        bullet2: getElDebug('bullet-2'),
        posterRect: (() => {
          const p = document.getElementById('poster')
          if (!p) return null
          const r = p.getBoundingClientRect()
          return { width: r.width, height: r.height }
        })(),
      }
    }))
    // #endregion
  }, [])

  useEffect(() => {
    window.__setPosterData = setPosterData
    window.__pageReady = true
    return () => {
      delete window.__setPosterData
      delete window.__pageReady
    }
  }, [setPosterData])

  return (
    <>
      <style>{`
        @font-face { font-family: 'Manal'; src: url('/fonts/ah-manal-light.ttf') format('truetype'); font-weight: 300; font-style: normal; }
        @font-face { font-family: 'Manal'; src: url('/fonts/ah-manal-medium.ttf') format('truetype'); font-weight: 400; font-style: normal; }
        @font-face { font-family: 'Manal'; src: url('/fonts/ah-manal-bold.ttf') format('truetype'); font-weight: 700; font-style: normal; }
        @font-face { font-family: 'Manal'; src: url('/fonts/ah-manal-black.ttf') format('truetype'); font-weight: 900; font-style: normal; }
        @font-face { font-family: 'Source Serif 4'; src: url('/fonts/source-serif-4-regular.ttf') format('truetype'); font-weight: 400; font-style: normal; }
        @font-face { font-family: 'Source Serif 4'; src: url('/fonts/source-serif-4-semibold.ttf') format('truetype'); font-weight: 600; font-style: normal; }
        @font-face { font-family: 'Source Serif 4'; src: url('/fonts/source-serif-4-bold.ttf') format('truetype'); font-weight: 700; font-style: normal; }
        @font-face { font-family: 'Rawasi Arabic'; src: url('/fonts/itfRawasiArabic-Regular.otf') format('opentype'); font-weight: 400; font-style: normal; }
      `}</style>

      {renderData ? (
        <PosterCanvas
          config={renderData.config}
          data={renderData.data}
          imageBase64={renderData.imageBase64}
          avatarBase64={renderData.avatarBase64}
          flagImageSrc={renderData.flagImageSrc}
          rootId="poster"
        />
      ) : (
        <div style={{ padding: 40, fontFamily: 'sans-serif', color: '#999' }}>
          Waiting for render data...
        </div>
      )}
    </>
  )
}
