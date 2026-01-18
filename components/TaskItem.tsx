'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { CheckCircle, Circle, Clock, Play, Pause, Square, Pin, PinOff, Calendar, AlertTriangle, Pencil, Trash2, X, Save, Zap, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Task, Category, Priority } from '@/lib/supabase/types'
import { CATEGORIES, PRIORITIES } from '@/lib/supabase/types'
import { CategoryBadge } from './CategoryBadge'

interface TaskItemProps {
  task: Task
  onToggle: (id: number) => void
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

const DURATION_OPTIONS = ['5 min', '10 min', '15 min', '30 min', '1 hour', '2 hours', 'Unknown']

// Calendar Picker Component
interface CalendarPickerProps {
  selectedDate: Date | null
  onSelectDate: (date: Date | null) => void
  onClose: () => void
  position: { top: number; left: number; placeAbove: boolean }
}

function CalendarPicker({ selectedDate, onSelectDate, onClose, position }: CalendarPickerProps) {
  const [viewDate, setViewDate] = useState(() => selectedDate || new Date())
  
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay()
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December']
  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const isToday = (day: number) => {
    const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day)
    return date.getTime() === today.getTime()
  }
  
  const isSelected = (day: number) => {
    if (!selectedDate) return false
    const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day)
    const selected = new Date(selectedDate)
    selected.setHours(0, 0, 0, 0)
    return date.getTime() === selected.getTime()
  }
  
  const isPast = (day: number) => {
    const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day)
    return date < today
  }
  
  const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))
  const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))
  
  const selectDay = (day: number) => {
    const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day)
    onSelectDate(date)
  }
  
  // Quick date options
  const quickDates = [
    { label: 'Today', date: new Date() },
    { label: 'Tomorrow', date: new Date(Date.now() + 86400000) },
    { label: 'Next Week', date: new Date(Date.now() + 7 * 86400000) },
  ]
  
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[9998]" 
        onClick={(e) => { e.stopPropagation(); onClose() }}
      />
      {/* Calendar Popup */}
      <div 
        className="fixed z-[9999] bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 w-[280px]"
        style={{
          top: position.placeAbove ? 'auto' : position.top,
          bottom: position.placeAbove ? `${window.innerHeight - position.top + 8}px` : 'auto',
          left: Math.max(8, Math.min(position.left - 100, window.innerWidth - 296)),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Month/Year Navigation */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
          </span>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        {/* Day Names */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {dayNames.map(day => (
            <div key={day} className="text-center text-[10px] font-medium text-slate-400 dark:text-slate-500 py-1">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before first day of month */}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="w-8 h-8" />
          ))}
          
          {/* Days of the month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const past = isPast(day)
            const selected = isSelected(day)
            const todayDay = isToday(day)
            
            return (
              <button
                key={day}
                onClick={() => selectDay(day)}
                disabled={past}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                  selected
                    ? 'bg-blue-500 text-white'
                    : todayDay
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 ring-1 ring-blue-300 dark:ring-blue-700'
                      : past
                        ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {day}
              </button>
            )
          })}
        </div>
        
        {/* Quick Date Options */}
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex gap-2">
          {quickDates.map(({ label, date }) => (
            <button
              key={label}
              onClick={() => onSelectDate(date)}
              className="flex-1 text-xs py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium"
            >
              {label}
            </button>
          ))}
        </div>
        
        {/* Clear Button */}
        {selectedDate && (
          <button
            onClick={() => onSelectDate(null)}
            className="mt-2 w-full text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 py-1.5 rounded-lg transition-colors font-medium"
          >
            Clear Due Date
          </button>
        )}
      </div>
    </>
  )
}

export function TaskItem({ 
  task, 
  onToggle, 
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
      }, 3000)
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

  // Calculate due date urgency
  const dueInfo = useMemo(() => {
    if (!task.due_date || task.completed) return null
    return formatTimeRemaining(task.due_date)
  }, [task.due_date, task.completed])

  const isUrgent = dueInfo?.isUrgent && !task.completed

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

      {/* Checkbox */}
      <div 
        onClick={() => onToggle(task.id)}
        className="mt-1 text-slate-400 dark:text-slate-500 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors"
      >
        {task.completed ? (
          <CheckCircle className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
        ) : (
          <Circle className={`w-5 h-5 ${isUrgent ? 'text-red-500' : ''}`} />
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0" onClick={() => onToggle(task.id)}>
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

      {/* Action Buttons */}
      <div className="flex items-center gap-1">
        {/* Edit Button */}
        {onUpdateTask && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsEditing(true)
            }}
            className="p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500"
            title="Edit task"
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}

        {/* Due Date Picker */}
        {onUpdateDueDate && !task.completed && (
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
              className={`p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${
                task.due_date 
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 opacity-100' 
                  : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500'
              }`}
              title="Set due date"
            >
              <Calendar className="w-4 h-4" />
            </button>
            
            {showDatePicker && datePickerPos && (
              <CalendarPicker
                selectedDate={task.due_date ? new Date(task.due_date) : null}
                onSelectDate={(date) => {
                  const dateValue = date 
                    ? new Date(date.setHours(23, 59, 59)).toISOString() 
                    : null
                  onUpdateDueDate(task.id, dateValue)
                  closeDatePicker()
                }}
                onClose={closeDatePicker}
                position={datePickerPos}
              />
            )}
          </div>
        )}

        {/* Pin to Today Button */}
        {showPinButton && onPinToToday && !task.completed && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onPinToToday(task.id, !task.pinned_to_today)
            }}
            className={`p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 ${
              task.pinned_to_today
                ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 opacity-100'
                : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500'
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
            className="p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-slate-400 dark:text-slate-500 hover:text-amber-600 dark:hover:text-amber-400"
            title="Add to Quick Wins"
          >
            <Zap className="w-4 h-4" />
          </button>
        )}

        {/* Timer Controls */}
        {!task.completed && onStartTimer && onStopTimer && (
          hasAnyTimer ? (
            // Timer is active (running or paused) - show time and controls
            <div 
              className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-3 pr-1 py-1"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Timer Display */}
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${isTimerActive ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`} />
                <span className="text-sm font-mono font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                  {formatDuration(elapsed)}
                </span>
              </div>
              
              {/* Pause/Resume Button */}
              {onPauseTimer && (
                isTimerActive ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      console.log('[Timer] Pause clicked for task:', task.id)
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
                      console.log('[Timer] Resume clicked for task:', task.id)
                      onStartTimer()
                    }}
                    className="p-1.5 rounded-md transition-all bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
                    title="Resume timer"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                )
              )}
              
              {/* Stop Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  console.log('[Timer] Stop clicked for task:', task.id)
                  onStopTimer()
                }}
                className="p-1.5 rounded-md transition-all bg-red-500 hover:bg-red-600 text-white shadow-sm"
                title="Stop & save time"
              >
                <Square className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            // No active timer - show Play button
            <button
              onClick={(e) => {
                e.stopPropagation()
                console.log('[Timer] Start clicked for task:', task.id)
                onStartTimer()
              }}
              className="p-2 rounded-lg transition-all border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
              title="Start timer"
            >
              <Play className="w-4 h-4" />
            </button>
          )
        )}
      </div>
    </div>
  )
}
