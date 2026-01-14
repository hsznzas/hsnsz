'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, Circle, Clock, Play, Pause } from 'lucide-react'
import type { Task } from '@/lib/supabase/types'
import { CategoryBadge } from './CategoryBadge'

interface TaskItemProps {
  task: Task
  onToggle: (id: number) => void
  showCategory?: boolean
  isTimerActive?: boolean
  timerStartTime?: Date
  onStartTimer?: () => void
  onStopTimer?: () => void
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function TaskItem({ 
  task, 
  onToggle, 
  showCategory = true,
  isTimerActive = false,
  timerStartTime,
  onStartTimer,
  onStopTimer,
}: TaskItemProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (isTimerActive && timerStartTime) {
      const initial = Math.floor((Date.now() - timerStartTime.getTime()) / 1000)
      setElapsed(initial)

      const interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - timerStartTime.getTime()) / 1000))
      }, 1000)

      return () => clearInterval(interval)
    } else {
      setElapsed(0)
    }
  }, [isTimerActive, timerStartTime])

  return (
    <div 
      className={`group flex items-start gap-3 p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-all ${task.completed ? 'opacity-50' : ''}`}
    >
      {/* Checkbox */}
      <div 
        onClick={() => onToggle(task.id)}
        className="mt-1 text-slate-400 dark:text-slate-500 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors"
      >
        {task.completed ? (
          <CheckCircle className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
        ) : (
          <Circle className="w-5 h-5" />
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1" onClick={() => onToggle(task.id)}>
        <div className={`text-sm font-medium ${task.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>
          {task.text}
        </div>
        
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {showCategory && <CategoryBadge category={task.category} />}
          
          <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
            <Clock className="w-3 h-3" />
            <span>{task.duration}</span>
          </div>

          {task.priority === "High" && !task.completed && (
            <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/40 px-1.5 py-0.5 rounded">
              High Priority
            </span>
          )}

          {/* Timer display when active */}
          {isTimerActive && (
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0.5 rounded font-mono animate-pulse">
              ⏱️ {formatDuration(elapsed)}
            </span>
          )}
        </div>
      </div>

      {/* Timer Button */}
      {!task.completed && onStartTimer && onStopTimer && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            isTimerActive ? onStopTimer() : onStartTimer()
          }}
          className={`p-2 rounded-lg transition-all hover:scale-110 active:scale-95 ${
            isTimerActive
              ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/60'
              : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/60'
          }`}
          title={isTimerActive ? 'Stop timer' : 'Start timer'}
        >
          {isTimerActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
      )}
    </div>
  )
}
