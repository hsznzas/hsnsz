'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  DEFAULT_SECTIONS,
  SECTION_META,
  STANCE_KEYS,
  SECTION_KEYS,
} from '@/lib/hsnyojz/prompt-config'
import type { PromptSections } from '@/lib/hsnyojz/prompt-config'

// ─── Poster Tuner types & defaults ───

const SAMPLE = {
  headline: 'الذكاء الاصطناعي يغير قواعد اللعبة في قطاع التقنية العالمي',
  bullets: [
    'شركة OpenAI تطلق نموذجها الجديد بقدرات غير مسبوقة في التحليل والاستنتاج',
    'المملكة العربية السعودية تستثمر 40 مليار دولار في البنية التحتية الرقمية',
    'خبراء يحذرون من التأثيرات المحتملة على سوق العمل خلال السنوات الخمس القادمة',
  ],
  sourceLabel: 'رويترز',
  sourceLabel: 'رويترز',
}

type Params = {
  headlineWordGap: number
  headlineLetterSpacing: number
  headlineLineHeight: number
  headlineTextScale: number
  bulletWordGap: number
  bulletLetterSpacing: number
  bulletLineHeight: number
  bulletTextScale: number
  bulletLineSpacing: number
  sourceSpacing: number
  sourceTextScale: number
  footerBottom: number
  sidePadding: number
}

const DEFAULTS: Params = {
  headlineWordGap: 19,
  headlineLetterSpacing: -2.5,
  headlineLineHeight: 0.85,
  headlineTextScale: 100,
  bulletWordGap: 9,
  bulletLetterSpacing: 0,
  bulletLineHeight: 0.7,
  bulletTextScale: 123,
  bulletLineSpacing: 96,
  sourceSpacing: 38,
  sourceTextScale: 200,
  footerBottom: 200,
  sidePadding: 91,
}

// ─── Main page ───

type Tab = 'poster' | 'prompt'

export default function TunePage() {
  const [activeTab, setActiveTab] = useState<Tab>('poster')

  // Poster state
  const [params, setParams] = useState<Params>(DEFAULTS)
  const [posterUrl, setPosterUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Prompt state
  const [sections, setSections] = useState<PromptSections | null>(null)
  const [loadingSections, setLoadingSections] = useState(false)
  const [savingSections, setSavingSections] = useState(false)
  const [promptError, setPromptError] = useState('')
  const [promptSuccess, setPromptSuccess] = useState('')
  const [dirty, setDirty] = useState(false)
  const promptLoaded = useRef(false)

  // ─── Poster logic ───

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
  headlineWordGap: ${params.headlineWordGap},
  headlineLetterSpacing: ${params.headlineLetterSpacing},
  headlineLineHeight: ${params.headlineLineHeight},
  headlineTextScale: ${params.headlineTextScale},
  bulletWordGap: ${params.bulletWordGap},
  bulletLetterSpacing: ${params.bulletLetterSpacing},
  bulletLineHeight: ${params.bulletLineHeight},
  bulletTextScale: ${params.bulletTextScale},
  bulletLineSpacing: ${params.bulletLineSpacing},
  sourceSpacing: ${params.sourceSpacing},
  sourceTextScale: ${params.sourceTextScale},
  footerBottom: ${params.footerBottom},
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

  // ─── Prompt logic ───

  const loadSections = useCallback(async () => {
    setLoadingSections(true)
    setPromptError('')
    try {
      const res = await fetch('/api/hsnyojz/prompt')
      const data = await res.json()
      setSections(data.sections)
      setDirty(false)
    } catch {
      setPromptError('Failed to load prompt sections')
      setSections(DEFAULT_SECTIONS)
    } finally {
      setLoadingSections(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'prompt' && !promptLoaded.current) {
      promptLoaded.current = true
      loadSections()
    }
  }, [activeTab, loadSections])

  const updateSection = (key: keyof PromptSections, value: string) => {
    setSections((prev) => (prev ? { ...prev, [key]: value } : prev))
    setDirty(true)
    setPromptSuccess('')
  }

  const handleSave = async () => {
    if (!sections) return
    setSavingSections(true)
    setPromptError('')
    setPromptSuccess('')
    try {
      const res = await fetch('/api/hsnyojz/prompt', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Save failed')
      }
      const data = await res.json()
      setSections(data.sections)
      setDirty(false)
      setPromptSuccess('Saved')
      setTimeout(() => setPromptSuccess(''), 2000)
    } catch (err) {
      setPromptError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSavingSections(false)
    }
  }

  const handleResetPrompt = () => {
    setSections({ ...DEFAULT_SECTIONS })
    setDirty(true)
    setPromptSuccess('')
  }

  // ─── Render ───

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
      {/* Tab bar */}
      <div className="sticky top-0 z-10 bg-slate-100/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-[1600px] mx-auto px-6 flex gap-1 pt-4 pb-0">
          <TabButton active={activeTab === 'poster'} onClick={() => setActiveTab('poster')}>
            Poster Tuner
          </TabButton>
          <TabButton active={activeTab === 'prompt'} onClick={() => setActiveTab('prompt')}>
            System Prompt
          </TabButton>
        </div>
      </div>

      {/* ═══ Poster Tuner Tab ═══ */}
      {activeTab === 'poster' && (
        <div className="flex flex-col lg:flex-row gap-6 p-6 max-w-[1600px] mx-auto">
          <div className="lg:w-[420px] shrink-0 space-y-5">
            <div>
              <h1 className="text-2xl font-bold">Poster Tuner</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Adjust spacing values and see the poster update live.
              </p>
            </div>

            <fieldset className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-4">
              <legend className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide px-1">
                Headline
              </legend>
              <SliderRow label="Word Gap" value={params.headlineWordGap} min={0} max={80} unit="px" onChange={(v) => update({ headlineWordGap: v })} />
              <SliderRow label="Letter Spacing" value={params.headlineLetterSpacing} min={-6} max={6} step={0.5} unit="px" onChange={(v) => update({ headlineLetterSpacing: v })} />
              <SliderRow label="Line Height" value={params.headlineLineHeight} min={0.7} max={1.8} step={0.05} unit="" onChange={(v) => update({ headlineLineHeight: v })} />
              <SliderRow label="Text Size" value={params.headlineTextScale} min={50} max={150} step={1} unit="%" onChange={(v) => update({ headlineTextScale: v })} />
            </fieldset>

            <fieldset className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-4">
              <legend className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide px-1">
                Bullets
              </legend>
              <SliderRow label="Word Gap" value={params.bulletWordGap} min={0} max={80} unit="px" onChange={(v) => update({ bulletWordGap: v })} />
              <SliderRow label="Line Height" value={params.bulletLineHeight} min={0.7} max={2.0} step={0.05} unit="" onChange={(v) => update({ bulletLineHeight: v })} />
              <SliderRow label="Letter Spacing" value={params.bulletLetterSpacing} min={-4} max={6} step={0.5} unit="px" onChange={(v) => update({ bulletLetterSpacing: v })} />
              <SliderRow label="Text Size" value={params.bulletTextScale} min={50} max={150} step={1} unit="%" onChange={(v) => update({ bulletTextScale: v })} />
              <SliderRow label="Lines Spacing" value={params.bulletLineSpacing} min={-20} max={100} step={1} unit="px" onChange={(v) => update({ bulletLineSpacing: v })} />
            </fieldset>

            <fieldset className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-4">
              <legend className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide px-1">
                Layout
              </legend>
              <SliderRow label="Side Padding" value={params.sidePadding} min={40} max={250} unit="px" onChange={(v) => update({ sidePadding: v })} />
              <SliderRow label="Source Tag Padding" value={params.sourceSpacing} min={0} max={40} step={1} unit="px" onChange={(v) => update({ sourceSpacing: v })} />
              <SliderRow label="Source Tag Size" value={params.sourceTextScale} min={50} max={200} step={1} unit="%" onChange={(v) => update({ sourceTextScale: v })} />
              <SliderRow label="Footer Position" value={params.footerBottom} min={0} max={200} step={1} unit="px" onChange={(v) => update({ footerBottom: v })} />
            </fieldset>

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
      )}

      {/* ═══ System Prompt Tab ═══ */}
      {activeTab === 'prompt' && (
        <div className="max-w-3xl mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">System Prompt</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Edit the AI personality, stances, and output rules.
              </p>
            </div>
            {dirty && (
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 rounded-full">
                Unsaved changes
              </span>
            )}
          </div>

          {promptError && (
            <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
              {promptError}
            </div>
          )}

          {promptSuccess && (
            <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-700 dark:text-emerald-300">
              {promptSuccess}
            </div>
          )}

          {loadingSections && !sections && (
            <div className="text-sm text-slate-500 dark:text-slate-400 animate-pulse py-12 text-center">
              Loading prompt...
            </div>
          )}

          {sections && (
            <>
              {/* Intro */}
              <SectionCard
                sectionKey="intro"
                label={SECTION_META.intro.label}
                description={SECTION_META.intro.description}
                value={sections.intro}
                onChange={(v) => updateSection('intro', v)}
                rows={2}
              />

              {/* Identity */}
              <SectionCard
                sectionKey="identity"
                label={SECTION_META.identity.label}
                description={SECTION_META.identity.description}
                value={sections.identity}
                onChange={(v) => updateSection('identity', v)}
              />

              {/* Tone */}
              <SectionCard
                sectionKey="tone"
                label={SECTION_META.tone.label}
                description={SECTION_META.tone.description}
                value={sections.tone}
                onChange={(v) => updateSection('tone', v)}
              />

              {/* Stances group */}
              <div className="pt-2">
                <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">
                  المواقف حسب الموضوع
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Per-topic stance. Each topic is injected as a separate block.
                </p>
                <div className="space-y-4">
                  {STANCE_KEYS.map((key) => (
                    <SectionCard
                      key={key}
                      sectionKey={key}
                      label={SECTION_META[key].label}
                      description={SECTION_META[key].description}
                      value={sections[key]}
                      onChange={(v) => updateSection(key, v)}
                    />
                  ))}
                </div>
              </div>

              {/* Rules */}
              <SectionCard
                sectionKey="rules"
                label={SECTION_META.rules.label}
                description={SECTION_META.rules.description}
                value={sections.rules}
                onChange={(v) => updateSection('rules', v)}
              />

              {/* Output format */}
              <SectionCard
                sectionKey="output_format"
                label={SECTION_META.output_format.label}
                description={SECTION_META.output_format.description}
                value={sections.output_format}
                onChange={(v) => updateSection('output_format', v)}
              />

              {/* Actions */}
              <div className="flex gap-3 pt-2 pb-8 sticky bottom-0 bg-gradient-to-t from-slate-100 dark:from-slate-950 via-slate-100/95 dark:via-slate-950/95 to-transparent pt-6 -mx-6 px-6">
                <button
                  onClick={handleSave}
                  disabled={savingSections || !dirty}
                  className="flex-1 px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {savingSections ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={handleResetPrompt}
                  className="px-4 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                >
                  Reset to Defaults
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Components ───

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
        active
          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-b-0 border-slate-200 dark:border-slate-700'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
      }`}
    >
      {children}
    </button>
  )
}

function SectionCard({
  sectionKey,
  label,
  description,
  value,
  onChange,
  rows,
}: {
  sectionKey: string
  label: string
  description: string
  value: string
  onChange: (v: string) => void
  rows?: number
}) {
  const lineCount = value.split('\n').length
  const computedRows = rows ?? Math.max(3, Math.min(lineCount + 1, 14))

  return (
    <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{label}</span>
          <span className="text-xs text-slate-400 dark:text-slate-500 ml-2">{description}</span>
        </div>
        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-600">{sectionKey}</span>
      </div>
      <textarea
        dir="rtl"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={computedRows}
        className="w-full px-4 py-3 bg-transparent text-sm leading-relaxed text-slate-700 dark:text-slate-300 resize-y focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder:text-slate-400 font-sans"
      />
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
