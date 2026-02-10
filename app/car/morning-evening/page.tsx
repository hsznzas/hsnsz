'use client'

import Link from 'next/link'
import { adhkarTitles } from '@/lib/adhkar-data'
import { useAdhkarFormatting } from '@/lib/hooks/useAdhkarFormatting'
import { useAdhkarContent } from '@/lib/hooks/useAdhkarContent'
import { FormattedText } from '@/lib/adhkar-formatter'
import { ArrowRight, Settings, Edit } from 'lucide-react'

export default function MorningEveningAdhkarPage() {
  const { formatting: f, isLoading: formatLoading } = useAdhkarFormatting()
  const { content, isLoading: contentLoading } = useAdhkarContent()
  
  // Detect dark mode
  const isDark = typeof window !== 'undefined' && 
    document.documentElement.classList.contains('dark')

  // Dynamic colors based on mode
  const bg = isDark ? f.darkBackground : f.lightBackground
  const cardBg = isDark ? f.darkCardBackground : f.lightCardBackground
  const textColor = isDark ? f.darkTextColor : f.lightTextColor
  const noteColor = isDark ? f.darkNoteColor : f.lightNoteColor
  const accent = isDark ? f.accentColorDark : f.accentColor

  const isLoading = formatLoading || contentLoading

  if (isLoading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: bg }}
      >
        <div style={{ color: noteColor }}>جاري التحميل...</div>
      </div>
    )
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen transition-colors"
      style={{
        backgroundColor: bg,
        fontFamily: '"Geeza Pro", "Noto Sans Arabic", system-ui, sans-serif',
      }}
    >
      {/* Fixed Header */}
      <header 
        className="sticky top-0 z-10 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800"
        style={{ backgroundColor: `${bg}f2` }}
      >
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/car"
              className="flex items-center justify-center w-14 h-14 rounded-full bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 hover:bg-sky-200 dark:hover:bg-sky-900 transition-colors"
              aria-label="العودة"
            >
              <ArrowRight size={28} />
            </Link>
            <h1
              className="font-bold"
              style={{
                color: textColor,
                fontSize: f.titleSize,
                lineHeight: 1.4,
              }}
            >
              {adhkarTitles.morningEvening}
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Link
              href="/car/edit"
              className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
              aria-label="تعديل المحتوى"
            >
              <Edit size={20} />
            </Link>
            <Link
              href="/car/settings"
              className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
              aria-label="الإعدادات"
            >
              <Settings size={20} />
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex flex-col" style={{ gap: f.cardGap }}>
          {content.morningEvening.map((dhikr, index) => (
            <article
              key={dhikr.id}
              className="shadow-sm"
              style={{
                backgroundColor: cardBg,
                padding: f.cardPadding,
                borderRadius: f.cardBorderRadius,
              }}
            >
              {/* Number Badge */}
              <div className="flex items-start gap-4 mb-4">
                <span
                  className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 font-bold shrink-0"
                  style={{ fontSize: Math.round(f.noteSize * 1.1) }}
                >
                  {index + 1}
                </span>

                {/* Category Badge */}
                {dhikr.category && dhikr.category !== 'both' && (
                  <span
                    className="inline-flex items-center px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300"
                    style={{ fontSize: Math.round(f.noteSize * 0.9) }}
                  >
                    {dhikr.category === 'morning' ? 'صباحًا فقط' : 'مساءً فقط'}
                  </span>
                )}
              </div>

              {/* Dhikr Text */}
              <div
                style={{
                  color: textColor,
                  fontSize: f.dhikrTextSize,
                  lineHeight: f.dhikrLineHeight,
                  letterSpacing: `${f.letterSpacing}em`,
                }}
              >
                <FormattedText text={dhikr.text} />
              </div>

              {/* Bottom Row: Repetitions and Note */}
              {(dhikr.repetitions || dhikr.note) && (
                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 flex flex-col gap-4">
                  {/* Repetitions */}
                  {dhikr.repetitions && (
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex items-center justify-center px-4 py-2 rounded-full font-bold"
                        style={{
                          backgroundColor: `${accent}20`,
                          color: accent,
                          fontSize: f.repetitionSize,
                        }}
                      >
                        {dhikr.repetitions} مرة
                      </span>
                    </div>
                  )}

                  {/* Note */}
                  {dhikr.note && (
                    <p
                      style={{
                        color: noteColor,
                        fontSize: f.noteSize,
                        lineHeight: f.noteLineHeight,
                      }}
                    >
                      {dhikr.note}
                    </p>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>

        {/* Bottom padding for scrolling */}
        <div className="h-16" />
      </main>
    </div>
  )
}
