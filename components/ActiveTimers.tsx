'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, X, ChevronDown, ChevronUp } from 'lucide-react'
import { clsx } from 'clsx'
import type { Task } from '@/lib/supabase/types'
import { CATEGORY_COLORS } from '@/lib/supabase/types'
import type { ActiveTimer } from '@/lib/hooks/useTaskStore'

interface ActiveTimersProps {
  timers: ActiveTimer[]
  tasks: Task[]
  onStopTimer: (taskId: number) => void
}

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function TimerDisplay({ timer, task, onStop }: { 
  timer: ActiveTimer
  task?: Task
  onStop: () => void 
}) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const initial = Math.floor((Date.now() - timer.startTime.getTime()) / 1000)
    setElapsed(initial)

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - timer.startTime.getTime()) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [timer.startTime])

  const categoryColor = task ? CATEGORY_COLORS[task.category] : 'bg-gray-100 text-gray-800'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 border border-emerald-200"
    >
      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColor}`}>
            {task?.category}
          </span>
          <span className="text-sm font-medium text-slate-700 truncate">
            {task?.text || 'Unknown task'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="font-mono text-sm font-medium text-emerald-600">
          {formatDuration(elapsed)}
        </span>
        <button
          onClick={onStop}
          className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  )
}

export function ActiveTimers({ timers, tasks, onStopTimer }: ActiveTimersProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  if (timers.length === 0) return null

  const getTask = (taskId: number) => tasks.find(t => t.id === taskId)

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl overflow-hidden bg-white border border-emerald-200 shadow-sm"
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <Clock className="w-5 h-5 text-emerald-600" />
            <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center text-xs font-bold text-white bg-emerald-500 rounded-full">
              {timers.length}
            </span>
          </div>
          <span className="font-medium text-slate-700">
            Active Timers
          </span>
        </div>
        
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {/* Timer list */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">
              <AnimatePresence mode="popLayout">
                {timers.map(timer => (
                  <TimerDisplay
                    key={timer.taskId}
                    timer={timer}
                    task={getTask(timer.taskId)}
                    onStop={() => onStopTimer(timer.taskId)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
