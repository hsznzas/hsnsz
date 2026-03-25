'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

const SAMPLE = {
  headline: 'الذكاء الاصطناعي يغير قواعد اللعبة في قطاع التقنية العالمي',
  bullets: [
    'شركة OpenAI تطلق نموذجها الجديد بقدرات غير مسبوقة في التحليل والاستنتاج',
    'المملكة العربية السعودية تستثمر 40 مليار دولار في البنية التحتية الرقمية',
    'خبراء يحذرون من التأثيرات المحتملة على سوق العمل خلال السنوات الخمس القادمة',
  ],
  sourceLabel: 'رويترز',
}

type Params = {
  headlineGap: string
  headlineLetterSpacing: number
  headlineLineHeight: number
  bulletGap: string
  bulletLetterSpacing: number
  sidePadding: number
}

const DEFAULTS: Params = {
  headlineGap: '0px 19px',
  headlineLetterSpacing: -2.5,
  headlineLineHeight: 0.85,
  bulletGap: '0px 9px',
  bulletLetterSpacing: -0.5,
  sidePadding: 189,
}

function parseGap(gap: string): { row: number; col: number } {
  const parts = gap.split(/\s+/)
  return {
    row: parseInt(parts[0]) || 0,
    col: parseInt(parts[1]) || 0,
  }
}

function toGap(row: number, col: number): string {
  return `${row}px ${col}px`
}

export default function TunePage() {
  const [params, setParams] = useState<Params>(DEFAULTS)
  const [posterUrl, setPosterUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const headlineGapParsed = parseGap(params.headlineGap)
  const bulletGapParsed = parseGap(params.bulletGap)

  const renderPoster = useCallback(async (p: Params) => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/hsnyojz/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: SAMPLE,
          styleOverrides: p,
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Render failed')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      setPosterUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return url
      })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    renderPoster(DEFAULTS)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const update = useCallback(
    (patch: Partial<Params>) => {
      setParams((prev) => {
        const next = { ...prev, ...patch }
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => renderPoster(next), 300)
        return next
      })
    },
    [renderPoster],
  )

  const codeSnippet = `{
  sidePadding: ${params.sidePadding},
  headlineGap: '${params.headlineGap}',
  headlineLetterSpacing: ${params.headlineLetterSpacing},
  headlineLineHeight: ${params.headlineLineHeight},
  bulletGap: '${params.bulletGap}',
  bulletLetterSpacing: ${params.bulletLetterSpacing},
}`

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleReset = () => {
    setParams(DEFAULTS)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    renderPoster(DEFAULTS)
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
      <div className="flex flex-col lg:flex-row gap-6 p-6 max-w-[1600px] mx-auto">
        {/* Controls Panel */}
        <div className="lg:w-[420px] shrink-0 space-y-5">
          <div>
            <h1 className="text-2xl font-bold">Poster Tuner</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Adjust spacing values and see the poster update live.
            </p>
          </div>

          {/* Headline section */}
          <fieldset className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-4">
            <legend className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide px-1">
              Headline
            </legend>

            <SliderRow
              label="Word Gap (horizontal)"
              value={headlineGapParsed.col}
              min={0}
              max={80}
              unit="px"
              onChange={(v) => update({ headlineGap: toGap(headlineGapParsed.row, v) })}
            />
            <SliderRow
              label="Line Gap (vertical)"
              value={headlineGapParsed.row}
              min={0}
              max={40}
              unit="px"
              onChange={(v) => update({ headlineGap: toGap(v, headlineGapParsed.col) })}
            />
            <SliderRow
              label="Letter Spacing"
              value={params.headlineLetterSpacing}
              min={-6}
              max={6}
              step={0.5}
              unit="px"
              onChange={(v) => update({ headlineLetterSpacing: v })}
            />
            <SliderRow
              label="Line Height"
              value={params.headlineLineHeight}
              min={0.7}
              max={1.8}
              step={0.05}
              unit=""
              onChange={(v) => update({ headlineLineHeight: v })}
            />
          </fieldset>

          {/* Bullets section */}
          <fieldset className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-4">
            <legend className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide px-1">
              Bullets
            </legend>

            <SliderRow
              label="Word Gap (horizontal)"
              value={bulletGapParsed.col}
              min={0}
              max={80}
              unit="px"
              onChange={(v) => update({ bulletGap: toGap(bulletGapParsed.row, v) })}
            />
            <SliderRow
              label="Line Gap (vertical)"
              value={bulletGapParsed.row}
              min={0}
              max={20}
              unit="px"
              onChange={(v) => update({ bulletGap: toGap(v, bulletGapParsed.col) })}
            />
            <SliderRow
              label="Letter Spacing"
              value={params.bulletLetterSpacing}
              min={-4}
              max={6}
              step={0.5}
              unit="px"
              onChange={(v) => update({ bulletLetterSpacing: v })}
            />
          </fieldset>

          {/* Layout section */}
          <fieldset className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-4">
            <legend className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide px-1">
              Layout
            </legend>

            <SliderRow
              label="Side Padding"
              value={params.sidePadding}
              min={40}
              max={250}
              unit="px"
              onChange={(v) => update({ sidePadding: v })}
            />
          </fieldset>

          {/* Code output */}
          <div className="relative">
            <pre className="p-4 rounded-xl bg-slate-800 text-slate-200 text-xs font-mono overflow-x-auto whitespace-pre">
              {codeSnippet}
            </pre>
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 px-2.5 py-1 rounded-md bg-slate-700 text-slate-300 text-xs hover:bg-slate-600 transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <button
            onClick={handleReset}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            Reset to Defaults
          </button>
        </div>

        {/* Poster Preview */}
        <div className="flex-1 flex flex-col items-center gap-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300 w-full max-w-sm text-center">
              {error}
            </div>
          )}
          {posterUrl && (
            <div className="aspect-[9/16] w-full max-w-[400px] rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700">
              <img
                src={posterUrl}
                alt="Poster preview"
                className="w-full h-full object-cover"
              />
            </div>
          )}
          {loading && (
            <div className="text-sm text-slate-500 dark:text-slate-400 animate-pulse">
              Rendering...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit: string
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
        <span className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-emerald-600"
      />
    </div>
  )
}
