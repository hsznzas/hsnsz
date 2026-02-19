'use client'

import { useMemo } from 'react'
import { LineChart } from '@mui/x-charts/LineChart'
import { surahs, TOTAL_PAGES, getSurahForPage } from '@/data/surahs'
import type { QuranSession } from '@/lib/hooks/useQuranTimer'

interface QuranChartProps {
  sessions: QuranSession[]
}

export default function QuranChart({ sessions }: QuranChartProps) {
  const { dataset, surahLabels } = useMemo(() => {
    const completed = sessions
      .filter((s) => s.end_page !== null && s.duration_seconds !== null && s.pages_count !== null)
      .sort((a, b) => a.start_page - b.start_page)

    const points = completed.map((s) => {
      const midPage = Math.round((s.start_page + s.end_page!) / 2)
      const minPerPage = s.duration_seconds! / s.pages_count! / 60
      return { page: midPage, speed: parseFloat(minPerPage.toFixed(2)) }
    })

    const labels = surahs
      .filter((_, i) => {
        const longSurahs = [0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 17, 35]
        return longSurahs.includes(i)
      })
      .map((s) => ({ page: s.startPage, name: s.name }))

    return { dataset: points, surahLabels: labels }
  }, [sessions])

  if (dataset.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        <p className="text-gray-400 text-sm">لا توجد بيانات بعد — ابدأ أول جلسة</p>
      </div>
    )
  }

  return (
    <div className="w-full overflow-x-auto rounded-2xl bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 p-2">
      <div style={{ minWidth: Math.max(600, dataset.length * 40), direction: 'ltr' }}>
        <LineChart
          dataset={dataset}
          xAxis={[
            {
              dataKey: 'page',
              label: 'الصفحة',
              min: 0,
              max: TOTAL_PAGES,
              valueFormatter: (v: number) => {
                const surah = getSurahForPage(v)
                return surah ? `ص${v} (${surah.name})` : `ص${v}`
              },
            },
          ]}
          yAxis={[
            {
              label: 'دقيقة / صفحة',
              min: 0,
            },
          ]}
          series={[
            {
              dataKey: 'speed',
              label: 'السرعة (د/صفحة)',
              color: '#10b981',
              curve: 'monotoneX',
              showMark: true,
              area: true,
              valueFormatter: (v: number | null) =>
                v !== null ? `${v.toFixed(2)} د/صفحة` : '',
            },
          ]}
          height={300}
          grid={{ horizontal: true }}
          hideLegend
          sx={{
            '& .MuiAreaElement-root': {
              fillOpacity: 0.15,
            },
            '& .MuiLineElement-root': {
              strokeWidth: 2.5,
            },
          }}
        />
      </div>

      {dataset.length > 0 && (
        <div className="flex gap-2 px-3 pb-2 overflow-x-auto text-[11px] text-gray-400" dir="rtl">
          {surahLabels.map((s) => (
            <span key={s.page} className="whitespace-nowrap">
              ص{s.page}: {s.name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
