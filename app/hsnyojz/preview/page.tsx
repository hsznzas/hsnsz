'use client'

import { useState } from 'react'

export default function HsnYojzPreview() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [posterUrl, setPosterUrl] = useState<string | null>(null)
  const [summary, setSummary] = useState<{ headline: string; bullets: string[] } | null>(null)

  const handleGenerate = async () => {
    if (!url.trim()) return
    setLoading(true)
    setError('')
    setPosterUrl(null)
    setSummary(null)

    try {
      const res = await fetch('/api/hsnyojz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Generation failed')
      }

      const data = await res.json()
      setSummary(data.summary)

      if (data.posterBase64) {
        setPosterUrl(`data:image/png;base64,${data.posterBase64}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
    >
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">حسن يوجز</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            أداة إنشاء بوسترات الأخبار — اختبار مباشر
          </p>
        </div>

        {/* Input */}
        <div className="flex gap-3 mb-8">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="الصق رابط الخبر هنا..."
            className="flex-1 px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            dir="ltr"
          />
          <button
            onClick={handleGenerate}
            disabled={loading || !url.trim()}
            className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '⏳ جاري...' : '🎨 إنشاء'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 mb-6 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Summary Preview */}
        {summary && (
          <div className="p-6 mb-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold mb-3">{summary.headline}</h3>
            <ul className="space-y-2">
              {summary.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <span className="text-slate-400">—</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Poster Preview */}
        {posterUrl && (
          <div className="space-y-4">
            <div className="aspect-[9/16] max-w-[360px] mx-auto rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700">
              <img src={posterUrl} alt="Poster preview" className="w-full h-full object-cover" />
            </div>

            <div className="text-center">
              <a
                href={posterUrl}
                download="hsnyojz-story.png"
                className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                📥 تحميل البوستر
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
