'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  DEFAULT_SECTIONS,
  SECTION_META,
  STANCE_KEYS,
} from '@/lib/hsnyojz/prompt-config'
import type { PromptSections } from '@/lib/hsnyojz/prompt-config'

// ─── Poster Tuner types & defaults ───

const SAMPLE = {
  headline: 'آبل تكشف عن رقاقة M5 بأداء يتفوق على جميع المنافسين',
  bullets: [
    'الرقاقة الجديدة أسرع بثلاث مرات من الجيل السابق في مهام الذكاء الاصطناعي',
    'تيم كوك: هذه أقوى شريحة صنعناها على الإطلاق',
    'المحللون يتوقعون ارتفاع سهم آبل بعد الإعلان',
  ],
  sourceLabel: 'بلومبرغ',
  customNotes: '',
}

const DUMMY_AVATAR_BASE64 = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiB2aWV3Qm94PSIwIDAgMTIwIDEyMCI+CiAgPHJlY3Qgd2lkdGg9IjEyMCIgaGVpZ2h0PSIxMjAiIHJ4PSI4IiBmaWxsPSIjZTJlOGYwIi8+CiAgPGNpcmNsZSBjeD0iNjAiIGN5PSI0MiIgcj0iMjIiIGZpbGw9IiM5NGEzYjgiLz4KICA8ZWxsaXBzZSBjeD0iNjAiIGN5PSIxMDAiIHJ4PSIzNSIgcnk9IjI4IiBmaWxsPSIjOTRhM2I4Ii8+Cjwvc3ZnPg=='

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
  contentTop: number
  headlineBulletsGap: number
  avatarSize: number
  avatarBorderRadius: number
  avatarGap: number
  avatarOffsetY: number
  flagSize: number
  flagOffsetBottom: number
  flagOffsetHorizontal: number
  flagEmojiSize: number
  dateTop: number
  dateLeft: number
  dateFontSize: number
  headlineShadowX: number
  headlineShadowY: number
  headlineShadowBlur: number
  headlineShadowOpacity: number
  bulletShadowX: number
  bulletShadowY: number
  bulletShadowBlur: number
  bulletShadowOpacity: number
  sourceShadowX: number
  sourceShadowY: number
  sourceShadowBlur: number
  sourceShadowOpacity: number
  dateShadowX: number
  dateShadowY: number
  dateShadowBlur: number
  dateShadowOpacity: number
}

const DEFAULTS: Params = {
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
  sidePadding: 91,
  contentTop: 559,
  headlineBulletsGap: 94,
  avatarSize: 108,
  avatarBorderRadius: 67,
  avatarGap: 25,
  avatarOffsetY: 119,
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

const FLAG_OPTIONS = [
  { emoji: '🇺🇸', label: 'أمريكا' },
  { emoji: '🇸🇦', label: 'السعودية' },
  { emoji: '🇦🇪', label: 'الإمارات' },
  { emoji: '🇨🇳', label: 'الصين' },
  { emoji: '🇬🇧', label: 'بريطانيا' },
  { emoji: '🇯🇵', label: 'اليابان' },
  { emoji: '🇰🇷', label: 'كوريا' },
  { emoji: '🇩🇪', label: 'ألمانيا' },
]

// ─── Main page ───

type Tab = 'poster' | 'prompt'

export default function TunePage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const [activeTab, setActiveTab] = useState<Tab>('poster')

  // Poster state
  const [params, setParams] = useState<Params>(DEFAULTS)
  const [posterUrl, setPosterUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Hero image state
  const [heroImage, setHeroImage] = useState<string | null>(null)
  const heroInputRef = useRef<HTMLInputElement>(null)
  const [heroHeight, setHeroHeight] = useState(860)
  const [heroBlurStart, setHeroBlurStart] = useState(35)
  const [heroBlurEnd, setHeroBlurEnd] = useState(80)
  const [heroFadeStart, setHeroFadeStart] = useState(58)
  const [heroFadeEnd, setHeroFadeEnd] = useState(100)

  // Avatar/flag state
  const [showAvatar, setShowAvatar] = useState(true)
  const [avatarFile, setAvatarFile] = useState<string | null>(null)
  const [showFlag, setShowFlag] = useState(true)
  const [flagEmoji, setFlagEmoji] = useState('🇺🇸')
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // Color state
  const [headlineColor, setHeadlineColor] = useState('#000000')
  const [bulletColor, setBulletColor] = useState('#2a3d66')
  const [sourceTagColor, setSourceTagColor] = useState('#5a6061')
  const [dateColor, setDateColor] = useState('#757c7d')
  const [dateOpacity, setDateOpacity] = useState(70)

  // Shadow color state
  const [headlineShadowColor, setHeadlineShadowColor] = useState('#000000')
  const [bulletShadowColor, setBulletShadowColor] = useState('#000000')
  const [sourceShadowColor, setSourceShadowColor] = useState('#000000')
  const [dateShadowColor, setDateShadowColor] = useState('#000000')

  // Custom notes state
  const [customNotes, setCustomNotes] = useState('')

  // Prompt state
  const [sections, setSections] = useState<PromptSections | null>(null)
  const [loadingSections, setLoadingSections] = useState(false)
  const [savingSections, setSavingSections] = useState(false)
  const [promptError, setPromptError] = useState('')
  const [promptSuccess, setPromptSuccess] = useState('')
  const [dirty, setDirty] = useState(false)
  const promptLoaded = useRef(false)

  // ─── Poster logic ───

  const getAvatarBase64 = useCallback(() => {
    if (!showAvatar) return null
    return avatarFile || DUMMY_AVATAR_BASE64
  }, [showAvatar, avatarFile])

  const getEffectiveFlag = useCallback(() => {
    if (!showAvatar || !showFlag) return null
    return flagEmoji
  }, [showAvatar, showFlag, flagEmoji])

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
          summary: {
            ...SAMPLE,
            customNotes: customNotes || undefined,
          },
          styleOverrides: p,
          avatarBase64: getAvatarBase64(),
          flagEmoji: getEffectiveFlag(),
          imageBase64: heroImage,
          heroOptions: heroImage ? {
            heroHeight,
            blurStart: heroBlurStart / 100,
            blurEnd: heroBlurEnd / 100,
            fadeStart: heroFadeStart / 100,
            fadeEnd: heroFadeEnd / 100,
          } : undefined,
          colorOverrides: {
            headlineColor,
            bulletColor,
            sourceTagColor,
            dateColor,
            dateOpacity,
            headlineShadowColor,
            bulletShadowColor,
            sourceShadowColor,
            dateShadowColor,
          },
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
  }, [getAvatarBase64, getEffectiveFlag, customNotes, heroImage, heroHeight, heroBlurStart, heroBlurEnd, heroFadeStart, heroFadeEnd, headlineColor, bulletColor, sourceTagColor, dateColor, dateOpacity, headlineShadowColor, bulletShadowColor, sourceShadowColor, dateShadowColor])

  useEffect(() => {
    renderPoster(params)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const colorMountRef = useRef(true)
  useEffect(() => {
    if (colorMountRef.current) {
      colorMountRef.current = false
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => renderPoster(params), 300)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headlineColor, bulletColor, sourceTagColor, dateColor, dateOpacity, headlineShadowColor, bulletShadowColor, sourceShadowColor, dateShadowColor])

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

  // Re-render when avatar/flag/notes toggles change
  const triggerRender = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => renderPoster(params), 300)
  }, [renderPoster, params])

  const handleHeroFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setHeroImage(reader.result as string)
      setTimeout(() => triggerRender(), 50)
    }
    reader.readAsDataURL(file)
  }

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setAvatarFile(reader.result as string)
      setTimeout(() => triggerRender(), 50)
    }
    reader.readAsDataURL(file)
  }

  const codeSnippet = `{
  sidePadding: ${params.sidePadding},
  contentTop: ${params.contentTop},
  headlineBulletsGap: ${params.headlineBulletsGap},
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
  avatarSize: ${params.avatarSize},
  avatarBorderRadius: ${params.avatarBorderRadius},
  avatarGap: ${params.avatarGap},
  avatarOffsetY: ${params.avatarOffsetY},
  flagSize: ${params.flagSize},
  flagOffsetBottom: ${params.flagOffsetBottom},
  flagOffsetHorizontal: ${params.flagOffsetHorizontal},
  flagEmojiSize: ${params.flagEmojiSize},
  dateTop: ${params.dateTop},
  dateLeft: ${params.dateLeft},
  dateFontSize: ${params.dateFontSize},
  headlineShadowX: ${params.headlineShadowX},
  headlineShadowY: ${params.headlineShadowY},
  headlineShadowBlur: ${params.headlineShadowBlur},
  headlineShadowOpacity: ${params.headlineShadowOpacity},
  bulletShadowX: ${params.bulletShadowX},
  bulletShadowY: ${params.bulletShadowY},
  bulletShadowBlur: ${params.bulletShadowBlur},
  bulletShadowOpacity: ${params.bulletShadowOpacity},
  sourceShadowX: ${params.sourceShadowX},
  sourceShadowY: ${params.sourceShadowY},
  sourceShadowBlur: ${params.sourceShadowBlur},
  sourceShadowOpacity: ${params.sourceShadowOpacity},
  dateShadowX: ${params.dateShadowX},
  dateShadowY: ${params.dateShadowY},
  dateShadowBlur: ${params.dateShadowBlur},
  dateShadowOpacity: ${params.dateShadowOpacity},
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

  if (!mounted) return <div className="min-h-screen bg-slate-100 dark:bg-slate-950" />

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
      {/* Tab bar */}
      <div className="sticky top-0 z-10 bg-slate-100/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-[2800px] mx-auto px-6 flex gap-1 pt-4 pb-0 items-center">
          <TabButton active={activeTab === 'poster'} onClick={() => setActiveTab('poster')}>
            Poster Tuner
          </TabButton>
          <TabButton active={activeTab === 'prompt'} onClick={() => setActiveTab('prompt')}>
            System Prompt
          </TabButton>
          <div className="flex-1" />
          <a
            href="/hsnyojz/preview"
            className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors mb-1"
          >
            ← Preview
          </a>
        </div>
      </div>

      {/* ═══ Poster Tuner Tab ═══ */}
      {activeTab === 'poster' && (
        <div className="p-6 max-w-[2800px] mx-auto">
          <div className="flex items-baseline justify-between mb-5">
            <div>
              <h1 className="text-2xl font-bold">Poster Tuner</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Adjust spacing, avatar, and flag — see the poster update live.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
              >
                Reset to Defaults
              </button>
              <button
                onClick={handleCopy}
                className="px-4 py-2 rounded-xl bg-slate-800 dark:bg-slate-700 text-slate-200 text-sm font-medium hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
              >
                {copied ? 'Copied!' : 'Copy Config'}
              </button>
            </div>
          </div>
          <div className="flex gap-6 items-start">
            <div className="flex-1 min-w-0 columns-1 lg:columns-2 2xl:columns-3 gap-5 [&>*]:break-inside-avoid [&>*]:mb-5">

            {/* ─── Hero Image Section ─── */}
            <fieldset className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3">
              <legend className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide px-1">
                Hero Image
              </legend>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => heroInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  {heroImage ? 'Change Image' : 'Upload Hero Image'}
                </button>
                {heroImage && (
                  <button
                    onClick={() => {
                      setHeroImage(null)
                      if (heroInputRef.current) heroInputRef.current.value = ''
                      setTimeout(() => triggerRender(), 50)
                    }}
                    className="text-xs text-red-500 hover:text-red-400"
                  >
                    Remove
                  </button>
                )}
                <span className="text-[10px] text-slate-400">
                  {heroImage ? 'Uploaded' : 'No image — pattern only'}
                </span>
              </div>
              {heroImage && (
                <>
                  <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                    <img src={heroImage} alt="Hero preview" className="w-full h-24 object-cover" />
                  </div>
                  {/* Hero Height */}
                  <label className="flex items-center gap-2 text-xs">
                    <span className="min-w-[100px] text-slate-600 dark:text-slate-400">Height</span>
                    <input type="range" min={300} max={1400} value={heroHeight}
                      onChange={e => { setHeroHeight(+e.target.value); triggerRender() }}
                      className="flex-1" />
                    <span className="w-10 text-right font-mono text-slate-500">{heroHeight}</span>
                  </label>
                  {/* Blur Start */}
                  <label className="flex items-center gap-2 text-xs">
                    <span className="min-w-[100px] text-slate-600 dark:text-slate-400">Blur Start %</span>
                    <input type="range" min={0} max={100} value={heroBlurStart}
                      onChange={e => { setHeroBlurStart(+e.target.value); triggerRender() }}
                      className="flex-1" />
                    <span className="w-10 text-right font-mono text-slate-500">{heroBlurStart}</span>
                  </label>
                  {/* Blur End */}
                  <label className="flex items-center gap-2 text-xs">
                    <span className="min-w-[100px] text-slate-600 dark:text-slate-400">Blur End %</span>
                    <input type="range" min={0} max={100} value={heroBlurEnd}
                      onChange={e => { setHeroBlurEnd(+e.target.value); triggerRender() }}
                      className="flex-1" />
                    <span className="w-10 text-right font-mono text-slate-500">{heroBlurEnd}</span>
                  </label>
                  {/* Fade Start */}
                  <label className="flex items-center gap-2 text-xs">
                    <span className="min-w-[100px] text-slate-600 dark:text-slate-400">Fade Start %</span>
                    <input type="range" min={0} max={100} value={heroFadeStart}
                      onChange={e => { setHeroFadeStart(+e.target.value); triggerRender() }}
                      className="flex-1" />
                    <span className="w-10 text-right font-mono text-slate-500">{heroFadeStart}</span>
                  </label>
                  {/* Fade End */}
                  <label className="flex items-center gap-2 text-xs">
                    <span className="min-w-[100px] text-slate-600 dark:text-slate-400">Fade End %</span>
                    <input type="range" min={0} max={100} value={heroFadeEnd}
                      onChange={e => { setHeroFadeEnd(+e.target.value); triggerRender() }}
                      className="flex-1" />
                    <span className="w-10 text-right font-mono text-slate-500">{heroFadeEnd}</span>
                  </label>
                </>
              )}
              <input
                ref={heroInputRef}
                type="file"
                accept="image/*"
                onChange={handleHeroFileChange}
                className="hidden"
              />
            </fieldset>

            {/* ─── Avatar & Flag Section ─── */}
            <fieldset className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-4">
              <legend className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide px-1">
                Avatar &amp; Flag
              </legend>

              {/* Avatar toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700 dark:text-slate-300">Show Avatar</span>
                <button
                  onClick={() => {
                    setShowAvatar((v) => !v)
                    setTimeout(() => triggerRender(), 50)
                  }}
                  className={`relative w-11 h-6 rounded-full transition-colors ${showAvatar ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${showAvatar ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>

              {showAvatar && (
                <>
                  {/* Upload avatar */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      {avatarFile ? 'Change Avatar' : 'Upload Avatar'}
                    </button>
                    {avatarFile && (
                      <button
                        onClick={() => {
                          setAvatarFile(null)
                          setTimeout(() => triggerRender(), 50)
                        }}
                        className="text-xs text-red-500 hover:text-red-400"
                      >
                        Remove
                      </button>
                    )}
                    <span className="text-[10px] text-slate-400">
                      {avatarFile ? 'Custom' : 'Dummy placeholder'}
                    </span>
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                    className="hidden"
                  />

                  {/* Avatar sliders */}
                  <SliderRow label="Avatar Size" value={params.avatarSize} min={40} max={300} unit="px" onChange={(v) => update({ avatarSize: v })} />
                  <SliderRow label="Border Radius" value={params.avatarBorderRadius} min={0} max={150} unit="px" onChange={(v) => update({ avatarBorderRadius: v })} />
                  <SliderRow label="Gap from Headline" value={params.avatarGap} min={0} max={200} unit="px" onChange={(v) => update({ avatarGap: v })} />
                  <SliderRow label="Vertical Offset" value={params.avatarOffsetY} min={-300} max={300} unit="px" onChange={(v) => update({ avatarOffsetY: v })} />

                  {/* Flag toggle */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-slate-700 dark:text-slate-300">Show Flag</span>
                      <button
                        onClick={() => {
                          setShowFlag((v) => !v)
                          setTimeout(() => triggerRender(), 50)
                        }}
                        className={`relative w-11 h-6 rounded-full transition-colors ${showFlag ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                      >
                        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${showFlag ? 'left-[22px]' : 'left-0.5'}`} />
                      </button>
                    </div>
                  </div>

                  {showFlag && (
                    <>
                      {/* Flag picker */}
                      <div className="flex flex-wrap gap-1.5">
                        {FLAG_OPTIONS.map((f) => (
                          <button
                            key={f.emoji}
                            onClick={() => {
                              setFlagEmoji(f.emoji)
                              setTimeout(() => triggerRender(), 50)
                            }}
                            title={f.label}
                            className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                              flagEmoji === f.emoji
                                ? 'bg-emerald-100 dark:bg-emerald-900/40 ring-2 ring-emerald-500 scale-110'
                                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            {f.emoji}
                          </button>
                        ))}
                      </div>

                      {/* Flag sliders */}
                      <SliderRow label="Flag Size" value={params.flagSize} min={16} max={120} unit="px" onChange={(v) => update({ flagSize: v })} />
                      <SliderRow label="Flag Bottom Offset" value={params.flagOffsetBottom} min={-60} max={60} unit="px" onChange={(v) => update({ flagOffsetBottom: v })} />
                      <SliderRow label="Flag Horizontal Offset" value={params.flagOffsetHorizontal} min={-60} max={60} unit="px" onChange={(v) => update({ flagOffsetHorizontal: v })} />
                      <SliderRow label="Flag Emoji Size" value={params.flagEmojiSize} min={8} max={80} unit="px" onChange={(v) => update({ flagEmojiSize: v })} />
                    </>
                  )}
                </>
              )}
            </fieldset>

            {/* ─── Headline Section ─── */}
            <fieldset className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-4">
              <legend className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide px-1">
                Headline
              </legend>
              <SliderRow label="Word Gap" value={params.headlineWordGap} min={0} max={100} unit="px" onChange={(v) => update({ headlineWordGap: v })} />
              <SliderRow label="Letter Spacing" value={params.headlineLetterSpacing} min={-10} max={10} step={0.5} unit="px" onChange={(v) => update({ headlineLetterSpacing: v })} />
              <SliderRow label="Line Height" value={params.headlineLineHeight} min={0.5} max={2.5} step={0.05} unit="" onChange={(v) => update({ headlineLineHeight: v })} />
              <SliderRow label="Text Size" value={params.headlineTextScale} min={30} max={200} step={1} unit="%" onChange={(v) => update({ headlineTextScale: v })} />
              <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Drop Shadow</span>
                <SliderRow label="X Offset" value={params.headlineShadowX} min={-30} max={30} unit="px" onChange={(v) => update({ headlineShadowX: v })} />
                <SliderRow label="Y Offset" value={params.headlineShadowY} min={-30} max={30} unit="px" onChange={(v) => update({ headlineShadowY: v })} />
                <SliderRow label="Blur" value={params.headlineShadowBlur} min={0} max={50} unit="px" onChange={(v) => update({ headlineShadowBlur: v })} />
                <SliderRow label="Opacity" value={params.headlineShadowOpacity} min={0} max={100} unit="%" onChange={(v) => update({ headlineShadowOpacity: v })} />
                <ColorRow label="Color" value={headlineShadowColor} onChange={setHeadlineShadowColor} />
              </div>
            </fieldset>

            {/* ─── Bullets Section ─── */}
            <fieldset className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-4">
              <legend className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide px-1">
                Bullets
              </legend>
              <SliderRow label="Word Gap" value={params.bulletWordGap} min={0} max={100} unit="px" onChange={(v) => update({ bulletWordGap: v })} />
              <SliderRow label="Line Height" value={params.bulletLineHeight} min={0.5} max={2.5} step={0.05} unit="" onChange={(v) => update({ bulletLineHeight: v })} />
              <SliderRow label="Letter Spacing" value={params.bulletLetterSpacing} min={-10} max={10} step={0.5} unit="px" onChange={(v) => update({ bulletLetterSpacing: v })} />
              <SliderRow label="Text Size" value={params.bulletTextScale} min={30} max={200} step={1} unit="%" onChange={(v) => update({ bulletTextScale: v })} />
              <SliderRow label="Lines Spacing" value={params.bulletLineSpacing} min={-40} max={200} step={1} unit="px" onChange={(v) => update({ bulletLineSpacing: v })} />
              <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Drop Shadow</span>
                <SliderRow label="X Offset" value={params.bulletShadowX} min={-30} max={30} unit="px" onChange={(v) => update({ bulletShadowX: v })} />
                <SliderRow label="Y Offset" value={params.bulletShadowY} min={-30} max={30} unit="px" onChange={(v) => update({ bulletShadowY: v })} />
                <SliderRow label="Blur" value={params.bulletShadowBlur} min={0} max={50} unit="px" onChange={(v) => update({ bulletShadowBlur: v })} />
                <SliderRow label="Opacity" value={params.bulletShadowOpacity} min={0} max={100} unit="%" onChange={(v) => update({ bulletShadowOpacity: v })} />
                <ColorRow label="Color" value={bulletShadowColor} onChange={setBulletShadowColor} />
              </div>
            </fieldset>

            {/* ─── Layout Section ─── */}
            <fieldset className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-4">
              <legend className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide px-1">
                Layout
              </legend>
              <SliderRow label="Content Top" value={params.contentTop} min={200} max={900} unit="px" onChange={(v) => update({ contentTop: v })} />
              <SliderRow label="Headline → Bullets Gap" value={params.headlineBulletsGap} min={0} max={200} unit="px" onChange={(v) => update({ headlineBulletsGap: v })} />
              <SliderRow label="Side Padding" value={params.sidePadding} min={20} max={300} unit="px" onChange={(v) => update({ sidePadding: v })} />
              <SliderRow label="Source Tag Padding" value={params.sourceSpacing} min={0} max={60} step={1} unit="px" onChange={(v) => update({ sourceSpacing: v })} />
              <SliderRow label="Source Tag Size" value={params.sourceTextScale} min={50} max={300} step={1} unit="%" onChange={(v) => update({ sourceTextScale: v })} />
              <SliderRow label="Footer Position" value={params.footerBottom} min={0} max={400} step={1} unit="px" onChange={(v) => update({ footerBottom: v })} />
              <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Source Tag Shadow</span>
                <SliderRow label="X Offset" value={params.sourceShadowX} min={-30} max={30} unit="px" onChange={(v) => update({ sourceShadowX: v })} />
                <SliderRow label="Y Offset" value={params.sourceShadowY} min={-30} max={30} unit="px" onChange={(v) => update({ sourceShadowY: v })} />
                <SliderRow label="Blur" value={params.sourceShadowBlur} min={0} max={50} unit="px" onChange={(v) => update({ sourceShadowBlur: v })} />
                <SliderRow label="Opacity" value={params.sourceShadowOpacity} min={0} max={100} unit="%" onChange={(v) => update({ sourceShadowOpacity: v })} />
                <ColorRow label="Color" value={sourceShadowColor} onChange={setSourceShadowColor} />
              </div>
            </fieldset>

            {/* ─── Date Position ─── */}
            <fieldset className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-4">
              <legend className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide px-1">
                Date Label
              </legend>
              <SliderRow label="Top" value={params.dateTop} min={0} max={1800} unit="px" onChange={(v) => update({ dateTop: v })} />
              <SliderRow label="Left" value={params.dateLeft} min={0} max={1000} unit="px" onChange={(v) => update({ dateLeft: v })} />
              <SliderRow label="Font Size" value={params.dateFontSize} min={10} max={60} unit="px" onChange={(v) => update({ dateFontSize: v })} />
              <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Drop Shadow</span>
                <SliderRow label="X Offset" value={params.dateShadowX} min={-30} max={30} unit="px" onChange={(v) => update({ dateShadowX: v })} />
                <SliderRow label="Y Offset" value={params.dateShadowY} min={-30} max={30} unit="px" onChange={(v) => update({ dateShadowY: v })} />
                <SliderRow label="Blur" value={params.dateShadowBlur} min={0} max={50} unit="px" onChange={(v) => update({ dateShadowBlur: v })} />
                <SliderRow label="Opacity" value={params.dateShadowOpacity} min={0} max={100} unit="%" onChange={(v) => update({ dateShadowOpacity: v })} />
                <ColorRow label="Color" value={dateShadowColor} onChange={setDateShadowColor} />
              </div>
            </fieldset>

            {/* ─── Colors ─── */}
            <fieldset className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-4">
              <legend className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide px-1">
                Colors
              </legend>
              <ColorRow label="Headline" value={headlineColor} onChange={setHeadlineColor} />
              <ColorRow label="Bullets" value={bulletColor} onChange={setBulletColor} />
              <ColorRow label="Source Tag" value={sourceTagColor} onChange={setSourceTagColor} />
              <ColorRow label="Date Label" value={dateColor} onChange={setDateColor} />
              <SliderRow label="Date Opacity" value={dateOpacity} min={0} max={100} unit="%" onChange={(v) => setDateOpacity(v)} />
            </fieldset>

            {/* ─── Custom Notes ─── */}
            <fieldset className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3">
              <legend className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide px-1">
                Custom Note
              </legend>
              <textarea
                dir="rtl"
                value={customNotes}
                onChange={(e) => {
                  setCustomNotes(e.target.value)
                  if (debounceRef.current) clearTimeout(debounceRef.current)
                  debounceRef.current = setTimeout(() => renderPoster(params), 500)
                }}
                placeholder="ملاحظة تظهر أسفل النقاط (اختياري)..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-y"
              />
            </fieldset>

            {/* ─── Code Snippet ─── */}
            <div className="relative">
              <pre className="p-4 rounded-xl bg-slate-800 text-slate-200 text-xs font-mono overflow-x-auto whitespace-pre max-h-[300px] overflow-y-auto">
                {codeSnippet}
              </pre>
              <button
                onClick={handleCopy}
                className="absolute top-2 right-2 px-2.5 py-1 rounded-md bg-slate-700 text-slate-300 text-xs hover:bg-slate-600 transition-colors"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            </div>

            {/* ─── Poster Preview Column ─── */}
            <div className="w-[400px] shrink-0">
              <div className="sticky top-[80px] flex flex-col items-center gap-4">
                {error && (
                  <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300 w-full text-center">
                    {error}
                  </div>
                )}
                {posterUrl && (
                  <div className="aspect-[9/16] w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700">
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

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer bg-transparent"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value
            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v)
          }}
          className="w-20 px-2 py-1 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-center"
        />
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
