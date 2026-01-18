'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Clock,
  Layers 
} from 'lucide-react'
import { clsx } from 'clsx'
import { 
  format, 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth,
  eachHourOfInterval,
  eachDayOfInterval,
  addDays,
  addWeeks,
  addMonths,
  isWithinInterval,
  differenceInMinutes,
} from 'date-fns'
import type { Task, TimeLog } from '@/lib/supabase/types'
import { DEFAULT_CATEGORY_COLORS } from '@/lib/supabase/types'

interface TimelineViewProps {
  tasks: Task[]
  timeLogs: TimeLog[]
}

type ViewMode = 'daily' | 'weekly' | 'monthly'

export function TimelineView({ tasks, timeLogs }: TimelineViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('daily')
  const [currentDate, setCurrentDate] = useState(new Date())

  const { startDate, endDate, intervals, formatLabel } = useMemo(() => {
    let start: Date
    let end: Date
    let intervals: Date[]
    let formatLabel: (date: Date) => string

    switch (viewMode) {
      case 'daily':
        start = startOfDay(currentDate)
        end = endOfDay(currentDate)
        intervals = eachHourOfInterval({ start, end })
        formatLabel = (d) => format(d, 'ha')
        break
      case 'weekly':
        start = startOfWeek(currentDate, { weekStartsOn: 0 })
        end = endOfWeek(currentDate, { weekStartsOn: 0 })
        intervals = eachDayOfInterval({ start, end })
        formatLabel = (d) => format(d, 'EEE d')
        break
      case 'monthly':
        start = startOfMonth(currentDate)
        end = endOfMonth(currentDate)
        intervals = eachDayOfInterval({ start, end })
        formatLabel = (d) => format(d, 'd')
        break
    }

    return { startDate: start, endDate: end, intervals, formatLabel }
  }, [viewMode, currentDate])

  const navigate = (direction: 'prev' | 'next') => {
    const modifier = direction === 'next' ? 1 : -1
    switch (viewMode) {
      case 'daily':
        setCurrentDate(prev => addDays(prev, modifier))
        break
      case 'weekly':
        setCurrentDate(prev => addWeeks(prev, modifier))
        break
      case 'monthly':
        setCurrentDate(prev => addMonths(prev, modifier))
        break
    }
  }

  // Filter logs that fall within the current view
  const visibleLogs = useMemo(() => {
    return timeLogs.filter(log => {
      const logStart = new Date(log.start_at)
      const logEnd = log.end_at ? new Date(log.end_at) : new Date()
      
      return isWithinInterval(logStart, { start: startDate, end: endDate }) ||
             isWithinInterval(logEnd, { start: startDate, end: endDate }) ||
             (logStart <= startDate && logEnd >= endDate)
    })
  }, [timeLogs, startDate, endDate])

  // Group logs by task
  const logsByTask = useMemo(() => {
    const grouped = new Map<number, TimeLog[]>()
    
    visibleLogs.forEach(log => {
      const existing = grouped.get(log.task_id) || []
      grouped.set(log.task_id, [...existing, log])
    })

    return grouped
  }, [visibleLogs])

  // Calculate position and width for a time log bar
  const getBarStyle = (log: TimeLog) => {
    const logStart = new Date(log.start_at)
    const logEnd = log.end_at ? new Date(log.end_at) : new Date()
    
    const totalMinutes = differenceInMinutes(endDate, startDate)
    const startMinutes = Math.max(0, differenceInMinutes(logStart, startDate))
    const endMinutes = Math.min(totalMinutes, differenceInMinutes(logEnd, startDate))
    
    const left = (startMinutes / totalMinutes) * 100
    const width = ((endMinutes - startMinutes) / totalMinutes) * 100

    return {
      left: `${Math.max(0, left)}%`,
      width: `${Math.max(1, width)}%`,
    }
  }

  const getTask = (taskId: number) => tasks.find(t => t.id === taskId)

  const totalTrackedTime = useMemo(() => {
    let totalMinutes = 0
    visibleLogs.forEach(log => {
      const start = new Date(log.start_at)
      const end = log.end_at ? new Date(log.end_at) : new Date()
      totalMinutes += differenceInMinutes(end, start)
    })
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60,
    }
  }, [visibleLogs])

  const formatTimeRange = () => {
    switch (viewMode) {
      case 'daily':
        return format(currentDate, 'EEEE, MMMM d, yyyy')
      case 'weekly':
        return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`
      case 'monthly':
        return format(currentDate, 'MMMM yyyy')
    }
  }

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* View mode selector */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            {(['daily', 'weekly', 'monthly'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={clsx(
                  'px-4 py-2 text-sm font-medium transition-colors capitalize',
                  viewMode === mode
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Total time badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-slate-700">
              {totalTrackedTime.hours}h {totalTrackedTime.minutes}m tracked
            </span>
          </div>

          {/* Today button */}
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            Today
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('prev')}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600" />
          <span className="text-lg font-semibold text-slate-800">
            {formatTimeRange()}
          </span>
        </div>

        <button
          onClick={() => navigate('next')}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Timeline Grid */}
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-sm">
        {/* Time axis header */}
        <div className="flex border-b border-slate-200">
          <div className="w-48 flex-shrink-0 p-3 border-r border-slate-200 bg-slate-50">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Tasks ({logsByTask.size})
            </span>
          </div>
          <div className="flex-1 flex">
            {intervals.map((interval, i) => (
              <div
                key={i}
                className={clsx(
                  'flex-1 p-2 text-center text-xs text-slate-500',
                  'border-r border-slate-100 last:border-r-0',
                  viewMode === 'daily' && i % 2 === 0 && 'bg-slate-50/50'
                )}
              >
                {formatLabel(interval)}
              </div>
            ))}
          </div>
        </div>

        {/* Task rows */}
        {logsByTask.size === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">No tracked time</p>
            <p className="text-sm mt-1">
              Start a timer on a task to see it appear here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {Array.from(logsByTask.entries()).map(([taskId, logs]) => {
              const task = getTask(taskId)
              if (!task) return null

              const categoryColor = DEFAULT_CATEGORY_COLORS[task.category] || 'bg-gray-100 text-gray-800'

              return (
                <div key={taskId} className="flex min-h-[60px]">
                  {/* Task label */}
                  <div className="w-48 flex-shrink-0 p-3 border-r border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColor}`}>
                        {task.category}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-slate-700 truncate block mt-1">
                      {task.text}
                    </span>
                  </div>

                  {/* Timeline bars */}
                  <div className="flex-1 relative">
                    {/* Grid lines */}
                    <div className="absolute inset-0 flex">
                      {intervals.map((_, i) => (
                        <div
                          key={i}
                          className="flex-1 border-r border-slate-100/50 last:border-r-0"
                        />
                      ))}
                    </div>

                    {/* Time bars */}
                    <div className="absolute inset-0 py-2 px-1">
                      {logs.map((log, i) => {
                        const style = getBarStyle(log)
                        const isOngoing = !log.end_at
                        
                        return (
                          <motion.div
                            key={log.id}
                            initial={{ opacity: 0, scaleX: 0 }}
                            animate={{ opacity: 1, scaleX: 1 }}
                            className={clsx(
                              'absolute h-8 rounded-md',
                              'flex items-center justify-center',
                              isOngoing
                                ? 'bg-emerald-400 border-2 border-emerald-500 animate-pulse'
                                : 'bg-emerald-200 border border-emerald-300'
                            )}
                            style={{
                              left: style.left,
                              width: style.width,
                              top: `calc(50% - 16px + ${i * 2}px)`,
                              originX: 0,
                            }}
                            title={`${format(new Date(log.start_at), 'h:mm a')} - ${
                              log.end_at ? format(new Date(log.end_at), 'h:mm a') : 'ongoing'
                            }`}
                          >
                            {/* Duration label if bar is wide enough */}
                            {parseFloat(style.width) > 10 && (
                              <span className="text-xs font-medium text-emerald-800 px-1 truncate">
                                {(() => {
                                  const start = new Date(log.start_at)
                                  const end = log.end_at ? new Date(log.end_at) : new Date()
                                  const mins = differenceInMinutes(end, start)
                                  if (mins < 60) return `${mins}m`
                                  return `${Math.floor(mins / 60)}h ${mins % 60}m`
                                })()}
                              </span>
                            )}
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 rounded bg-emerald-200 border border-emerald-300" />
          <span>Completed session</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 rounded bg-emerald-400 border-2 border-emerald-500 animate-pulse" />
          <span>Active session</span>
        </div>
      </div>
    </div>
  )
}
