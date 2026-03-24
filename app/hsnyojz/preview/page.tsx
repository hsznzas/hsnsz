'use client'

import { useState, useRef } from 'react'

type InputMode = 'url' | 'text' | 'image'

export default function HsnYojzPreview() {
  const [mode, setMode] = useState<InputMode>('url')
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [posterUrl, setPosterUrl] = useState<string | null>(null)
  const [summary, setSummary] = useState<{ headline: string; bullets: string[] } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const objectUrl = URL.createObjectURL(file)
      setImagePreview(objectUrl)
    }
  }

  const clearImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const canGenerate = () => {
    if (loading) return false
    if (mode === 'url') return !!url.trim()
    if (mode === 'text') return !!text.trim()
    if (mode === 'image') return !!imageFile
    return false
  }

  const handleGenerate = async () => {
    if (!canGenerate()) return
    setLoading(true)
    setError('')
    setPosterUrl(null)
    setSummary(null)

    try {
      const body: Record<string, string> = {}

      if (mode === 'url') {
        body.url = url.trim()
      } else if (mode === 'text') {
        body.text = text.trim()
      }

      if (imageFile) {
        body.imageBase64 = await fileToBase64(imageFile)
      } else if (mode === 'image' && imageFile) {
        body.imageBase64 = await fileToBase64(imageFile)
      }

      const res = await fetch('/api/hsnyojz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

  const modes: { key: InputMode; label: string }[] = [
    { key: 'url', label: 'رابط' },
    { key: 'text', label: 'نص' },
    { key: 'image', label: 'صورة' },
  ]

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

        {/* Mode Tabs */}
        <div className="flex gap-2 mb-6">
          {modes.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                mode === m.key
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* URL Input */}
        {mode === 'url' && (
          <div className="mb-6">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="الصق رابط الخبر هنا..."
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              dir="ltr"
            />
          </div>
        )}

        {/* Text Input */}
        {mode === 'text' && (
          <div className="mb-6">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="الصق نص الخبر هنا..."
              rows={6}
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
            />
          </div>
        )}

        {/* Image Upload */}
        {mode === 'image' && (
          <div className="mb-6">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-8 rounded-xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-600 text-center cursor-pointer hover:border-emerald-500 transition-colors"
            >
              {imagePreview ? (
                <div className="space-y-3">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-h-48 mx-auto rounded-lg object-contain"
                  />
                  <p className="text-xs text-slate-500">{imageFile?.name}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-2xl">📷</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    اضغط لرفع صورة (سكرين شوت للخبر)
                  </p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            {imagePreview && (
              <button
                onClick={clearImage}
                className="mt-2 text-xs text-red-500 hover:text-red-400"
              >
                إزالة الصورة
              </button>
            )}
          </div>
        )}

        {/* Optional image for URL/text modes */}
        {(mode === 'url' || mode === 'text') && (
          <div className="mb-6">
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-2">
              صورة (اختياري) — تُستخدم بدلاً من صورة المقال
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {imageFile ? '📷 تغيير الصورة' : '📷 رفع صورة'}
              </button>
              {imageFile && (
                <>
                  <span className="text-xs text-slate-500 truncate max-w-[200px]">{imageFile.name}</span>
                  <button onClick={clearImage} className="text-xs text-red-500 hover:text-red-400">
                    إزالة
                  </button>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={!canGenerate()}
          className="w-full px-6 py-3.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-8"
        >
          {loading ? '⏳ جاري الإنشاء...' : '🎨 إنشاء البوستر'}
        </button>

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
