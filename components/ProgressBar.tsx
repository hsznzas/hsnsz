'use client'

interface ProgressBarProps {
  completed: number
  total: number
  progress: number
}

export function ProgressBar({ completed, total, progress }: ProgressBarProps) {
  return (
    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold text-sm uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Daily Progress
        </span>
        <span className="font-bold text-slate-900 dark:text-white">{progress}%</span>
      </div>
      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5">
        <div 
          className="bg-emerald-500 dark:bg-emerald-400 h-2.5 rounded-full transition-all duration-500 ease-out" 
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
        {completed} of {total} tasks completed
      </p>
    </div>
  )
}
