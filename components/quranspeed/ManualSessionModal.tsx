'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { TOTAL_PAGES, getSurahForPage } from '@/data/surahs'
import type { QuranSession } from '@/lib/hooks/useQuranTimer'

interface ManualSessionModalProps {
  open: boolean
  session: QuranSession | null
  onSave: (params: {
    start_page: number
    end_page: number
    start_at: string
    duration_minutes: number
  }) => void
  onDismiss: () => void
}

function toLocalDatetime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function nowLocalDatetime(): string {
  return toLocalDatetime(new Date().toISOString())
}

export default function ManualSessionModal({
  open,
  session,
  onSave,
  onDismiss,
}: ManualSessionModalProps) {
  const isEdit = !!session

  const [startPage, setStartPage] = useState('')
  const [endPage, setEndPage] = useState('')
  const [dateTime, setDateTime] = useState('')
  const [durationMin, setDurationMin] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    if (session) {
      setStartPage(String(session.start_page))
      setEndPage(String(session.end_page ?? ''))
      setDateTime(toLocalDatetime(session.start_at))
      setDurationMin(
        session.duration_seconds
          ? String(Math.round(session.duration_seconds / 60))
          : ''
      )
    } else {
      setStartPage('')
      setEndPage('')
      setDateTime(nowLocalDatetime())
      setDurationMin('')
    }
    setError('')
  }, [open, session])

  if (!open) return null

  const parsedStart = parseInt(startPage)
  const parsedEnd = parseInt(endPage)
  const startSurah =
    !isNaN(parsedStart) ? getSurahForPage(parsedStart) : null
  const endSurah = !isNaN(parsedEnd) ? getSurahForPage(parsedEnd) : null
  const pagesCount =
    !isNaN(parsedStart) && !isNaN(parsedEnd)
      ? parsedEnd - parsedStart + 1
      : 0

  function handleSave() {
    const sp = parseInt(startPage)
    const ep = parseInt(endPage)
    const dur = parseFloat(durationMin)

    if (isNaN(sp) || sp < 1 || sp > TOTAL_PAGES) {
      setError(`صفحة البداية يجب أن تكون بين 1 و ${TOTAL_PAGES}`)
      return
    }
    if (isNaN(ep) || ep < sp || ep > TOTAL_PAGES) {
      setError(`صفحة النهاية يجب أن تكون بين ${sp} و ${TOTAL_PAGES}`)
      return
    }
    if (isNaN(dur) || dur <= 0) {
      setError('أدخل مدة صحيحة بالدقائق')
      return
    }
    if (!dateTime) {
      setError('اختر التاريخ والوقت')
      return
    }

    const startAt = new Date(dateTime).toISOString()
    setError('')
    onSave({ start_page: sp, end_page: ep, start_at: startAt, duration_minutes: dur })
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

        <div className="text-center mb-5">
          <h2 className="text-xl font-bold">
            {isEdit ? 'تعديل الجلسة' : 'إضافة جلسة يدوية'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {isEdit
              ? 'عدّل بيانات هذه الجلسة'
              : 'سجّل جلسة قراءة سابقة لم تُسجَّل'}
          </p>
        </div>

        <div className="space-y-4">
          {/* Pages row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">
                من صفحة
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={TOTAL_PAGES}
                value={startPage}
                onChange={(e) => { setStartPage(e.target.value); setError('') }}
                placeholder="1"
                className="w-full text-center text-lg font-bold py-2.5 px-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:border-emerald-500 focus:outline-none transition-colors"
                dir="ltr"
                autoFocus
              />
              {startSurah && (
                <p className="text-xs text-gray-400 mt-1 text-center">{startSurah.name}</p>
              )}
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">
                إلى صفحة
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={TOTAL_PAGES}
                value={endPage}
                onChange={(e) => { setEndPage(e.target.value); setError('') }}
                placeholder={TOTAL_PAGES.toString()}
                className="w-full text-center text-lg font-bold py-2.5 px-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:border-emerald-500 focus:outline-none transition-colors"
                dir="ltr"
              />
              {endSurah && (
                <p className="text-xs text-gray-400 mt-1 text-center">{endSurah.name}</p>
              )}
            </div>
          </div>

          {pagesCount > 0 && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 text-center font-medium">
              {pagesCount} صفحة
            </p>
          )}

          {/* Duration */}
          <div>
            <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">
              المدة (بالدقائق)
            </label>
            <input
              type="number"
              inputMode="decimal"
              min={1}
              step="any"
              value={durationMin}
              onChange={(e) => { setDurationMin(e.target.value); setError('') }}
              placeholder="30"
              className="w-full text-center text-lg font-bold py-2.5 px-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:border-emerald-500 focus:outline-none transition-colors"
              dir="ltr"
            />
          </div>

          {/* Date/time */}
          <div>
            <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">
              التاريخ والوقت
            </label>
            <input
              type="datetime-local"
              value={dateTime}
              onChange={(e) => { setDateTime(e.target.value); setError('') }}
              className="w-full text-center text-base py-2.5 px-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:border-emerald-500 focus:outline-none transition-colors"
              dir="ltr"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}
        </div>

        <div className="mt-5">
          <button
            onClick={handleSave}
            className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-lg transition-colors active:scale-[0.98]"
          >
            {isEdit ? 'حفظ التعديلات' : 'إضافة الجلسة'}
          </button>
        </div>
      </div>
    </div>
  )
}
