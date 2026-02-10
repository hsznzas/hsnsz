'use client'

import Link from 'next/link'
import { adhkarTitles } from '@/lib/adhkar-data'
import { Settings, Edit } from 'lucide-react'

export default function CarPage() {
  return (
    <div
      dir="rtl"
      className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#faf8f5] dark:bg-[#1a1a1a] transition-colors relative"
    >
      {/* Top Buttons */}
      <div className="absolute top-6 left-6 flex items-center gap-3">
        <Link
          href="/car/edit"
          className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
          aria-label="Edit Content"
        >
          <Edit size={24} className="text-slate-600 dark:text-slate-400" />
        </Link>
        <Link
          href="/car/settings"
          className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
          aria-label="Settings"
        >
          <Settings size={24} className="text-slate-600 dark:text-slate-400" />
        </Link>
      </div>
      
      {/* Main Container */}
      <div className="w-full max-w-2xl flex flex-col gap-8">
        {/* Exit Adhkar Button */}
        <Link
          href="/car/exit"
          className="w-full py-16 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 transition-all duration-200 shadow-lg hover:shadow-xl active:scale-[0.98]"
        >
          <span
            className="block text-center text-white font-semibold"
            style={{
              fontSize: 'clamp(28px, 6vw, 40px)',
              fontFamily: '"Geeza Pro", "Noto Sans Arabic", system-ui, sans-serif',
              lineHeight: 1.4,
            }}
          >
            {adhkarTitles.exit}
          </span>
        </Link>

        {/* Morning/Evening Adhkar Button */}
        <Link
          href="/car/morning-evening"
          className="w-full py-16 px-8 rounded-2xl bg-sky-600 hover:bg-sky-700 dark:bg-sky-700 dark:hover:bg-sky-600 transition-all duration-200 shadow-lg hover:shadow-xl active:scale-[0.98]"
        >
          <span
            className="block text-center text-white font-semibold"
            style={{
              fontSize: 'clamp(28px, 6vw, 40px)',
              fontFamily: '"Geeza Pro", "Noto Sans Arabic", system-ui, sans-serif',
              lineHeight: 1.4,
            }}
          >
            {adhkarTitles.morningEvening}
          </span>
        </Link>
      </div>
    </div>
  )
}
