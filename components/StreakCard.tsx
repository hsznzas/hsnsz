'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, Circle, Flame, Target, X, Pencil, Save, Trash2, ChevronLeft, ChevronRight, Undo2 } from 'lucide-react'
import type { Task, Category, Priority } from '@/lib/supabase/types'
import { CATEGORIES, PRIORITIES } from '@/lib/supabase/types'

interface StreakLog {
  date: string // ISO date string (YYYY-MM-DD)
  completed: boolean
}

interface StreakCardProps {
  task: Task
  onToggle: (id: number) => void
  onUpdateTask?: (id: number, updates: Partial<Pick<Task, 'text' | 'category' | 'priority' | 'duration' | 'streak_target'>>) => void
  onDeleteTask?: (id: number) => void
}

const DURATION_OPTIONS = ['Daily', '5 min', '10 min', '15 min', '30 min', '1 hour', 'Unknown']

// Get stored streak logs from localStorage
function getStreakLogs(taskId: number): StreakLog[] {
  if (typeof window === 'undefined') return []
  const stored = localStorage.getItem(`streak-logs-${taskId}`)
  return stored ? JSON.parse(stored) : []
}

// Save streak logs to localStorage
function saveStreakLogs(taskId: number, logs: StreakLog[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(`streak-logs-${taskId}`, JSON.stringify(logs))
}

// Get today's date in YYYY-MM-DD format
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}

// Calculate current streak from logs
function calculateStreak(logs: StreakLog[]): number {
  if (logs.length === 0) return 0
  
  const sortedLogs = [...logs].sort((a, b) => b.date.localeCompare(a.date))
  let streak = 0
  let checkDate = new Date()
  
  // If today is not completed, start checking from yesterday
  const todayLog = sortedLogs.find(l => l.date === getTodayDate())
  if (!todayLog?.completed) {
    checkDate.setDate(checkDate.getDate() - 1)
  }
  
  for (const log of sortedLogs) {
    const logDate = log.date
    const expectedDate = checkDate.toISOString().split('T')[0]
    
    if (logDate === expectedDate && log.completed) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else if (logDate < expectedDate) {
      break
    }
  }
  
  return streak
}

// Get days in a month
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export function StreakCard({ task, onToggle, onUpdateTask, onDeleteTask }: StreakCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(task.text)
  const [editPriority, setEditPriority] = useState<Priority>(task.priority)
  const [editDuration, setEditDuration] = useState(task.duration)
  const [editTarget, setEditTarget] = useState(task.streak_target || 30)
  const [streakLogs, setStreakLogs] = useState<StreakLog[]>([])
  const [viewMonth, setViewMonth] = useState(new Date())
  
  const targetStreak = task.streak_target || 30
  
  // Load streak logs on mount
  useEffect(() => {
    setStreakLogs(getStreakLogs(task.id))
  }, [task.id])
  
  // Calculate current streak from logs
  const currentStreak = calculateStreak(streakLogs)
  const progress = Math.min((currentStreak / targetStreak) * 100, 100)
  const remaining = Math.max(targetStreak - currentStreak, 0)
  
  // Check if completed today
  const todayLog = streakLogs.find(l => l.date === getTodayDate())
  const isCompletedToday = todayLog?.completed || false

  // Toggle today's completion
  const handleToggleToday = () => {
    const today = getTodayDate()
    let newLogs: StreakLog[]
    
    if (isCompletedToday) {
      // Undo - remove today's log or mark as not completed
      newLogs = streakLogs.map(l => 
        l.date === today ? { ...l, completed: false } : l
      )
    } else {
      // Mark as completed
      const existingLog = streakLogs.find(l => l.date === today)
      if (existingLog) {
        newLogs = streakLogs.map(l => 
          l.date === today ? { ...l, completed: true } : l
        )
      } else {
        newLogs = [...streakLogs, { date: today, completed: true }]
      }
    }
    
    setStreakLogs(newLogs)
    saveStreakLogs(task.id, newLogs)
  }

  const handleSaveEdit = () => {
    if (onUpdateTask && editText.trim()) {
      onUpdateTask(task.id, {
        text: editText.trim(),
        priority: editPriority,
        duration: editDuration,
        streak_target: editTarget,
      })
      setIsEditing(false)
    }
  }

  const handleCancelEdit = () => {
    setEditText(task.text)
    setEditPriority(task.priority)
    setEditDuration(task.duration)
    setEditTarget(task.streak_target || 30)
    setIsEditing(false)
  }

  // Calendar navigation
  const goToPrevMonth = () => {
    setViewMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }
  
  const goToNextMonth = () => {
    const nextMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1)
    if (nextMonth <= new Date()) {
      setViewMonth(nextMonth)
    }
  }

  // Generate calendar days for the view month
  const generateCalendarDays = () => {
    const year = viewMonth.getFullYear()
    const month = viewMonth.getMonth()
    const daysInMonth = getDaysInMonth(year, month)
    const firstDay = new Date(year, month, 1).getDay()
    
    const days: (number | null)[] = []
    
    // Add empty slots for days before the 1st
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }
    
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }
    
    return days
  }

  // Check if a day is completed
  const isDayCompleted = (day: number): boolean => {
    const dateStr = `${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return streakLogs.some(l => l.date === dateStr && l.completed)
  }

  // Check if a day is today
  const isToday = (day: number): boolean => {
    const today = new Date()
    return viewMonth.getFullYear() === today.getFullYear() && 
           viewMonth.getMonth() === today.getMonth() && 
           day === today.getDate()
  }

  // Check if a day is in the future
  const isFuture = (day: number): boolean => {
    const checkDate = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day)
    return checkDate > new Date()
  }

  const calendarDays = generateCalendarDays()

  return (
    <div className={`rounded-xl border transition-all overflow-hidden ${
      isCompletedToday 
        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' 
        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
    }`}>
      {/* Main Card - Clickable */}
      <div 
        className={`p-4 cursor-pointer ${!isExpanded ? 'hover:bg-slate-50 dark:hover:bg-slate-700/50' : ''}`}
        onClick={() => !isEditing && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-3">
          {/* Circular Progress Ring */}
          <div className="relative w-14 h-14 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-slate-200 dark:text-slate-700"
              />
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={`${progress} 100`}
                strokeLinecap="round"
                className={isCompletedToday ? 'text-emerald-500' : 'text-amber-500'}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Flame className={`w-5 h-5 ${isCompletedToday ? 'text-emerald-500' : 'text-amber-500'}`} />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-slate-800 dark:text-slate-200 truncate">
                {task.text}
              </h4>
              {isCompletedToday && (
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0.5 rounded">
                  ✓ Done Today
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-4 mt-2 text-xs">
              <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <Flame className="w-3.5 h-3.5" />
                <span className="font-bold">{currentStreak}</span>
                <span className="text-slate-400 dark:text-slate-500">day streak</span>
              </div>
              
              <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <Target className="w-3.5 h-3.5" />
                <span>{remaining} days to target</span>
              </div>
            </div>
          </div>

          {/* Complete/Undo Button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleToggleToday()
            }}
            className={`p-2 rounded-lg transition-all ${
              isCompletedToday
                ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-800/40'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 hover:text-emerald-600 dark:hover:text-emerald-400'
            }`}
            title={isCompletedToday ? 'Undo today\'s completion' : 'Mark as done today'}
          >
            {isCompletedToday ? (
              <Undo2 className="w-5 h-5" />
            ) : (
              <Circle className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded View */}
      {isExpanded && (
        <div className="border-t border-slate-200 dark:border-slate-700">
          {/* Edit Mode */}
          {isEditing ? (
            <div className="p-4 space-y-3 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Edit Streak Habit</span>
                <button onClick={handleCancelEdit} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
              
              <input
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Habit name"
                autoFocus
              />

              <div className="flex gap-2">
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as Priority)}
                  className="flex-1 px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                >
                  {PRIORITIES.map(pri => (
                    <option key={pri} value={pri}>{pri}</option>
                  ))}
                </select>

                <select
                  value={editDuration}
                  onChange={(e) => setEditDuration(e.target.value)}
                  className="flex-1 px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                >
                  {DURATION_OPTIONS.map(dur => (
                    <option key={dur} value={dur}>{dur}</option>
                  ))}
                </select>
              </div>

              {/* Target Days */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">Target:</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={editTarget}
                  onChange={(e) => setEditTarget(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-center"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">days</span>
              </div>

              <div className="flex justify-between items-center pt-2">
                {onDeleteTask && (
                  <button
                    onClick={() => {
                      if (confirm('Delete this streak habit?')) {
                        onDeleteTask(task.id)
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                )}
                <div className="flex gap-2 ml-auto">
                  <button onClick={handleCancelEdit} className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg">
                    Cancel
                  </button>
                  <button onClick={handleSaveEdit} className="px-3 py-1.5 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg flex items-center gap-1">
                    <Save className="w-3 h-3" />
                    Save
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Action Bar */}
              <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Streak History</span>
                {onUpdateTask && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsEditing(true)
                    }}
                    className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
                    title="Edit habit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Calendar View */}
              <div className="p-4">
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      goToPrevMonth()
                    }}
                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-500" />
                  </button>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      goToNextMonth()
                    }}
                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                    disabled={viewMonth.getMonth() === new Date().getMonth() && viewMonth.getFullYear() === new Date().getFullYear()}
                  >
                    <ChevronRight className={`w-4 h-4 ${
                      viewMonth.getMonth() === new Date().getMonth() && viewMonth.getFullYear() === new Date().getFullYear()
                        ? 'text-slate-300 dark:text-slate-600'
                        : 'text-slate-500'
                    }`} />
                  </button>
                </div>

                {/* Day Labels */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                    <div key={i} className="text-center text-[10px] font-medium text-slate-400 dark:text-slate-500 py-1">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, i) => (
                    <div
                      key={i}
                      className={`aspect-square flex items-center justify-center text-xs rounded-md ${
                        day === null
                          ? ''
                          : isFuture(day)
                            ? 'text-slate-300 dark:text-slate-600'
                            : isToday(day)
                              ? isDayCompleted(day)
                                ? 'bg-emerald-500 text-white font-bold ring-2 ring-emerald-300 dark:ring-emerald-600'
                                : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold ring-2 ring-amber-400'
                              : isDayCompleted(day)
                                ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-medium'
                                : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Stats */}
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{currentStreak}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Current Streak</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {streakLogs.filter(l => l.completed).length}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Total Days</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{targetStreak}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Target</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
