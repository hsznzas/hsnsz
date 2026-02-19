'use client'

import { Circle, Square } from 'lucide-react'

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`
  return `${pad(m)}:${pad(s)}`
}

interface RecordButtonProps {
  isRecording: boolean
  elapsed: number
  startPage: number
  onRecord: () => void
  onStop: () => void
}

export default function RecordButton({
  isRecording,
  elapsed,
  startPage,
  onRecord,
  onStop,
}: RecordButtonProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-2xl px-4 pb-4">
        {isRecording ? (
          <button
            onClick={onStop}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white shadow-2xl shadow-red-600/30 transition-all"
          >
            <Square size={22} fill="currentColor" />
            <div className="flex flex-col items-center">
              <span
                className="text-2xl font-mono font-bold tabular-nums tracking-wider"
                dir="ltr"
              >
                {formatElapsed(elapsed)}
              </span>
              <span className="text-xs opacity-80">
                من صفحة {startPage}
              </span>
            </div>
          </button>
        ) : (
          <button
            onClick={onRecord}
            className="w-full flex items-center justify-center gap-3 py-5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white shadow-2xl shadow-emerald-600/30 transition-all"
          >
            <Circle size={22} fill="currentColor" className="animate-pulse" />
            <span className="text-lg font-semibold">ابدأ التسجيل</span>
          </button>
        )}
      </div>
    </div>
  )
}
