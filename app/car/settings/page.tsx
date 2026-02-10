'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, Save, RotateCcw, Check } from 'lucide-react'
import { defaultFormatting, type AdhkarFormatting } from '@/lib/adhkar-formatting'

export default function AdhkarSettingsPage() {
  const [settings, setSettings] = useState<AdhkarFormatting>(defaultFormatting)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Load settings on mount
  useEffect(() => {
    fetch('/api/adhkar-settings')
      .then((res) => res.json())
      .then((data) => {
        setSettings(data)
        setIsLoading(false)
      })
      .catch(() => {
        setIsLoading(false)
      })
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    setSaveSuccess(false)
    
    try {
      const res = await fetch('/api/adhkar-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      
      if (res.ok) {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 2000)
      }
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setSettings(defaultFormatting)
  }

  const updateSetting = <K extends keyof AdhkarFormatting>(
    key: K,
    value: AdhkarFormatting[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950">
        <div className="text-slate-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-slate-100/95 dark:bg-slate-950/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/car"
              className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
              aria-label="Back"
            >
              <ArrowRight size={20} className="rotate-180" />
            </Link>
            <h1 className="text-xl font-bold">Adhkar Formatting Settings</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors text-sm"
            >
              <RotateCcw size={16} />
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors text-sm disabled:opacity-50"
            >
              {saveSuccess ? (
                <>
                  <Check size={16} />
                  Saved!
                </>
              ) : (
                <>
                  <Save size={16} />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid gap-8">
          {/* Font Sizes */}
          <section className="p-6 rounded-xl bg-white dark:bg-slate-900 shadow-sm">
            <h2 className="text-lg font-semibold mb-6">Font Sizes</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">
                  Title Size: {settings.titleSize}px
                </label>
                <input
                  type="range"
                  min="20"
                  max="50"
                  value={settings.titleSize}
                  onChange={(e) => updateSetting('titleSize', Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">
                  Dhikr Text Size: {settings.dhikrTextSize}px
                </label>
                <input
                  type="range"
                  min="16"
                  max="40"
                  value={settings.dhikrTextSize}
                  onChange={(e) => updateSetting('dhikrTextSize', Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">
                  Note Size: {settings.noteSize}px
                </label>
                <input
                  type="range"
                  min="12"
                  max="28"
                  value={settings.noteSize}
                  onChange={(e) => updateSetting('noteSize', Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">
                  Repetition Badge Size: {settings.repetitionSize}px
                </label>
                <input
                  type="range"
                  min="14"
                  max="32"
                  value={settings.repetitionSize}
                  onChange={(e) => updateSetting('repetitionSize', Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>
            </div>
          </section>

          {/* Line Heights & Spacing */}
          <section className="p-6 rounded-xl bg-white dark:bg-slate-900 shadow-sm">
            <h2 className="text-lg font-semibold mb-6">Line Heights & Spacing</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">
                  Dhikr Line Height: {settings.dhikrLineHeight.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="1.2"
                  max="3"
                  step="0.1"
                  value={settings.dhikrLineHeight}
                  onChange={(e) => updateSetting('dhikrLineHeight', Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">
                  Note Line Height: {settings.noteLineHeight.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="1.2"
                  max="2.5"
                  step="0.1"
                  value={settings.noteLineHeight}
                  onChange={(e) => updateSetting('noteLineHeight', Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">
                  Letter Spacing: {settings.letterSpacing.toFixed(2)}em
                </label>
                <input
                  type="range"
                  min="0"
                  max="0.1"
                  step="0.01"
                  value={settings.letterSpacing}
                  onChange={(e) => updateSetting('letterSpacing', Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">
                  Card Gap: {settings.cardGap}px
                </label>
                <input
                  type="range"
                  min="16"
                  max="80"
                  value={settings.cardGap}
                  onChange={(e) => updateSetting('cardGap', Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>
            </div>
          </section>

          {/* Card Styling */}
          <section className="p-6 rounded-xl bg-white dark:bg-slate-900 shadow-sm">
            <h2 className="text-lg font-semibold mb-6">Card Styling</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">
                  Card Padding: {settings.cardPadding}px
                </label>
                <input
                  type="range"
                  min="16"
                  max="64"
                  value={settings.cardPadding}
                  onChange={(e) => updateSetting('cardPadding', Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">
                  Border Radius: {settings.cardBorderRadius}px
                </label>
                <input
                  type="range"
                  min="0"
                  max="32"
                  value={settings.cardBorderRadius}
                  onChange={(e) => updateSetting('cardBorderRadius', Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>
            </div>
          </section>

          {/* Light Mode Colors */}
          <section className="p-6 rounded-xl bg-white dark:bg-slate-900 shadow-sm">
            <h2 className="text-lg font-semibold mb-6">Light Mode Colors</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">
                  Background
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.lightBackground}
                    onChange={(e) => updateSetting('lightBackground', e.target.value)}
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.lightBackground}
                    onChange={(e) => updateSetting('lightBackground', e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">
                  Card Background
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.lightCardBackground}
                    onChange={(e) => updateSetting('lightCardBackground', e.target.value)}
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.lightCardBackground}
                    onChange={(e) => updateSetting('lightCardBackground', e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">
                  Text Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.lightTextColor}
                    onChange={(e) => updateSetting('lightTextColor', e.target.value)}
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.lightTextColor}
                    onChange={(e) => updateSetting('lightTextColor', e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">
                  Note Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.lightNoteColor}
                    onChange={(e) => updateSetting('lightNoteColor', e.target.value)}
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.lightNoteColor}
                    onChange={(e) => updateSetting('lightNoteColor', e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm font-mono"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Dark Mode Colors */}
          <section className="p-6 rounded-xl bg-white dark:bg-slate-900 shadow-sm">
            <h2 className="text-lg font-semibold mb-6">Dark Mode Colors</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">
                  Background
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.darkBackground}
                    onChange={(e) => updateSetting('darkBackground', e.target.value)}
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.darkBackground}
                    onChange={(e) => updateSetting('darkBackground', e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">
                  Card Background
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.darkCardBackground}
                    onChange={(e) => updateSetting('darkCardBackground', e.target.value)}
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.darkCardBackground}
                    onChange={(e) => updateSetting('darkCardBackground', e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">
                  Text Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.darkTextColor}
                    onChange={(e) => updateSetting('darkTextColor', e.target.value)}
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.darkTextColor}
                    onChange={(e) => updateSetting('darkTextColor', e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">
                  Note Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.darkNoteColor}
                    onChange={(e) => updateSetting('darkNoteColor', e.target.value)}
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.darkNoteColor}
                    onChange={(e) => updateSetting('darkNoteColor', e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm font-mono"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Accent Colors */}
          <section className="p-6 rounded-xl bg-white dark:bg-slate-900 shadow-sm">
            <h2 className="text-lg font-semibold mb-6">Accent Colors (Repetition Badges)</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">
                  Light Mode Accent
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.accentColor}
                    onChange={(e) => updateSetting('accentColor', e.target.value)}
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.accentColor}
                    onChange={(e) => updateSetting('accentColor', e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">
                  Dark Mode Accent
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.accentColorDark}
                    onChange={(e) => updateSetting('accentColorDark', e.target.value)}
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.accentColorDark}
                    onChange={(e) => updateSetting('accentColorDark', e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm font-mono"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Preview */}
          <section className="p-6 rounded-xl bg-white dark:bg-slate-900 shadow-sm">
            <h2 className="text-lg font-semibold mb-6">Preview</h2>
            <div
              dir="rtl"
              className="p-6 rounded-xl transition-colors"
              style={{
                backgroundColor: settings.lightBackground,
                fontFamily: '"Geeza Pro", "Noto Sans Arabic", system-ui, sans-serif',
              }}
            >
              <div
                className="rounded-xl shadow-sm"
                style={{
                  backgroundColor: settings.lightCardBackground,
                  padding: settings.cardPadding,
                  borderRadius: settings.cardBorderRadius,
                }}
              >
                <p
                  style={{
                    color: settings.lightTextColor,
                    fontSize: settings.dhikrTextSize,
                    lineHeight: settings.dhikrLineHeight,
                    letterSpacing: `${settings.letterSpacing}em`,
                  }}
                >
                  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                </p>
                <p
                  className="mt-4"
                  style={{
                    color: settings.lightNoteColor,
                    fontSize: settings.noteSize,
                    lineHeight: settings.noteLineHeight,
                  }}
                >
                  هذا نص تجريبي للملاحظات
                </p>
                <span
                  className="inline-block mt-4 px-4 py-2 rounded-full font-bold"
                  style={{
                    backgroundColor: `${settings.accentColor}20`,
                    color: settings.accentColor,
                    fontSize: settings.repetitionSize,
                  }}
                >
                  3 مرات
                </span>
              </div>
            </div>
          </section>
        </div>

        <div className="h-16" />
      </main>
    </div>
  )
}
