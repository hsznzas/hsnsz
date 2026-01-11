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
      className={`group flex items-start gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer transition-all ${task.completed ? 'opacity-50' : ''}`}
    >
      {/* Checkbox */}
      <div 
        onClick={() => onToggle(task.id)}
        className="mt-1 text-slate-400 group-hover:text-emerald-500 transition-colors"
      >
        {task.completed ? (
          <CheckCircle className="w-5 h-5 text-emerald-500" />
        ) : (
          <Circle className="w-5 h-5" />
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1" onClick={() => onToggle(task.id)}>
        <div className={`text-sm font-medium ${task.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
          {task.text}
        </div>
        
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {showCategory && <CategoryBadge category={task.category} />}
          
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Clock className="w-3 h-3" />
            <span>{task.duration}</span>
          </div>

          {task.priority === "High" && !task.completed && (
            <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
              High Priority
            </span>
          )}

          {/* Timer display when active */}
          {isTimerActive && (
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-mono animate-pulse">
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
              ? 'bg-red-100 text-red-600 hover:bg-red-200'
              : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
          }`}
          title={isTimerActive ? 'Stop timer' : 'Start timer'}
        >
          {isTimerActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
      )}
    </div>
  )
}
