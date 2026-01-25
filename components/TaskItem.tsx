'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { CheckCircle, Circle, Clock, Play, Pause, Square, Pin, PinOff, Calendar, AlertTriangle, Trash2, X, Save, Zap, ChevronLeft, ChevronRight, Archive } from 'lucide-react'
import type { Task, Category, Priority } from '@/lib/supabase/types'
import { CATEGORIES, PRIORITIES } from '@/lib/supabase/types'
import { CategoryBadge } from './CategoryBadge'

interface TaskItemProps {
  task: Task
  onToggle: (id: number) => void
  onToggleWaiting?: (id: number) => void
  showCategory?: boolean
  isTimerActive?: boolean
  isTimerPaused?: boolean
  timerStartTime?: Date
  accumulatedSeconds?: number
  onStartTimer?: () => void
  onPauseTimer?: () => void
  onStopTimer?: () => void
  onPinToToday?: (id: number, pinned: boolean) => void
  showPinButton?: boolean
  showQuickWinButton?: boolean
  onUpdateDueDate?: (id: number, date: string | null) => void
  onUpdateTask?: (id: number, updates: Partial<Pick<Task, 'text' | 'category' | 'priority' | 'duration'>>) => void
  onDeleteTask?: (id: number) => void
  onArchiveTask?: (id: number) => void
  isNew?: boolean
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatTimeRemaining(dueDate: string): { text: string; isUrgent: boolean } {
  const now = new Date()
  const due = new Date(dueDate)
  const diff = due.getTime() - now.getTime()
  
  if (diff < 0) {
    return { text: 'Overdue!', isUrgent: true }
  }
  
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  
  if (days > 0) {
    return { text: `${days}d ${remainingHours}h left`, isUrgent: days === 0 && hours < 24 }
  } else if (hours > 0) {
    return { text: `${hours}h left`, isUrgent: hours < 24 }
  } else {
    const minutes = Math.floor(diff / (1000 * 60))
    return { text: `${minutes}m left`, isUrgent: true }
  }
}

function formatWaitingElapsed(sinceIso: string, nowMs: number): string {
  const sinceMs = new Date(sinceIso).getTime()
  if (Number.isNaN(sinceMs)) return '0m'
  const diffMs = Math.max(nowMs - sinceMs, 0)
  const totalMinutes = Math.floor(diffMs / (1000 * 60))
  const totalHours = Math.floor(totalMinutes / 60)
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24

  if (days > 0) {
    return `${days}d ${hours}h`
  }
  if (totalHours > 0) {
    return `${totalHours}h`
  }
  return `${Math.max(totalMinutes, 1)}m`
}

const DURATION_OPTIONS = ['5 min', '10 min', '15 min', '30 min', '1 hour', '2 hours', 'Unknown']

export function TaskItem({ 
  task, 
  onToggle, 
  onToggleWaiting,
  showCategory = true,
  isTimerActive = false,
  isTimerPaused = false,
  timerStartTime,
  accumulatedSeconds = 0,
  onStartTimer,
  onPauseTimer,
  onStopTimer,
  onPinToToday,
  showPinButton = true,
  showQuickWinButton = true,
  onUpdateDueDate,
  onUpdateTask,
  onDeleteTask,
  onArchiveTask,
  isNew = false,
}: TaskItemProps) {
  const [elapsed, setElapsed] = useState(0)
  const hasAnyTimer = isTimerActive || isTimerPaused
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [datePickerPos, setDatePickerPos] = useState<{ top: number; left: number; placeAbove: boolean } | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(task.text)
  const [editCategory, setEditCategory] = useState<Category>(task.category)
  const [editPriority, setEditPriority] = useState<Priority>(task.priority)
  const [editDuration, setEditDuration] = useState(task.duration)
  const [showShimmer, setShowShimmer] = useState(isNew)
  const [nowTs, setNowTs] = useState(() => Date.now())
  
  const dateButtonRef = useRef<HTMLButtonElement>(null)
  
  // Calculate popup position based on button location
  const openDatePicker = useCallback(() => {
    if (dateButtonRef.current) {
      const rect = dateButtonRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const popupHeight = 150 // Approximate popup height
      
      // Check if there's more space above or below
      const spaceBelow = viewportHeight - rect.bottom
      const spaceAbove = rect.top
      const placeAbove = spaceBelow < popupHeight && spaceAbove > spaceBelow
      
      setDatePickerPos({
        top: placeAbove ? rect.top : rect.bottom + 8,
        left: Math.min(rect.right - 220, window.innerWidth - 240), // Keep within viewport
        placeAbove
      })
    }
    setShowDatePicker(true)
  }, [])
  
  const closeDatePicker = useCallback(() => {
    setShowDatePicker(false)
    setDatePickerPos(null)
  }, [])

  // Shimmer effect for new tasks
  useEffect(() => {
    if (isNew) {
      setShowShimmer(true)
      const timer = setTimeout(() => {
        setShowShimmer(false)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [isNew])

  useEffect(() => {
    if (isTimerActive && timerStartTime) {
      // Timer is running - update every second
      const calculateElapsed = () => {
        const currentSession = Math.floor((Date.now() - timerStartTime.getTime()) / 1000)
        return accumulatedSeconds + currentSession
      }
      
      setElapsed(calculateElapsed())
      const interval = setInterval(() => {
        setElapsed(calculateElapsed())
      }, 1000)

      return () => clearInterval(interval)
    } else if (isTimerPaused) {
      // Timer is paused - show accumulated time only
      setElapsed(accumulatedSeconds)
    } else {
      setElapsed(0)
    }
  }, [isTimerActive, isTimerPaused, timerStartTime, accumulatedSeconds])

  useEffect(() => {
    if (!task.waiting_for_reply || !task.waiting_since) return
    const interval = setInterval(() => {
      setNowTs(Date.now())
    }, 60000)
    return () => clearInterval(interval)
  }, [task.waiting_for_reply, task.waiting_since])

  // Calculate due date urgency
  const dueInfo = useMemo(() => {
    if (!task.due_date || task.completed) return null
    return formatTimeRemaining(task.due_date)
  }, [task.due_date, task.completed])

  const isUrgent = dueInfo?.isUrgent && !task.completed
  const isWaiting = task.waiting_for_reply && !task.completed
  const waitingElapsed = useMemo(() => {
    if (!task.waiting_for_reply || !task.waiting_since) return null
    return formatWaitingElapsed(task.waiting_since, nowTs)
  }, [task.waiting_for_reply, task.waiting_since, nowTs])

  const handleSaveEdit = () => {
    if (onUpdateTask && editText.trim()) {
      onUpdateTask(task.id, {
        text: editText.trim(),
        category: editCategory,
        priority: editPriority,
        duration: editDuration,
      })
      setIsEditing(false)
    }
  }

  const handleCancelEdit = () => {
    setEditText(task.text)
    setEditCategory(task.category)
    setEditPriority(task.priority)
    setEditDuration(task.duration)
    setIsEditing(false)
  }

  // Edit modal
  if (isEditing) {
    return (
      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border-2 border-blue-400 dark:border-blue-500 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Edit Task</span>
          <button
            onClick={handleCancelEdit}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        
        {/* Task Text */}
        <input
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Task description"
          autoFocus
        />

        {/* Category & Priority */}
        <div className="flex gap-2">
          <select
            value={editCategory}
            onChange={(e) => setEditCategory(e.target.value as Category)}
            className="flex-1 px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          
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

        {/* Actions */}
        <div className="flex justify-between items-center pt-2">
          {onDeleteTask && (
            <button
              onClick={() => {
                if (confirm('Delete this task?')) {
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
            <button
              onClick={handleCancelEdit}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg flex items-center gap-1"
            >
              <Save className="w-3 h-3" />
              Save
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div 
      className={`group flex items-start gap-3 p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-all relative ${task.completed ? 'opacity-50' : ''} ${isUrgent ? 'bg-red-50 dark:bg-red-950/20' : ''}`}
    >
      {/* Shimmer Effect */}
      {showShimmer && (
        <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
          <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/30 dark:via-white/10 to-transparent" />
        </div>
      )}

      {/* Checkbox + Waiting Toggle */}
      <div className="mt-1 flex flex-col items-center gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggle(task.id)
          }}
          className="text-slate-400 dark:text-slate-500 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors"
          title={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
        >
          {task.completed ? (
            <CheckCircle className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
          ) : (
            <Circle className={`w-5 h-5 ${isUrgent ? 'text-red-500' : ''}`} />
          )}
        </button>
        {onToggleWaiting && !task.completed && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleWaiting(task.id)
            }}
            className={`p-0.5 rounded transition-colors ${
              task.waiting_for_reply
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-slate-300 dark:text-slate-600 hover:text-amber-500 dark:hover:text-amber-400'
            }`}
            title={task.waiting_for_reply ? 'Clear waiting status' : 'Mark waiting for reply'}
          >
            <Clock className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0" onClick={() => setIsEditing(true)}>
        {/* Parse title and description from text (format: "EMOJI TITLE\nDESCRIPTION") */}
        {(() => {
          const parts = task.text.split('\n')
          const title = parts[0] || task.text
          const description = parts.slice(1).join('\n')
          
          return (
            <>
              <div className={`text-sm font-semibold ${
                task.completed 
                  ? 'line-through text-slate-400 dark:text-slate-500' 
                  : isWaiting
                    ? 'text-amber-600 dark:text-amber-400'
                    : isUrgent 
                      ? 'text-red-600 dark:text-red-400' 
                      : 'text-slate-900 dark:text-slate-100'
              }`}>
                {title}
              </div>
              {description && (
                <div className={`text-xs mt-0.5 ${
                  task.completed 
                    ? 'line-through text-slate-300 dark:text-slate-600' 
                    : isWaiting
                      ? 'text-amber-500 dark:text-amber-400 font-light'
                      : 'text-slate-500 dark:text-slate-400 font-light'
                }`}>
                  {description}
                </div>
              )}
            </>
          )
        })()}
        
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

          {waitingElapsed && (
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded">
              Waiting {waitingElapsed}
            </span>
          )}

          {/* Due Date Display */}
          {dueInfo && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
              isUrgent 
                ? 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40' 
                : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800'
            }`}>
              {isUrgent && <AlertTriangle className="w-3 h-3" />}
              {dueInfo.text}
            </span>
          )}

          {/* Pinned indicator */}
          {task.pinned_to_today && (
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded flex items-center gap-1">
              <Pin className="w-3 h-3" />
              Today
            </span>
          )}
        </div>
      </div>

      {/* Always visible buttons (state indicators + archive) - higher z-index to stay on top */}
      <div className="flex items-center gap-1 flex-shrink-0 z-10 relative">
        {/* Archive Button - only for completed tasks */}
        {task.completed && onArchiveTask && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onArchiveTask(task.id)
            }}
            className="p-2 rounded-lg transition-all hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
            title="Move to archive"
          >
            <Archive className="w-4 h-4" />
          </button>
        )}

        {/* Due Date Button - only when date is set */}
        {onUpdateDueDate && !task.completed && task.due_date && (
          <div className="relative">
            <button
              ref={dateButtonRef}
              onClick={(e) => {
                e.stopPropagation()
                if (showDatePicker) {
                  closeDatePicker()
                } else {
                  openDatePicker()
                }
              }}
              className="p-2 rounded-lg transition-all bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
              title="Set due date"
            >
              <Calendar className="w-4 h-4" />
            </button>
            
            {showDatePicker && datePickerPos && (
              <>
                <div 
                  className="fixed inset-0 z-[9998]" 
                  onClick={(e) => {
                    e.stopPropagation()
                    closeDatePicker()
                  }}
                />
                <div 
                  className="fixed z-[9999] bg-white dark:bg-slate-800 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-700 p-3 min-w-[220px]"
                  style={{
                    top: datePickerPos.placeAbove ? 'auto' : datePickerPos.top,
                    bottom: datePickerPos.placeAbove ? `${window.innerHeight - datePickerPos.top + 8}px` : 'auto',
                    left: datePickerPos.left,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2 block">Set Due Date</label>
                  <input
                    type="date"
                    value={task.due_date ? task.due_date.slice(0, 10) : ''}
                    onChange={(e) => {
                      const dateValue = e.target.value 
                        ? new Date(e.target.value + 'T23:59:59').toISOString() 
                        : null
                      onUpdateDueDate(task.id, dateValue)
                      closeDatePicker()
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {task.due_date && (
                    <button
                      onClick={() => {
                        onUpdateDueDate(task.id, null)
                        closeDatePicker()
                      }}
                      className="mt-2 w-full text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 py-1.5 rounded-lg transition-colors"
                    >
                      Clear Due Date
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Timer Controls - always visible when active */}
        {!task.completed && onStartTimer && onStopTimer && hasAnyTimer && (
          <div 
            className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-3 pr-1 py-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${isTimerActive ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="text-sm font-mono font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                {formatDuration(elapsed)}
              </span>
            </div>
            
            {onPauseTimer && (
              isTimerActive ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onPauseTimer()
                  }}
                  className="p-1.5 rounded-md transition-all bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
                  title="Pause timer"
                >
                  <Pause className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onStartTimer()
                  }}
                  className="p-1.5 rounded-md transition-all bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
                  title="Resume timer"
                >
                  <Play className="w-3.5 h-3.5" />
                </button>
              )
            )}
            
            <button
              onClick={(e) => {
                e.stopPropagation()
                onStopTimer()
              }}
              className="p-1.5 rounded-md transition-all bg-red-500 hover:bg-red-600 text-white shadow-sm"
              title="Stop & save time"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Hover overlay buttons - absolutely positioned, lower z-index than always-visible */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-lg p-1 shadow-lg border border-slate-200 dark:border-slate-700 z-0">
        {/* Due Date Picker - only when no date set */}
        {onUpdateDueDate && !task.completed && !task.due_date && (
          <div className="relative">
            <button
              ref={!task.due_date ? dateButtonRef : undefined}
              onClick={(e) => {
                e.stopPropagation()
                if (showDatePicker) {
                  closeDatePicker()
                } else {
                  openDatePicker()
                }
              }}
              className="p-2 rounded-lg transition-all hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
              title="Set due date"
            >
              <Calendar className="w-4 h-4" />
            </button>
            
            {showDatePicker && datePickerPos && (
              <>
                <div 
                  className="fixed inset-0 z-[9998]" 
                  onClick={(e) => {
                    e.stopPropagation()
                    closeDatePicker()
                  }}
                />
                <div 
                  className="fixed z-[9999] bg-white dark:bg-slate-800 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-700 p-3 min-w-[220px]"
                  style={{
                    top: datePickerPos.placeAbove ? 'auto' : datePickerPos.top,
                    bottom: datePickerPos.placeAbove ? `${window.innerHeight - datePickerPos.top + 8}px` : 'auto',
                    left: datePickerPos.left,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2 block">Set Due Date</label>
                  <input
                    type="date"
                    value={task.due_date ? task.due_date.slice(0, 10) : ''}
                    onChange={(e) => {
                      const dateValue = e.target.value 
                        ? new Date(e.target.value + 'T23:59:59').toISOString() 
                        : null
                      onUpdateDueDate(task.id, dateValue)
                      closeDatePicker()
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* Pin/Unpin Button */}
        {showPinButton && onPinToToday && !task.completed && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onPinToToday(task.id, !task.pinned_to_today)
            }}
            className={`p-2 rounded-lg transition-all ${
              task.pinned_to_today
                ? 'hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-600 dark:text-amber-400'
                : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400'
            }`}
            title={task.pinned_to_today ? 'Unpin from Today' : 'Pin to Today'}
          >
            {task.pinned_to_today ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
          </button>
        )}

        {/* Quick Win Button */}
        {showQuickWinButton && onUpdateTask && !task.completed && task.priority !== 'Quick Win' && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onUpdateTask(task.id, { priority: 'Quick Win' })
            }}
            className="p-2 rounded-lg transition-all hover:bg-amber-100 dark:hover:bg-amber-900/40 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400"
            title="Add to Quick Wins"
          >
            <Zap className="w-4 h-4" />
          </button>
        )}

        {/* Start Timer Button - only when no timer active */}
        {!task.completed && onStartTimer && onStopTimer && !hasAnyTimer && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onStartTimer()
            }}
            className="p-2 rounded-lg transition-all hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
            title="Start timer"
          >
            <Play className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
