'use client'

import { useMemo } from 'react'
import { BookOpen, Clock, Zap, BarChart3 } from 'lucide-react'
import { TOTAL_PAGES } from '@/data/surahs'
import type { QuranSession } from '@/lib/hooks/useQuranTimer'

interface StatsHeaderProps {
  sessions: QuranSession[]
}

function formatAvg(minutes: number): string {
  if (minutes < 1) return `${Math.round(minutes * 60)} ث`
  return `${minutes.toFixed(1)} د`
}

export default function StatsHeader({ sessions }: StatsHeaderProps) {
  const stats = useMemo(() => {
    const completed = sessions.filter(
      (s) => s.pages_count && s.duration_seconds
    )

    const totalPages = completed.reduce((sum, s) => sum + (s.pages_count ?? 0), 0)
    const totalSeconds = completed.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0)
    const avgMinPerPage = totalPages > 0 ? totalSeconds / totalPages / 60 : 0

    let fastestMinPerPage = Infinity
    for (const s of completed) {
      const mpp = s.duration_seconds! / s.pages_count! / 60
      if (mpp < fastestMinPerPage) fastestMinPerPage = mpp
    }
    if (!isFinite(fastestMinPerPage)) fastestMinPerPage = 0

    const progressPercent = Math.min(
      100,
      Math.round((totalPages / TOTAL_PAGES) * 100)
    )

    return {
      totalPages,
      sessionsCount: completed.length,
      avgMinPerPage,
      fastestMinPerPage,
      progressPercent,
    }
  }, [sessions])

  const cards = [
    {
      label: 'إجمالي الصفحات',
      value: stats.totalPages.toLocaleString('ar-SA'),
      icon: BookOpen,
      accent: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40',
    },
    {
      label: 'متوسط السرعة',
      value: stats.avgMinPerPage > 0 ? `${formatAvg(stats.avgMinPerPage)}/صفحة` : '—',
      icon: Clock,
      accent: 'text-blue-600 bg-blue-100 dark:bg-blue-900/40',
    },
    {
      label: 'أسرع جلسة',
      value: stats.fastestMinPerPage > 0 ? `${formatAvg(stats.fastestMinPerPage)}/صفحة` : '—',
      icon: Zap,
      accent: 'text-amber-600 bg-amber-100 dark:bg-amber-900/40',
    },
    {
      label: 'عدد الجلسات',
      value: stats.sessionsCount.toLocaleString('ar-SA'),
      icon: BarChart3,
      accent: 'text-purple-600 bg-purple-100 dark:bg-purple-900/40',
    },
  ]

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {cards.map((c) => (
          <div
            key={c.label}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-white dark:bg-[#1e1e1e] border border-gray-100 dark:border-gray-800"
          >
            <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${c.accent}`}>
              <c.icon size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{c.label}</div>
              <div className="text-sm font-bold truncate">{c.value}</div>
            </div>
          </div>
        ))}
      </div>

      {stats.totalPages > 0 && (
        <div className="px-1">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>التقدم الكلي</span>
            <span dir="ltr">{stats.progressPercent}%</span>
          </div>
          <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${stats.progressPercent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
