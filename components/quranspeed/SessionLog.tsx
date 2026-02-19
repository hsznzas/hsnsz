'use client'

import { Trash2, Pencil, Plus } from 'lucide-react'
import { getSurahForPage } from '@/data/surahs'
import type { QuranSession } from '@/lib/hooks/useQuranTimer'

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0 && m > 0) return `${h} س ${m} د`
  if (h > 0) return `${h} س`
  if (m > 0) return `${m} د`
  return `أقل من دقيقة`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('ar-SA', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface SessionLogProps {
  sessions: QuranSession[]
  onDelete: (id: string) => void
  onEdit: (session: QuranSession) => void
  onAddManual: () => void
}

export default function SessionLog({ sessions, onDelete, onEdit, onAddManual }: SessionLogProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
          سجل الجلسات ({sessions.length})
        </h3>
        <button
          onClick={onAddManual}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors active:scale-[0.97]"
        >
          <Plus size={14} />
          إضافة يدوية
        </button>
      </div>

      {sessions.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">
          لا توجد جلسات مسجلة بعد
        </div>
      )}

      {sessions.map((s) => {
        const minPerPage =
          s.duration_seconds && s.pages_count
            ? (s.duration_seconds / s.pages_count / 60).toFixed(1)
            : '—'
        const startSurah = getSurahForPage(s.start_page)
        const endSurah = s.end_page ? getSurahForPage(s.end_page) : null

        return (
          <div
            key={s.id}
            className="group relative flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
          >
            <div
              className="shrink-0 w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-sm font-bold"
            >
              {s.pages_count}
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">
                من ص{s.start_page}
                {startSurah && (
                  <span className="text-gray-400"> ({startSurah.name})</span>
                )}
                {' '}إلى ص{s.end_page}
                {endSurah && (
                  <span className="text-gray-400"> ({endSurah.name})</span>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                <span>{formatDuration(s.duration_seconds ?? 0)}</span>
                <span>{minPerPage} د/صفحة</span>
                <span>{formatDate(s.start_at)}</span>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
              <button
                onClick={() => onEdit(s)}
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="تعديل"
              >
                <Pencil size={15} />
              </button>
              <button
                onClick={() => onDelete(s.id)}
                className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400 hover:text-red-600 transition-colors"
                aria-label="حذف"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
