'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  type PosterDesignConfig,
  DEFAULT_POSTER_CONFIG,
  DEFAULT_POSTER_CONFIG_4x5,
} from '@/lib/hsnyojz/poster-config'
import { PosterCanvas } from '@/lib/hsnyojz/poster-view'
import { getSupabase } from '@/lib/supabase/client'
import { toBlob } from 'html-to-image'

// ── Constants ──

const LS_KEY = 'hsnyojz-poster-config'
const SAMPLE_LS_KEY = 'hsnyojz-sample-text'
const DEBOUNCE_MS = 500
const SYNC_DEBOUNCE_MS = 2000

interface SampleData {
  headline: string
  bullets: string[]
  sourceLabel: string
  customNotes: string | null
}

const BUILTIN_SAMPLE: SampleData = {
  headline: 'أبل تكشف عن iPhone 16 Pro بتصميم جديد كلياً',
  bullets: [
    'شاشة أكبر بقياس 6.9 بوصة مع إطارات أنحف من أي وقت مضى',
    'شريحة A18 Pro الجديدة توفر أداءً أسرع بنسبة 40% في الذكاء الاصطناعي',
    'كاميرا رئيسية بدقة 48 ميجابكسل مع عدسة تيترا بريزم للتقريب البصري 5x',
  ],
  sourceLabel: 'Apple',
  customNotes: null,
}

function loadDefaultSample(): SampleData {
  try {
    const saved = localStorage.getItem(SAMPLE_LS_KEY)
    if (saved) return JSON.parse(saved)
  } catch { /* ignore */ }
  return { ...BUILTIN_SAMPLE, bullets: [...BUILTIN_SAMPLE.bullets] }
}

// ── Helpers ──

function updateNested(
  obj: PosterDesignConfig,
  path: string,
  value: unknown,
): PosterDesignConfig {
  const keys = path.split('.')
  const result = JSON.parse(JSON.stringify(obj)) as Record<string, unknown>
  let current: Record<string, unknown> = result
  for (let i = 0; i < keys.length - 1; i++) {
    current = current[keys[i]] as Record<string, unknown>
  }
  current[keys[keys.length - 1]] = value
  return result as unknown as PosterDesignConfig
}

// ── Reusable Controls ──

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-500">{label}</span>
        <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
      />
    </div>
  )
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  const isHex = /^#[0-9a-fA-F]{6}$/.test(value)
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-slate-500 flex-shrink-0">{label}</span>
      <div className="flex items-center gap-1 flex-1 min-w-0">
        {isHex && (
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-6 h-6 rounded cursor-pointer border-0 p-0"
          />
        )}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 text-[11px] font-mono text-slate-900 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 placeholder:text-slate-500"
        />
      </div>
    </div>
  )
}

function Toggle({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-slate-500">{label}</span>
      <div className="flex rounded-md overflow-hidden border border-slate-200">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex-1 text-[11px] py-1 px-2 transition-colors ${
              value === opt.value
                ? 'bg-indigo-500 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function BoolToggle({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-slate-500">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          value ? 'bg-indigo-500' : 'bg-slate-300'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${
            value ? 'translate-x-[18px]' : 'translate-x-[3px]'
          }`}
        />
      </button>
    </div>
  )
}

function TextInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-slate-500">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-[12px] text-slate-900 bg-slate-100 border border-slate-200 rounded px-2 py-1 placeholder:text-slate-500"
        dir="auto"
      />
    </div>
  )
}

function ShadowControls({
  title,
  path,
  shadow,
  update,
}: {
  title: string
  path: string
  shadow: {
    offsetX: number
    offsetY: number
    blur: number
    color: string
    opacity: number
  }
  update: (path: string, value: unknown) => void
}) {
  return (
    <>
      <hr className="border-slate-100" />
      <div className="text-[10px] font-semibold text-violet-500 uppercase tracking-wider">
        {title}
      </div>
      <Slider
        label="Shadow X"
        value={shadow.offsetX}
        min={-40}
        max={40}
        onChange={(v) => update(`${path}.offsetX`, v)}
      />
      <Slider
        label="Shadow Y"
        value={shadow.offsetY}
        min={-40}
        max={40}
        onChange={(v) => update(`${path}.offsetY`, v)}
      />
      <Slider
        label="Shadow Blur"
        value={shadow.blur}
        min={0}
        max={80}
        onChange={(v) => update(`${path}.blur`, v)}
      />
      <Slider
        label="Shadow Opacity"
        value={shadow.opacity}
        min={0}
        max={1}
        step={0.01}
        onChange={(v) => update(`${path}.opacity`, v)}
      />
      <ColorInput
        label="Shadow Color"
        value={shadow.color}
        onChange={(v) => update(`${path}.color`, v)}
      />
    </>
  )
}

// ── Per-Section JSON Copy ──

function SectionJsonCopy({
  config,
  keys,
}: {
  config: PosterDesignConfig
  keys: (keyof PosterDesignConfig)[]
}) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const partial: Record<string, unknown> = {}
  for (const key of keys) {
    partial[key] = config[key]
  }
  const json = JSON.stringify(partial, null, 2)

  function copy() {
    navigator.clipboard.writeText(json)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mt-1 pt-2 border-t border-slate-100">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setOpen(!open)}
          className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
        >
          {open ? 'Hide' : 'Show'} JSON
        </button>
        <button
          onClick={copy}
          className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded hover:bg-slate-200 transition-colors"
        >
          {copied ? 'Copied!' : 'Copy JSON'}
        </button>
      </div>
      {open && (
        <pre className="mt-1.5 text-[10px] font-mono bg-slate-50 border border-slate-200 rounded p-2 overflow-auto max-h-48 text-slate-600 whitespace-pre-wrap">
          {json}
        </pre>
      )}
    </div>
  )
}

// ── Collapsible Section ──

type SectionMeta = {
  description: string
  accentClass: string
  iconBgClass: string
  iconTextClass: string
  chipClass: string
  icon: 'canvas' | 'image' | 'avatar' | 'calendar' | 'headline' | 'bullets' | 'notes' | 'brand' | 'layout' | 'link'
}

const SECTION_META: Record<string, SectionMeta> = {
  'Canvas': {
    description: 'Background, pattern, and overall base',
    accentClass: 'bg-sky-500',
    iconBgClass: 'bg-sky-100',
    iconTextClass: 'text-sky-600',
    chipClass: 'bg-sky-50 text-sky-700 border-sky-200',
    icon: 'canvas',
  },
  'Hero Image': {
    description: 'Main visual style and image treatment',
    accentClass: 'bg-violet-500',
    iconBgClass: 'bg-violet-100',
    iconTextClass: 'text-violet-600',
    chipClass: 'bg-violet-50 text-violet-700 border-violet-200',
    icon: 'image',
  },
  'Avatar & Flag': {
    description: 'Profile image, flag, and placement',
    accentClass: 'bg-amber-500',
    iconBgClass: 'bg-amber-100',
    iconTextClass: 'text-amber-600',
    chipClass: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: 'avatar',
  },
  'Date & Source': {
    description: 'Top metadata row and tag styling',
    accentClass: 'bg-emerald-500',
    iconBgClass: 'bg-emerald-100',
    iconTextClass: 'text-emerald-600',
    chipClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: 'calendar',
  },
  'Headline': {
    description: 'Primary title typography and shadow',
    accentClass: 'bg-indigo-500',
    iconBgClass: 'bg-indigo-100',
    iconTextClass: 'text-indigo-600',
    chipClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: 'headline',
  },
  'Bullets': {
    description: 'Bullet text, spacing, and symbols',
    accentClass: 'bg-blue-500',
    iconBgClass: 'bg-blue-100',
    iconTextClass: 'text-blue-600',
    chipClass: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: 'bullets',
  },
  'Notes': {
    description: 'Optional note styling under bullets',
    accentClass: 'bg-rose-500',
    iconBgClass: 'bg-rose-100',
    iconTextClass: 'text-rose-600',
    chipClass: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: 'notes',
  },
  'Brand Footer': {
    description: 'Brand text, handle, and footer spacing',
    accentClass: 'bg-fuchsia-500',
    iconBgClass: 'bg-fuchsia-100',
    iconTextClass: 'text-fuchsia-600',
    chipClass: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
    icon: 'brand',
  },
  'Content Area': {
    description: 'Main content position and padding',
    accentClass: 'bg-teal-500',
    iconBgClass: 'bg-teal-100',
    iconTextClass: 'text-teal-600',
    chipClass: 'bg-teal-50 text-teal-700 border-teal-200',
    icon: 'layout',
  },
  'Test Link': {
    description: 'Pull article data into the live preview',
    accentClass: 'bg-orange-500',
    iconBgClass: 'bg-orange-100',
    iconTextClass: 'text-orange-600',
    chipClass: 'bg-orange-50 text-orange-700 border-orange-200',
    icon: 'link',
  },
}

function SectionIcon({ icon }: { icon: SectionMeta['icon'] }) {
  switch (icon) {
    case 'canvas':
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M8 9h8M8 13h5" />
        </svg>
      )
    case 'image':
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="9" cy="10" r="1.5" />
          <path d="M21 15l-4.5-4.5L8 19" />
        </svg>
      )
    case 'avatar':
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 19c1.8-3 4.1-4.5 7-4.5S17.2 16 19 19" />
        </svg>
      )
    case 'calendar':
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M8 3v4M16 3v4M4 9h16" />
        </svg>
      )
    case 'headline':
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M5 7h14M9 7v10M15 7v10M5 12h14" />
        </svg>
      )
    case 'bullets':
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="6" cy="7" r="1" fill="currentColor" />
          <circle cx="6" cy="12" r="1" fill="currentColor" />
          <circle cx="6" cy="17" r="1" fill="currentColor" />
          <path d="M10 7h8M10 12h8M10 17h8" />
        </svg>
      )
    case 'notes':
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M6 4h9l3 3v13H6z" />
          <path d="M15 4v4h4M9 12h6M9 16h4" />
        </svg>
      )
    case 'brand':
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M6 18V6h5a3 3 0 010 6H6m5 0h1.5A3.5 3.5 0 0116 15.5 3.5 3.5 0 0112.5 19H6" />
        </svg>
      )
    case 'layout':
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M4 10h16M10 10v9" />
        </svg>
      )
    case 'link':
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M10 13a4 4 0 000-6l-1-1a4 4 0 10-5.7 5.6l1 1" />
          <path d="M14 11a4 4 0 000 6l1 1a4 4 0 105.7-5.6l-1-1" />
          <path d="M8 12h8" />
        </svg>
      )
  }
}

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const meta = SECTION_META[title] ?? {
    description: 'Design controls',
    accentClass: 'bg-slate-500',
    iconBgClass: 'bg-slate-100',
    iconTextClass: 'text-slate-600',
    chipClass: 'bg-slate-50 text-slate-700 border-slate-200',
    icon: 'layout' as const,
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <div className={`h-1 ${meta.accentClass}`} />
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${meta.iconBgClass} ${meta.iconTextClass}`}>
            <SectionIcon icon={meta.icon} />
          </div>
          <div className="min-w-0 text-left">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-semibold text-slate-800">
                {title}
              </span>
              <span className={`hidden md:inline-flex text-[9px] px-1.5 py-0.5 rounded-full border ${meta.chipClass}`}>
                {open ? 'Open' : 'Closed'}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 truncate">
              {meta.description}
            </div>
          </div>
        </div>
        <svg
          className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {open && (
        <div className="px-3 pb-3 flex flex-col gap-2.5 border-t border-slate-100 pt-2.5">
          {children}
        </div>
      )}
    </div>
  )
}


// ── Poster Preview ──

function PosterPreview({
  config,
  containerWidth,
  testImage,
  testAvatar,
  flagImageSrc,
  sampleData,
}: {
  config: PosterDesignConfig
  containerWidth: number
  testImage: string | null
  testAvatar: string | null
  flagImageSrc: string | null
  sampleData: SampleData
}) {
  const scale = containerWidth / config.canvasWidth

  return (
    <div
      style={{
        width: containerWidth,
        height: config.canvasHeight * scale,
        overflow: 'hidden',
      }}
      className="rounded-lg shadow-md border border-slate-200"
    >
      <div
        style={{
          width: config.canvasWidth,
          height: config.canvasHeight,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          backgroundColor: config.backgroundColor,
          position: 'relative',
        }}
      >
        <PosterCanvas
          config={config}
          data={sampleData}
          imageBase64={testImage}
          avatarBase64={testAvatar}
          flagImageSrc={flagImageSrc}
          showDimensionsBadge
        />
      </div>
    </div>
  )
}

// ── Preset Modal ──

function SavePresetModal({
  onSave,
  onClose,
}: {
  onSave: (name: string) => void
  onClose: () => void
}) {
  const [name, setName] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-xl p-6 shadow-2xl w-80">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">
          Save Preset
        </h3>
        <input
          type="text"
          placeholder="Preset name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          autoFocus
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 text-slate-500 hover:bg-slate-100 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={() => name.trim() && onSave(name.trim())}
            className="text-xs px-3 py-1.5 bg-indigo-500 text-white rounded-md hover:bg-indigo-600"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Editor ──

interface Preset {
  id: string
  name: string
  config: PosterDesignConfig
  aspect_ratio: string
}

export default function PosterEditorPage() {
  const [config, setConfig] = useState<PosterDesignConfig>(DEFAULT_POSTER_CONFIG)
  const [loaded, setLoaded] = useState(false)
  const [presets, setPresets] = useState<Preset[]>([])
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState('')
  const [testImage, setTestImage] = useState<string | null>('/samples/Hero_image.jpg')
  const [testAvatar, setTestAvatar] = useState<string | null>('/samples/Avatar.png')
  const [flagCode, setFlagCode] = useState('sa')
  const previewRef = useRef<HTMLDivElement>(null)
  const [previewWidth, setPreviewWidth] = useState(420)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const syncRef = useRef<ReturnType<typeof setTimeout>>()
  const [sampleData, setSampleData] = useState<SampleData>({ ...BUILTIN_SAMPLE, bullets: [...BUILTIN_SAMPLE.bullets] })
  const [isDefaultSample, setIsDefaultSample] = useState(false)
  const [testUrl, setTestUrl] = useState('')
  const [linkLoading, setLinkLoading] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)

  const captureRef916 = useRef<HTMLDivElement>(null)
  const captureRef4x5 = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState<string | null>(null)
  const [flagDataUrl, setFlagDataUrl] = useState<string | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setConfig((prev) => deepMerge(prev, parsed))
      }
    } catch { /* ignore */ }
    const defaultSample = loadDefaultSample()
    setSampleData(defaultSample)
    setIsDefaultSample(!!localStorage.getItem(SAMPLE_LS_KEY))
    setLoaded(true)
    loadPresets()

    fetch('/api/hsnyojz/design-config')
      .then((r) => r.json())
      .then((serverConfig) => {
        if (!localStorage.getItem(LS_KEY)) {
          setConfig((prev) => deepMerge(prev, serverConfig))
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!loaded) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      localStorage.setItem(LS_KEY, JSON.stringify(config))
    }, DEBOUNCE_MS)
  }, [config, loaded])

  useEffect(() => {
    if (!loaded) return
    if (syncRef.current) clearTimeout(syncRef.current)
    syncRef.current = setTimeout(() => {
      fetch('/api/hsnyojz/design-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      }).catch(() => {})
    }, SYNC_DEBOUNCE_MS)
  }, [config, loaded])

  useEffect(() => {
    const measure = () => {
      if (previewRef.current) {
        setPreviewWidth(previewRef.current.clientWidth - 32)
      }
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const update = useCallback(
    (path: string, value: unknown) => {
      setConfig((prev) => updateNested(prev, path, value))
    },
    [],
  )

  async function loadPresets() {
    const supabase = getSupabase()
    if (!supabase) return
    const { data } = await supabase
      .from('poster_presets')
      .select('id, name, config, aspect_ratio')
      .order('updated_at', { ascending: false })
    if (data) setPresets(data as Preset[])
  }

  async function savePreset(name: string) {
    const supabase = getSupabase()
    if (!supabase) return
    await supabase.from('poster_presets').insert({
      name,
      config: config as unknown as Record<string, unknown>,
      aspect_ratio: config.aspectRatio,
    })
    setShowSaveModal(false)
    loadPresets()
  }

  async function activatePreset() {
    const supabase = getSupabase()
    if (!supabase) return
    const presetName = `Active — ${new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`
    const { data: inserted, error: insertError } = await supabase
      .from('poster_presets')
      .insert({
        name: presetName,
        config: config as unknown as Record<string, unknown>,
        aspect_ratio: config.aspectRatio,
      })
      .select('id')
      .single()
    if (insertError || !inserted) {
      alert('Failed to save preset')
      return
    }
    await supabase
      .from('poster_presets')
      .update({ is_active: false })
      .neq('id', inserted.id)
    await supabase
      .from('poster_presets')
      .update({ is_active: true })
      .eq('id', inserted.id)
    loadPresets()
    alert('✅ التصميم أصبح مباشراً — The design is now live!')
  }

  function loadPreset(preset: Preset) {
    setConfig(preset.config)
  }

  function resetDefaults() {
    setConfig(DEFAULT_POSTER_CONFIG)
    localStorage.removeItem(LS_KEY)
  }

  function handleImageUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (v: string | null) => void,
  ) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setter(reader.result as string)
    reader.readAsDataURL(file)
  }

  function copyConfigJson() {
    navigator.clipboard.writeText(JSON.stringify(config, null, 2))
    setCopyFeedback('JSON copied!')
    setTimeout(() => setCopyFeedback(''), 2000)
  }

  function copyCursorPrompt() {
    const prompt = `Update the poster design config in lib/hsnyojz/poster-config.ts.\nReplace DEFAULT_POSTER_CONFIG with the following values:\n\n${JSON.stringify(config, null, 2)}\n\nThen update the render route to use these values.`
    navigator.clipboard.writeText(prompt)
    setCopyFeedback('Cursor prompt copied!')
    setTimeout(() => setCopyFeedback(''), 2000)
  }

  function updateSample(patch: Partial<SampleData>) {
    setSampleData((prev) => ({ ...prev, ...patch }))
  }

  function updateBullet(index: number, value: string) {
    setSampleData((prev) => {
      const bullets = [...prev.bullets]
      bullets[index] = value
      return { ...prev, bullets }
    })
  }

  function addBullet() {
    setSampleData((prev) => ({ ...prev, bullets: [...prev.bullets, ''] }))
  }

  function removeBullet(index: number) {
    setSampleData((prev) => ({
      ...prev,
      bullets: prev.bullets.filter((_, i) => i !== index),
    }))
  }

  function setAsDefaultSample() {
    localStorage.setItem(SAMPLE_LS_KEY, JSON.stringify(sampleData))
    setIsDefaultSample(true)
    setCopyFeedback('Sample text saved as default!')
    setTimeout(() => setCopyFeedback(''), 2000)
  }

  function resetSampleToBuiltin() {
    const reset = { ...BUILTIN_SAMPLE, bullets: [...BUILTIN_SAMPLE.bullets] }
    setSampleData(reset)
    localStorage.removeItem(SAMPLE_LS_KEY)
    setIsDefaultSample(false)
  }

  async function handleTestLink() {
    const url = testUrl.trim()
    if (!url) return
    setLinkLoading(true)
    setLinkError(null)
    try {
      const res = await fetch('/api/hsnyojz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      const { summary, heroImageBase64, avatarBase64 } = data

      setSampleData({
        headline: summary.headline,
        bullets: summary.bullets || [],
        sourceLabel: summary.sourceLabel || '',
        customNotes: null,
      })

      if (heroImageBase64) setTestImage(heroImageBase64)
      if (avatarBase64) setTestAvatar(avatarBase64)

      if (summary.flagEmoji) {
        const cp = Array.from(summary.flagEmoji as string).map((c: string) => c.codePointAt(0) || 0)
        if (cp.length === 2) {
          const a = cp[0] - 0x1f1e6 + 65
          const b = cp[1] - 0x1f1e6 + 65
          if (a >= 65 && a <= 90 && b >= 65 && b <= 90) {
            setFlagCode(String.fromCharCode(a, b).toLowerCase())
          }
        }
      }
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLinkLoading(false)
    }
  }

  useEffect(() => {
    if (!flagCode) { setFlagDataUrl(null); return }
    let cancelled = false
    const url = `https://flagcdn.com/256x192/${flagCode}.png`
    fetch(url)
      .then((r) => r.blob())
      .then((blob) => {
        if (cancelled) return
        const reader = new FileReader()
        reader.onload = () => setFlagDataUrl(reader.result as string)
        reader.readAsDataURL(blob)
      })
      .catch(() => { if (!cancelled) setFlagDataUrl(null) })
    return () => { cancelled = true }
  }, [flagCode])

  async function exportPoster(ratio: '9:16' | '4:5') {
    const ref = ratio === '9:16' ? captureRef916 : captureRef4x5
    if (!ref.current) return
    setExporting(ratio)
    try {
      const blob = await toBlob(ref.current, {
        pixelRatio: 1,
        cacheBust: true,
        skipAutoScale: true,
      })
      if (!blob) throw new Error('Capture returned empty')
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = `poster-${ratio.replace(':', 'x')}.png`
      link.href = url
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
      alert('Export failed — check console for details.')
    } finally {
      setExporting(null)
    }
  }

  const config4x5: PosterDesignConfig = {
    ...DEFAULT_POSTER_CONFIG_4x5,
    ...config,
    aspectRatio: '4:5',
    canvasWidth: DEFAULT_POSTER_CONFIG_4x5.canvasWidth,
    canvasHeight: DEFAULT_POSTER_CONFIG_4x5.canvasHeight,
    hero: {
      ...config.hero,
      ...DEFAULT_POSTER_CONFIG_4x5.hero,
      glass: {
        ...config.hero.glass,
        ...DEFAULT_POSTER_CONFIG_4x5.hero.glass,
      },
    },
    headline: {
      ...config.headline,
      ...DEFAULT_POSTER_CONFIG_4x5.headline,
      arabic: {
        ...config.headline.arabic,
        ...DEFAULT_POSTER_CONFIG_4x5.headline.arabic,
      },
      english: {
        ...config.headline.english,
        ...DEFAULT_POSTER_CONFIG_4x5.headline.english,
      },
    },
    bullets: {
      ...config.bullets,
      ...DEFAULT_POSTER_CONFIG_4x5.bullets,
      arabic: {
        ...config.bullets.arabic,
        ...DEFAULT_POSTER_CONFIG_4x5.bullets.arabic,
      },
      english: {
        ...config.bullets.english,
        ...DEFAULT_POSTER_CONFIG_4x5.bullets.english,
      },
    },
    brand: { ...config.brand, ...DEFAULT_POSTER_CONFIG_4x5.brand },
    content: { ...config.content, ...DEFAULT_POSTER_CONFIG_4x5.content },
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 text-slate-400 text-sm">
        Loading editor...
      </div>
    )
  }

  return (
    <>
      <style>{`
        @font-face {
          font-family: 'Manal';
          src: url('/fonts/ah-manal-light.ttf') format('truetype');
          font-weight: 300;
          font-style: normal;
        }
        @font-face {
          font-family: 'Manal';
          src: url('/fonts/ah-manal-medium.ttf') format('truetype');
          font-weight: 400;
          font-style: normal;
        }
        @font-face {
          font-family: 'Manal';
          src: url('/fonts/ah-manal-bold.ttf') format('truetype');
          font-weight: 700;
          font-style: normal;
        }
        @font-face {
          font-family: 'Manal';
          src: url('/fonts/ah-manal-black.ttf') format('truetype');
          font-weight: 900;
          font-style: normal;
        }
        @font-face {
          font-family: 'Source Serif 4';
          src: url('/fonts/source-serif-4-regular.ttf') format('truetype');
          font-weight: 400;
          font-style: normal;
        }
        @font-face {
          font-family: 'Source Serif 4';
          src: url('/fonts/source-serif-4-semibold.ttf') format('truetype');
          font-weight: 600;
          font-style: normal;
        }
        @font-face {
          font-family: 'Source Serif 4';
          src: url('/fonts/source-serif-4-bold.ttf') format('truetype');
          font-weight: 700;
          font-style: normal;
        }
        @font-face {
          font-family: 'Rawasi Arabic';
          src: url('/fonts/itfRawasiArabic-Regular.otf') format('opentype');
          font-weight: 400;
          font-style: normal;
        }
      `}</style>

      <div className="flex h-screen bg-slate-50 overflow-hidden">
        {/* ── Left: Controls ── */}
        <div className="w-[58%] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 flex-shrink-0">
            <h1 className="text-sm font-bold text-slate-800">
              حسن يوجز — Design Editor
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSaveModal(true)}
                className="text-[11px] px-3 py-1.5 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors"
              >
                Save Preset
              </button>
              <button
                onClick={activatePreset}
                className="text-[11px] px-3 py-1.5 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-colors"
              >
                🟢 تفعيل
              </button>
              {presets.length > 0 && (
                <select
                  onChange={(e) => {
                    const p = presets.find((p) => p.id === e.target.value)
                    if (p) loadPreset(p)
                  }}
                  defaultValue=""
                  className="text-[11px] border border-slate-200 rounded-md px-2 py-1.5 bg-white"
                >
                  <option value="" disabled>
                    Load Preset...
                  </option>
                  {presets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={resetDefaults}
                className="text-[11px] px-3 py-1.5 text-slate-500 hover:bg-slate-100 rounded-md transition-colors"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Controls Grid */}
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {/* ── Row 1 ── */}
            <div className="grid grid-cols-3 gap-3">
              <Section title="Canvas">
                <ColorInput
                  label="Background"
                  value={config.backgroundColor}
                  onChange={(v) => update('backgroundColor', v)}
                />
                <BoolToggle
                  label="Background Gradient"
                  value={config.backgroundGradient?.enabled ?? false}
                  onChange={(v) => update('backgroundGradient.enabled', v)}
                />
                {config.backgroundGradient?.enabled && (
                  <>
                    <ColorInput
                      label="Gradient End"
                      value={config.backgroundGradient?.colorEnd ?? '#e8e8e8'}
                      onChange={(v) => update('backgroundGradient.colorEnd', v)}
                    />
                    <Slider
                      label="Gradient Angle"
                      value={config.backgroundGradient?.angle ?? 180}
                      min={0}
                      max={360}
                      step={1}
                      onChange={(v) => update('backgroundGradient.angle', v)}
                    />
                  </>
                )}
                <hr className="border-slate-100" />
                <Toggle
                  label="Pattern"
                  options={[
                    { value: 'none', label: 'None' },
                    { value: 'dots', label: 'Dots' },
                    { value: 'waves', label: 'Waves' },
                    { value: 'topography', label: 'Topo' },
                    { value: 'cross-dots', label: 'Cross' },
                  ]}
                  value={config.pattern?.type ?? 'dots'}
                  onChange={(v) => update('pattern.type', v)}
                />
                {(config.pattern?.type ?? 'dots') !== 'none' && (
                  <>
                    <ColorInput
                      label="Pattern Color"
                      value={config.pattern?.color ?? '#d0d0d0'}
                      onChange={(v) => update('pattern.color', v)}
                    />
                    <Slider
                      label="Pattern Opacity"
                      value={config.pattern?.opacity ?? 0.3}
                      min={0}
                      max={1}
                      step={0.01}
                      onChange={(v) => update('pattern.opacity', v)}
                    />
                    <Slider
                      label="Pattern Scale"
                      value={config.pattern?.scale ?? 1}
                      min={0.3}
                      max={5}
                      step={0.1}
                      onChange={(v) => update('pattern.scale', v)}
                    />
                    <Slider
                      label="Stroke Width"
                      value={config.pattern?.strokeWidth ?? 1}
                      min={0.1}
                      max={8}
                      step={0.1}
                      onChange={(v) => update('pattern.strokeWidth', v)}
                    />
                    <Slider
                      label="Wavelength"
                      value={config.pattern?.wavelength ?? 1}
                      min={0.2}
                      max={5}
                      step={0.1}
                      onChange={(v) => update('pattern.wavelength', v)}
                    />
                    <BoolToggle
                      label="Pattern Gradient"
                      value={config.pattern?.gradientEnabled ?? false}
                      onChange={(v) => update('pattern.gradientEnabled', v)}
                    />
                    {config.pattern?.gradientEnabled && (
                      <>
                        <Toggle
                          label="Gradient Mode"
                          options={[
                            { value: 'per-line', label: 'Per Line' },
                            { value: 'overall', label: 'Overall' },
                          ]}
                          value={config.pattern?.gradientMode ?? 'per-line'}
                          onChange={(v) => update('pattern.gradientMode', v)}
                        />
                        <ColorInput
                          label="Gradient End"
                          value={config.pattern?.gradientColorEnd ?? '#a0a0ff'}
                          onChange={(v) => update('pattern.gradientColorEnd', v)}
                        />
                        <Slider
                          label="Gradient Angle"
                          value={config.pattern?.gradientAngle ?? 180}
                          min={0}
                          max={360}
                          step={1}
                          onChange={(v) => update('pattern.gradientAngle', v)}
                        />
                      </>
                    )}
                  </>
                )}
                <SectionJsonCopy config={config} keys={['backgroundColor', 'backgroundGradient', 'pattern']} />
              </Section>

              <Section title="Hero Image">
                <Toggle
                  label="Style"
                  options={[
                    { value: 'glass-refraction', label: 'Glass' },
                    { value: 'plain', label: 'Plain' },
                  ]}
                  value={config.hero.style}
                  onChange={(v) => update('hero.style', v)}
                />
                <Slider label="Height %" value={config.hero.heightPercent} min={0} max={80} onChange={(v) => update('hero.heightPercent', v)} />
                <Slider label="Position X" value={config.hero.positionX ?? 0} min={-500} max={500} onChange={(v) => update('hero.positionX', v)} />
                <Slider label="Position Y" value={config.hero.positionY ?? 0} min={-500} max={1000} onChange={(v) => update('hero.positionY', v)} />
                {config.hero.style === 'glass-refraction' && (
                  <>
                    <Slider label="Inner Circle" value={config.hero.glass.innerCircleSizePx} min={50} max={900} onChange={(v) => update('hero.glass.innerCircleSizePx', v)} />
                    <Slider label="Outer Circle" value={config.hero.glass.outerCircleSizePx} min={50} max={1200} onChange={(v) => update('hero.glass.outerCircleSizePx', v)} />
                    <Slider label="Blur" value={config.hero.glass.blurAmount} min={0} max={120} onChange={(v) => update('hero.glass.blurAmount', v)} />
                    <Slider label="Opacity" value={config.hero.glass.opacity} min={0} max={1} step={0.01} onChange={(v) => update('hero.glass.opacity', v)} />
                  </>
                )}
                {config.hero.style === 'plain' && (
                  <>
                    <Slider label="Image Width %" value={config.hero.plain.imageWidthPercent} min={20} max={100} onChange={(v) => update('hero.plain.imageWidthPercent', v)} />
                    <Slider label="Image Height %" value={config.hero.plain.imageHeightPercent} min={20} max={100} onChange={(v) => update('hero.plain.imageHeightPercent', v)} />
                    <Slider label="Border Radius" value={config.hero.plain.borderRadius} min={0} max={50} onChange={(v) => update('hero.plain.borderRadius', v)} />
                    <Slider label="Shadow Intensity" value={config.hero.plain.shadowIntensity} min={0} max={1} step={0.01} onChange={(v) => update('hero.plain.shadowIntensity', v)} />
                    <Slider label="Shadow Blur" value={config.hero.plain.shadowBlur} min={0} max={60} onChange={(v) => update('hero.plain.shadowBlur', v)} />
                    <Slider label="Shadow Offset Y" value={config.hero.plain.shadowOffsetY} min={-50} max={80} onChange={(v) => update('hero.plain.shadowOffsetY', v)} />
                  </>
                )}
                <Slider label="Gradient %" value={config.hero.gradientHeightPercent} min={0} max={100} onChange={(v) => update('hero.gradientHeightPercent', v)} />
                <div className="pt-1">
                  <label className="text-[11px] text-slate-500 block mb-1">Test Image</label>
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setTestImage)} className="text-[10px] file:text-[10px] file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100" />
                </div>
                <SectionJsonCopy config={config} keys={['hero']} />
              </Section>

              <Section title="Avatar & Flag">
                <Slider label="Avatar Size" value={config.avatar.sizePx} min={20} max={400} onChange={(v) => update('avatar.sizePx', v)} />
                <Slider label="Border Radius" value={config.avatar.borderRadius} min={0} max={200} onChange={(v) => update('avatar.borderRadius', v)} />
                <Slider label="Border Width" value={config.avatar.borderWidth} min={0} max={20} onChange={(v) => update('avatar.borderWidth', v)} />
                <Slider label="Position X" value={config.avatar.positionX} min={-500} max={800} onChange={(v) => update('avatar.positionX', v)} />
                <Slider label="Position Y" value={config.avatar.positionY} min={-200} max={1400} onChange={(v) => update('avatar.positionY', v)} />
                <hr className="border-slate-100" />
                <Slider label="Flag Size" value={config.flag.sizePx} min={8} max={200} onChange={(v) => update('flag.sizePx', v)} />
                <Slider label="Flag Offset X" value={config.flag.offsetX} min={-200} max={200} onChange={(v) => update('flag.offsetX', v)} />
                <Slider label="Flag Offset Y" value={config.flag.offsetY} min={-200} max={200} onChange={(v) => update('flag.offsetY', v)} />
                <TextInput label="Country Code" value={flagCode} onChange={setFlagCode} />
                <div className="pt-1">
                  <label className="text-[11px] text-slate-500 block mb-1">Test Avatar</label>
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setTestAvatar)} className="text-[10px] file:text-[10px] file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100" />
                </div>
                <SectionJsonCopy config={config} keys={['avatar', 'flag']} />
              </Section>
            </div>

            {/* ── Row 2 ── */}
            <div className="grid grid-cols-3 gap-3">
              <Section title="Date & Source">
                <Slider label="Date Size" value={config.date.fontSize} min={8} max={80} onChange={(v) => update('date.fontSize', v)} />
                <ColorInput label="Date Color" value={config.date.color} onChange={(v) => update('date.color', v)} />
                <Slider label="Date Opacity" value={config.date.opacity} min={0} max={1} step={0.01} onChange={(v) => update('date.opacity', v)} />
                <Slider label="Date Top" value={config.date.positionTop} min={-200} max={1600} onChange={(v) => update('date.positionTop', v)} />
                <Slider label="Date Left" value={config.date.positionLeft} min={-500} max={1500} onChange={(v) => update('date.positionLeft', v)} />
                <hr className="border-slate-100" />
                <Slider label="Source Size" value={config.sourceTag.fontSize} min={8} max={80} onChange={(v) => update('sourceTag.fontSize', v)} />
                <Slider label="Source Weight" value={config.sourceTag.fontWeight} min={100} max={900} step={100} onChange={(v) => update('sourceTag.fontWeight', v)} />
                <ColorInput label="Source Color" value={config.sourceTag.color} onChange={(v) => update('sourceTag.color', v)} />
                <ColorInput label="Source BG" value={config.sourceTag.backgroundColor} onChange={(v) => update('sourceTag.backgroundColor', v)} />
                <Slider label="Source X" value={config.sourceTag.positionX} min={-300} max={300} onChange={(v) => update('sourceTag.positionX', v)} />
                <Slider label="Source Y" value={config.sourceTag.positionY} min={-300} max={300} onChange={(v) => update('sourceTag.positionY', v)} />
                <Slider label="Source Margin Bottom" value={config.sourceTag.marginBottom} min={-50} max={200} onChange={(v) => update('sourceTag.marginBottom', v)} />
                <Slider label="Source Padding X" value={config.sourceTag.paddingX} min={0} max={40} onChange={(v) => update('sourceTag.paddingX', v)} />
                <Slider label="Source Padding Y" value={config.sourceTag.paddingY} min={0} max={30} onChange={(v) => update('sourceTag.paddingY', v)} />
                <Slider label="Line Width" value={config.sourceTag.lineWidth} min={0} max={100} onChange={(v) => update('sourceTag.lineWidth', v)} />
                <ColorInput label="Line Color" value={config.sourceTag.lineColor} onChange={(v) => update('sourceTag.lineColor', v)} />
                <SectionJsonCopy config={config} keys={['date', 'sourceTag']} />
              </Section>

              <Section title="Headline">
                <div className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider">Arabic</div>
                <Slider label="Font Size" value={config.headline.arabic.fontSize} min={20} max={160} onChange={(v) => update('headline.arabic.fontSize', v)} />
                <Toggle label="Weight" options={[{ value: '300', label: 'Light' }, { value: '400', label: 'Regular' }, { value: '700', label: 'Bold' }, { value: '900', label: 'Black' }]} value={String(config.headline.arabic.fontWeight)} onChange={(v) => update('headline.arabic.fontWeight', parseInt(v))} />
                <Slider label="Line Height" value={config.headline.arabic.lineHeight} min={0.5} max={2.5} step={0.05} onChange={(v) => update('headline.arabic.lineHeight', v)} />
                <Slider label="Letter Spacing" value={config.headline.arabic.letterSpacing} min={-10} max={10} step={0.5} onChange={(v) => update('headline.arabic.letterSpacing', v)} />
                <ColorInput label="Color" value={config.headline.arabic.color} onChange={(v) => update('headline.arabic.color', v)} />
                <hr className="border-slate-100" />
                <div className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">English</div>
                <Slider label="Font Size" value={config.headline.english.fontSize} min={20} max={160} onChange={(v) => update('headline.english.fontSize', v)} />
                <Toggle label="Weight" options={[{ value: '300', label: 'Light' }, { value: '400', label: 'Regular' }, { value: '700', label: 'Bold' }, { value: '900', label: 'Black' }]} value={String(config.headline.english.fontWeight)} onChange={(v) => update('headline.english.fontWeight', parseInt(v))} />
                <Slider label="Line Height" value={config.headline.english.lineHeight} min={0.5} max={2.5} step={0.05} onChange={(v) => update('headline.english.lineHeight', v)} />
                <Slider label="Letter Spacing" value={config.headline.english.letterSpacing} min={-10} max={10} step={0.5} onChange={(v) => update('headline.english.letterSpacing', v)} />
                <ColorInput label="Color" value={config.headline.english.color} onChange={(v) => update('headline.english.color', v)} />
                <hr className="border-slate-100" />
                <Slider label="Margin Bottom" value={config.headline.marginBottom} min={-100} max={300} onChange={(v) => update('headline.marginBottom', v)} />
                <Slider label="Max Lines" value={config.headline.maxLines} min={1} max={10} onChange={(v) => update('headline.maxLines', v)} />
                <Slider label="Shrink Step %" value={config.headline.shrinkStepPercent} min={1} max={20} onChange={(v) => update('headline.shrinkStepPercent', v)} />
                <Slider label="Min Font Size %" value={config.headline.minFontSizePercent} min={30} max={100} onChange={(v) => update('headline.minFontSizePercent', v)} />
                <ShadowControls
                  title="Shadow"
                  path="headline.shadow"
                  shadow={config.headline.shadow}
                  update={update}
                />
                <SectionJsonCopy config={config} keys={['headline']} />
              </Section>

              <Section title="Bullets">
                <div className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider">Arabic</div>
                <Slider label="Font Size" value={config.bullets.arabic.fontSize} min={8} max={120} onChange={(v) => update('bullets.arabic.fontSize', v)} />
                <Toggle label="Weight" options={[{ value: '300', label: 'Light' }, { value: '400', label: 'Regular' }, { value: '700', label: 'Bold' }]} value={String(config.bullets.arabic.fontWeight)} onChange={(v) => update('bullets.arabic.fontWeight', parseInt(v))} />
                <ColorInput label="Color" value={config.bullets.arabic.color} onChange={(v) => update('bullets.arabic.color', v)} />
                <hr className="border-slate-100" />
                <div className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">English</div>
                <Slider label="Font Size" value={config.bullets.english.fontSize} min={8} max={120} onChange={(v) => update('bullets.english.fontSize', v)} />
                <Toggle label="Weight" options={[{ value: '300', label: 'Light' }, { value: '400', label: 'Regular' }, { value: '700', label: 'Bold' }]} value={String(config.bullets.english.fontWeight)} onChange={(v) => update('bullets.english.fontWeight', parseInt(v))} />
                <ColorInput label="Color" value={config.bullets.english.color} onChange={(v) => update('bullets.english.color', v)} />
                <hr className="border-slate-100" />
                <div className="text-[10px] font-semibold text-orange-500 uppercase tracking-wider">Position</div>
                <Slider label="Anchor Y" value={config.bullets.anchorY} min={-300} max={1400} onChange={(v) => update('bullets.anchorY', v)} />
                <Slider label="Position X" value={config.bullets.positionX} min={-300} max={300} onChange={(v) => update('bullets.positionX', v)} />
                <Slider label="Line Spacing" value={config.bullets.lineSpacingPx} min={0} max={160} onChange={(v) => update('bullets.lineSpacingPx', v)} />
                <Slider label="Gap" value={config.bullets.gap} min={-30} max={150} onChange={(v) => update('bullets.gap', v)} />
                <Slider label="Margin Bottom" value={config.bullets.marginBottom} min={-80} max={150} onChange={(v) => update('bullets.marginBottom', v)} />
                <ShadowControls
                  title="Text Shadow"
                  path="bullets.shadow"
                  shadow={config.bullets.shadow}
                  update={update}
                />
                <hr className="border-slate-100" />
                <div className="text-[10px] font-semibold text-orange-500 uppercase tracking-wider">Symbol</div>
                <TextInput label="Symbol" value={config.bullets.iconSymbol} onChange={(v) => update('bullets.iconSymbol', v)} />
                <Slider label="Symbol Size" value={config.bullets.iconSize} min={8} max={120} onChange={(v) => update('bullets.iconSize', v)} />
                <ColorInput label="Symbol Color" value={config.bullets.iconColor} onChange={(v) => update('bullets.iconColor', v)} />
                <Slider label="Symbol Offset X" value={config.bullets.iconOffsetX} min={-50} max={50} onChange={(v) => update('bullets.iconOffsetX', v)} />
                <Slider label="Symbol Offset Y" value={config.bullets.iconOffsetY} min={-50} max={50} onChange={(v) => update('bullets.iconOffsetY', v)} />
                <ShadowControls
                  title="Symbol Shadow"
                  path="bullets.iconShadow"
                  shadow={config.bullets.iconShadow}
                  update={update}
                />
                <hr className="border-slate-100" />
                <Slider label="Border Line Width" value={config.bullets.borderLineWidth} min={0} max={8} onChange={(v) => update('bullets.borderLineWidth', v)} />
                <ColorInput label="Border Line Color" value={config.bullets.borderLineColor} onChange={(v) => update('bullets.borderLineColor', v)} />
                <Slider label="Padding Right" value={config.bullets.paddingRight} min={-80} max={120} onChange={(v) => update('bullets.paddingRight', v)} />
                <SectionJsonCopy config={config} keys={['bullets']} />
              </Section>
            </div>

            {/* ── Row 3 ── */}
            <div className="grid grid-cols-3 gap-3">
              <Section title="Notes">
                <Slider label="Font Size" value={config.notes.fontSize} min={8} max={72} onChange={(v) => update('notes.fontSize', v)} />
                <ColorInput label="Color" value={config.notes.color} onChange={(v) => update('notes.color', v)} />
                <Slider label="Line Height" value={config.notes.lineHeight} min={0.5} max={3.0} step={0.05} onChange={(v) => update('notes.lineHeight', v)} />
                <Toggle label="Style" options={[{ value: 'normal', label: 'Normal' }, { value: 'italic', label: 'Italic' }]} value={config.notes.fontStyle} onChange={(v) => update('notes.fontStyle', v)} />
                <Slider label="Margin Top" value={config.notes.marginTop} min={-30} max={120} onChange={(v) => update('notes.marginTop', v)} />
                <SectionJsonCopy config={config} keys={['notes']} />
              </Section>

              <Section title="Brand Footer">
                <TextInput label="Brand Text" value={config.brand.text} onChange={(v) => update('brand.text', v)} />
                <TextInput label="Handle" value={config.brand.handle} onChange={(v) => update('brand.handle', v)} />
                <Slider label="Font Size" value={config.brand.fontSize} min={8} max={160} onChange={(v) => update('brand.fontSize', v)} />
                <Toggle label="Weight" options={[{ value: '300', label: 'Light' }, { value: '400', label: 'Regular' }, { value: '700', label: 'Bold' }]} value={String(config.brand.fontWeight)} onChange={(v) => update('brand.fontWeight', parseInt(v))} />
                <ColorInput label="Color" value={config.brand.color} onChange={(v) => update('brand.color', v)} />
                <Slider label="Opacity" value={config.brand.opacity} min={0} max={1} step={0.01} onChange={(v) => update('brand.opacity', v)} />
                <Slider label="Letter Spacing" value={config.brand.letterSpacing} min={-10} max={15} step={0.5} onChange={(v) => update('brand.letterSpacing', v)} />
                <Slider label="Padding Top" value={config.brand.paddingTop} min={-30} max={150} onChange={(v) => update('brand.paddingTop', v)} />
                <Slider label="Padding Bottom" value={config.brand.paddingBottom} min={-30} max={200} onChange={(v) => update('brand.paddingBottom', v)} />
                <BoolToggle label="Show Brand Text" value={config.brand.showBrandText} onChange={(v) => update('brand.showBrandText', v)} />
                <BoolToggle label="Show Handle" value={config.brand.showHandle} onChange={(v) => update('brand.showHandle', v)} />
                {config.brand.showHandle && (
                  <>
                    <Slider label="Handle Font Size" value={config.brand.handleFontSize} min={8} max={60} onChange={(v) => update('brand.handleFontSize', v)} />
                    <ColorInput label="Handle Color" value={config.brand.handleColor} onChange={(v) => update('brand.handleColor', v)} />
                    <Slider label="Handle Opacity" value={config.brand.handleOpacity} min={0} max={1} step={0.01} onChange={(v) => update('brand.handleOpacity', v)} />
                  </>
                )}
                <SectionJsonCopy config={config} keys={['brand']} />
              </Section>

              <Section title="Content Area">
                <Slider label="Horizontal Padding" value={config.content.paddingX} min={0} max={300} onChange={(v) => update('content.paddingX', v)} />
                <Slider label="Content Y" value={config.content.positionY ?? 650} min={0} max={1600} onChange={(v) => update('content.positionY', v)} />
                <SectionJsonCopy config={config} keys={['content']} />
              </Section>
            </div>

            {/* ── Test Link ── */}
            <div className="grid grid-cols-1 gap-3">
              <Section title="Test Link">
                <div className="flex flex-col gap-2.5">
                  <div className="flex gap-1.5">
                    <input
                      type="url"
                      value={testUrl}
                      onChange={(e) => setTestUrl(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleTestLink() }}
                      placeholder="Paste article URL..."
                      dir="ltr"
                      className="flex-1 text-[12px] text-slate-900 bg-slate-100 border border-slate-200 rounded px-2 py-1.5 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                      disabled={linkLoading}
                    />
                    <button
                      onClick={handleTestLink}
                      disabled={linkLoading || !testUrl.trim()}
                      className="text-[11px] px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 flex-shrink-0"
                    >
                      {linkLoading ? (
                        <>
                          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Summarizing...
                        </>
                      ) : 'Summarize'}
                    </button>
                  </div>

                  {linkError && (
                    <div className="text-[11px] text-red-600 bg-red-50 rounded px-2 py-1.5">
                      {linkError}
                    </div>
                  )}

                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-slate-500">Headline</span>
                    <textarea
                      value={sampleData.headline}
                      onChange={(e) => updateSample({ headline: e.target.value })}
                      className="text-[12px] text-slate-900 bg-slate-100 border border-slate-200 rounded px-2 py-1.5 resize-none placeholder:text-slate-500"
                      dir="auto"
                      rows={2}
                    />
                  </div>

                  <TextInput
                    label="Source Label"
                    value={sampleData.sourceLabel}
                    onChange={(v) => updateSample({ sourceLabel: v })}
                  />

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">Bullets</span>
                      <button
                        onClick={addBullet}
                        className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 transition-colors"
                      >
                        + Add
                      </button>
                    </div>
                    {sampleData.bullets.map((bullet, i) => (
                      <div key={i} className="flex gap-1.5 items-start">
                        <span className="text-[10px] text-slate-400 mt-1.5 w-4 text-center flex-shrink-0">
                          {i + 1}
                        </span>
                        <textarea
                          value={bullet}
                          onChange={(e) => updateBullet(i, e.target.value)}
                          className="flex-1 text-[12px] text-slate-900 bg-slate-100 border border-slate-200 rounded px-2 py-1.5 resize-none placeholder:text-slate-500"
                          dir="auto"
                          rows={2}
                        />
                        {sampleData.bullets.length > 1 && (
                          <button
                            onClick={() => removeBullet(i)}
                            className="text-[10px] text-red-400 hover:text-red-600 mt-1.5 flex-shrink-0"
                            title="Remove bullet"
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                    <button
                      onClick={setAsDefaultSample}
                      className="text-[11px] px-3 py-1.5 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-colors"
                    >
                      {isDefaultSample ? 'Update Default' : 'Set as Default'}
                    </button>
                    <button
                      onClick={resetSampleToBuiltin}
                      className="text-[11px] px-3 py-1.5 text-slate-500 hover:bg-slate-100 rounded-md transition-colors"
                    >
                      Reset to Original
                    </button>
                    {isDefaultSample && (
                      <span className="text-[10px] text-emerald-600">
                        Custom default active
                      </span>
                    )}
                  </div>
                </div>
              </Section>
            </div>

            {/* ── Export ── */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={copyConfigJson}
                className="text-[11px] px-4 py-2 bg-slate-800 text-white rounded-md hover:bg-slate-700 transition-colors"
              >
                Copy Config JSON
              </button>
              <button
                onClick={copyCursorPrompt}
                className="text-[11px] px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-500 transition-colors"
              >
                Copy Cursor Prompt
              </button>
              {copyFeedback && (
                <span className="text-[11px] text-green-600 animate-pulse">
                  {copyFeedback}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: Preview ── */}
        <div
          ref={previewRef}
          className="w-[42%] bg-slate-100 border-l border-slate-200 overflow-auto p-4 space-y-6"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                9:16 — {config.canvasWidth} × {config.canvasHeight}
              </span>
              <button
                onClick={() => exportPoster('9:16')}
                disabled={!!exporting}
                className="text-[11px] px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                {exporting === '9:16' ? (
                  <>
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Exporting...
                  </>
                ) : 'Export PNG'}
              </button>
            </div>
            <PosterPreview
              config={config}
              containerWidth={previewWidth}
              testImage={testImage}
              testAvatar={testAvatar}
              flagImageSrc={flagDataUrl}
              sampleData={sampleData}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                4:5 — {config4x5.canvasWidth} × {config4x5.canvasHeight}
              </span>
              <button
                onClick={() => exportPoster('4:5')}
                disabled={!!exporting}
                className="text-[11px] px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                {exporting === '4:5' ? (
                  <>
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Exporting...
                  </>
                ) : 'Export PNG'}
              </button>
            </div>
            <PosterPreview
              config={config4x5}
              containerWidth={previewWidth}
              testImage={testImage}
              testAvatar={testAvatar}
              flagImageSrc={flagDataUrl}
              sampleData={sampleData}
            />
          </div>
        </div>
      </div>

      {showSaveModal && (
        <SavePresetModal
          onSave={savePreset}
          onClose={() => setShowSaveModal(false)}
        />
      )}

      {/* Hidden full-size capture containers — same PosterCanvas, no scaling */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          left: '-99999px',
          top: 0,
          pointerEvents: 'none',
          opacity: 1,
        }}
      >
        <div ref={captureRef916}>
          <PosterCanvas
            config={config}
            data={sampleData}
            imageBase64={testImage}
            avatarBase64={testAvatar}
            flagImageSrc={flagDataUrl}
          />
        </div>
        <div ref={captureRef4x5}>
          <PosterCanvas
            config={config4x5}
            data={sampleData}
            imageBase64={testImage}
            avatarBase64={testAvatar}
            flagImageSrc={flagDataUrl}
          />
        </div>
      </div>
    </>
  )
}

function deepMerge(base: PosterDesignConfig, overrides: Record<string, unknown>): PosterDesignConfig {
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
  merge(result, overrides)
  return result as PosterDesignConfig
}
