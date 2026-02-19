'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { TOTAL_PAGES, getSurahForPage } from '@/data/surahs'

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0 && m > 0) return `${h} ساعة و ${m} دقيقة`
  if (h > 0) return `${h} ساعة`
  if (m > 0) return `${m} دقيقة`
  return `${seconds} ثانية`
}

interface StopModalProps {
  open: boolean
  elapsed: number
  startPage: number
  onConfirm: (endPage: number) => void
  onCancel: () => void
  onDismiss: () => void
}

export default function StopModal({
  open,
  elapsed,
  startPage,
  onConfirm,
  onCancel,
  onDismiss,
}: StopModalProps) {
  const [endPage, setEndPage] = useState('')
  const [error, setError] = useState('')

  if (!open) return null

  const parsedEnd = parseInt(endPage)
  const surah = !isNaN(parsedEnd) ? getSurahForPage(parsedEnd) : null
  const pagesCount = !isNaN(parsedEnd) ? parsedEnd - startPage + 1 : 0

  function handleConfirm() {
    const val = parseInt(endPage)
    if (isNaN(val) || val < startPage || val > TOTAL_PAGES) {
      setError(`أدخل رقم صفحة بين ${startPage} و ${TOTAL_PAGES}`)
      return
    }
    setError('')
    onConfirm(val)
    setEndPage('')
  }

  function handleCancel() {
    setEndPage('')
    setError('')
    onCancel()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onDismiss} />

      <div className="relative w-full sm:max-w-md mx-auto bg-white dark:bg-[#222] rounded-t-3xl sm:rounded-2xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl">
        <button
          onClick={onDismiss}
          className="absolute top-4 left-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <X size={20} className="text-gray-500" />
        </button>

        <div className="text-center mb-6">
          <h2 className="text-xl font-bold mb-1">إيقاف التسجيل</h2>
          <p className="text-3xl font-mono font-bold text-emerald-600 tabular-nums" dir="ltr">
            {formatDuration(elapsed)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            بدأت من صفحة {startPage}
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            آخر صفحة قرأتها
          </label>
          <input
            type="number"
            inputMode="numeric"
            min={startPage}
            max={TOTAL_PAGES}
            value={endPage}
            onChange={(e) => {
              setEndPage(e.target.value)
              setError('')
            }}
            placeholder={`${startPage} – ${TOTAL_PAGES}`}
            className="w-full text-center text-2xl font-bold py-3 px-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:border-emerald-500 focus:outline-none transition-colors"
            dir="ltr"
            autoFocus
          />
          {error && (
            <p className="text-red-500 text-sm mt-1">{error}</p>
          )}
          {surah && !isNaN(parsedEnd) && (
            <p className="text-sm text-gray-500 mt-2 text-center">
              سورة {surah.name} · {pagesCount} صفحة
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleConfirm}
            disabled={!endPage}
            className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-lg transition-colors active:scale-[0.98]"
          >
            تأكيد الحفظ
          </button>
          <button
            onClick={handleCancel}
            className="w-full py-3 rounded-xl bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 font-medium transition-colors active:scale-[0.98]"
          >
            إلغاء الجلسة
          </button>
        </div>
      </div>
    </div>
  )
}
