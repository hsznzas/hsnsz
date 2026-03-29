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
  }
}

export default function RenderImagePage() {
  const [renderData, setRenderData] = useState<RenderData | null>(null)

  const setPosterData = useCallback((data: RenderData) => {
    setRenderData(data)
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
