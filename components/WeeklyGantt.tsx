'use client'

import { useMemo } from 'react'
import type { Task, TimeLog } from '@/lib/supabase/types'
import { DEFAULT_CATEGORY_COLORS } from '@/lib/supabase/types'

interface WeeklyGanttProps {
  timeLogs: TimeLog[]
  tasks: Task[]
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

export function WeeklyGantt({ timeLogs, tasks }: WeeklyGanttProps) {
  // Get the last 7 days
  const days = useMemo(() => {
    const result = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      result.push(date)
    }
    return result
  }, [])

  // Group time logs by day and task
  const logsByDay = useMemo(() => {
    const grouped: Record<string, { log: TimeLog; task: Task | undefined; startHour: number; duration: number }[]> = {}
    
    days.forEach(day => {
      const dayKey = day.toISOString().split('T')[0]
      grouped[dayKey] = []
    })
    
    timeLogs.forEach(log => {
      if (!log.end_at) return // Skip active timers
      
      const startDate = new Date(log.start_at)
      const endDate = new Date(log.end_at)
      const dayKey = startDate.toISOString().split('T')[0]
      
      if (!grouped[dayKey]) return // Not in our 7-day window
      
      const task = tasks.find(t => t.id === log.task_id)
      const startHour = startDate.getHours() + startDate.getMinutes() / 60
      const durationSeconds = log.duration_seconds || Math.floor((endDate.getTime() - startDate.getTime()) / 1000)
      const durationHours = durationSeconds / 3600
      
      grouped[dayKey].push({
        log,
        task,
        startHour,
        duration: durationHours,
      })
    })
    
    return grouped
  }, [timeLogs, tasks, days])

  // Hours array (6 AM to 11 PM)
  const hours = Array.from({ length: 18 }, (_, i) => i + 6)

  // Category color mapping
  const getCategoryColor = (category: string | undefined): string => {
    if (!category) return 'bg-slate-300 dark:bg-slate-600'
    
    const colorMap: Record<string, string> = {
      'Sinjab': 'bg-purple-400 dark:bg-purple-500',
      'Ajdel': 'bg-blue-400 dark:bg-blue-500',
      'Personal': 'bg-green-400 dark:bg-green-500',
      'Haseeb': 'bg-orange-400 dark:bg-orange-500',
      'Raqeeb': 'bg-pink-400 dark:bg-pink-500',
      'Voice Input': 'bg-indigo-400 dark:bg-indigo-500',
    }
    return colorMap[category] || 'bg-slate-400 dark:bg-slate-500'
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h3 className="font-bold text-slate-800 dark:text-slate-200">Weekly Timeline</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Your work sessions over the past 7 days
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Hour labels */}
          <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <div className="w-20 flex-shrink-0" />
            {hours.map(hour => (
              <div 
                key={hour} 
                className="flex-1 text-center text-[10px] text-slate-400 dark:text-slate-500 py-1 border-l border-slate-100 dark:border-slate-800"
              >
                {hour}:00
              </div>
            ))}
          </div>
          
          {/* Days */}
          {days.map(day => {
            const dayKey = day.toISOString().split('T')[0]
            const dayLogs = logsByDay[dayKey] || []
            const isToday = dayKey === new Date().toISOString().split('T')[0]
            
            return (
              <div 
                key={dayKey} 
                className={`flex border-b border-slate-100 dark:border-slate-800 ${isToday ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}`}
              >
                {/* Day label */}
                <div className="w-20 flex-shrink-0 p-2 text-xs font-medium text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800">
                  <div className={isToday ? 'text-amber-600 dark:text-amber-400' : ''}>
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500">
                    {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
                
                {/* Timeline */}
                <div className="flex-1 relative h-12">
                  {/* Hour grid lines */}
                  {hours.map(hour => (
                    <div 
                      key={hour}
                      className="absolute top-0 bottom-0 border-l border-slate-100 dark:border-slate-800"
                      style={{ left: `${((hour - 6) / 18) * 100}%` }}
                    />
                  ))}
                  
                  {/* Work sessions */}
                  {dayLogs.map((item, idx) => {
                    // Calculate position and width (6 AM to midnight = 18 hours)
                    const startPercent = Math.max(0, ((item.startHour - 6) / 18) * 100)
                    const widthPercent = Math.min((item.duration / 18) * 100, 100 - startPercent)
                    
                    if (widthPercent <= 0 || item.startHour >= 24 || item.startHour < 6) return null
                    
                    return (
                      <div
                        key={idx}
                        className={`absolute top-1 bottom-1 rounded ${getCategoryColor(item.task?.category)} opacity-80 hover:opacity-100 transition-opacity cursor-pointer group`}
                        style={{
                          left: `${startPercent}%`,
                          width: `${Math.max(widthPercent, 1)}%`,
                          minWidth: '4px',
                        }}
                        title={`${item.task?.text || 'Unknown'}\n${formatTime(new Date(item.log.start_at))} - ${formatTime(new Date(item.log.end_at!))}\n${formatDuration(item.log.duration_seconds || 0)}`}
                      >
                        {/* Tooltip on hover */}
                        <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-10">
                          <div className="bg-slate-900 dark:bg-slate-700 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap">
                            <div className="font-medium">{item.task?.text?.slice(0, 30) || 'Unknown'}...</div>
                            <div className="text-slate-300">{formatDuration(item.log.duration_seconds || 0)}</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      
      {/* Legend */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <div className="flex flex-wrap gap-3 text-[10px]">
          {['Sinjab', 'Ajdel', 'Personal', 'Haseeb', 'Raqeeb'].map(cat => (
            <div key={cat} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded ${getCategoryColor(cat)}`} />
              <span className="text-slate-500 dark:text-slate-400">{cat}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
