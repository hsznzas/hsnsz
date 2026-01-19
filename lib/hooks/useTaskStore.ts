'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client'
import type { Task, TimeLog, Category, Priority } from '@/lib/supabase/types'
import { INITIAL_TASKS, PROJECT_CATEGORIES } from '@/lib/supabase/types'

export interface ActiveTimer {
  taskId: number
  startTime: Date
  timeLogId?: string
  isPaused: boolean
  accumulatedSeconds: number  // Time accumulated before pause
}

const sortWaitingLast = (items: Task[]) => {
  if (items.length === 0) return items
  const waiting: Task[] = []
  const normal: Task[] = []
  items.forEach(task => {
    if (task.waiting_for_reply) {
      waiting.push(task)
    } else {
      normal.push(task)
    }
  })
  return [...normal, ...waiting]
}

export function useTaskStore() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([])
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([])
  const [loading, setLoading] = useState(true)
  const [isConfigured, setIsConfigured] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const supabaseRef = useRef(getSupabase())

  // Initialize and setup real-time subscriptions
  useEffect(() => {
    const configured = isSupabaseConfigured()
    setIsConfigured(configured)
    supabaseRef.current = getSupabase()

    console.log('[TaskStore] Supabase configured:', configured)

    if (configured && supabaseRef.current) {
      loadFromSupabase()
      const cleanup = setupRealtimeSubscription()
      return cleanup
    } else {
      console.log('[TaskStore] Using local demo data (Supabase not configured)')
      setTasks(INITIAL_TASKS as Task[])
      setLoading(false)
    }
  }, [])

  const loadFromSupabase = async () => {
    const supabase = supabaseRef.current
    if (!supabase) return

    try {
      setLoading(true)
      setSyncError(null)
      console.log('[TaskStore] Loading tasks from Supabase...')
      
      // Load tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('id', { ascending: true })

      if (tasksError) {
        console.error('[TaskStore] Failed to load tasks:', tasksError)
        setSyncError(`Load error: ${tasksError.message}`)
        setTasks(INITIAL_TASKS as Task[])
        setLoading(false)
        return
      }

      console.log('[TaskStore] Loaded tasks:', tasksData?.length || 0)

      // Check if database is empty - if so, seed it
      if (!tasksData || tasksData.length === 0) {
        console.log('[TaskStore] Database empty, seeding with initial tasks...')
        await seedDatabase()
        return
      }

      setTasks(tasksData as Task[])

      // Load time logs
      const { data: logsData } = await supabase
        .from('time_logs')
        .select('*')
        .order('start_at', { ascending: false })

      if (logsData) {
        const logs = logsData as TimeLog[]
        setTimeLogs(logs)
        const activeLogs = logs.filter(log => !log.end_at)
        setActiveTimers(
          activeLogs.map(log => ({
            taskId: log.task_id,
            startTime: new Date(log.start_at),
            timeLogId: log.id,
            isPaused: false,
            accumulatedSeconds: 0,
          }))
        )
      }
    } catch (error) {
      console.error('[TaskStore] Failed to load from Supabase:', error)
      setSyncError(`Exception: ${error}`)
      setTasks(INITIAL_TASKS as Task[])
    } finally {
      setLoading(false)
    }
  }

  const seedDatabase = async () => {
    const supabase = supabaseRef.current
    if (!supabase) return

    try {
      console.log('[TaskStore] Seeding database with', INITIAL_TASKS.length, 'tasks')
      
      const tasksToInsert = INITIAL_TASKS.map(task => ({
        id: task.id,
        text: task.text,
        category: task.category,
        priority: task.priority,
        duration: task.duration,
        completed: task.completed,
      }))

      const { data, error } = await supabase
        .from('tasks')
        .insert(tasksToInsert)
        .select()

      if (error) {
        console.error('[TaskStore] Failed to seed database:', error)
        setSyncError(`Seed error: ${error.message}`)
        setTasks(INITIAL_TASKS as Task[])
      } else if (data) {
        console.log('[TaskStore] Database seeded successfully with', data.length, 'tasks')
        setTasks(data as Task[])
      }
    } catch (error) {
      console.error('[TaskStore] Seeding error:', error)
      setTasks(INITIAL_TASKS as Task[])
    } finally {
      setLoading(false)
    }
  }

  const setupRealtimeSubscription = () => {
    const supabase = supabaseRef.current
    if (!supabase) return () => {}

    console.log('[TaskStore] Setting up realtime subscriptions...')

    const tasksChannel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          console.log('[TaskStore] Realtime task event:', payload.eventType, payload.new)
          if (payload.eventType === 'INSERT') {
            setTasks(prev => {
              if (prev.some(t => t.id === (payload.new as Task).id)) return prev
              return [...prev, payload.new as Task]
            })
          } else if (payload.eventType === 'UPDATE') {
            setTasks(prev => 
              prev.map(t => t.id === payload.new.id ? payload.new as Task : t)
            )
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(t => t.id !== payload.old.id))
          }
        }
      )
      .subscribe((status) => {
        console.log('[TaskStore] Tasks channel status:', status)
      })

    const logsChannel = supabase
      .channel('time-logs-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'time_logs' },
        (payload) => {
          console.log('[TaskStore] Realtime time_log event:', payload.eventType)
          if (payload.eventType === 'INSERT') {
            setTimeLogs(prev => {
              if (prev.some(l => l.id === (payload.new as TimeLog).id)) return prev
              return [payload.new as TimeLog, ...prev]
            })
          } else if (payload.eventType === 'UPDATE') {
            setTimeLogs(prev =>
              prev.map(l => l.id === payload.new.id ? payload.new as TimeLog : l)
            )
          } else if (payload.eventType === 'DELETE') {
            setTimeLogs(prev => prev.filter(l => l.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(tasksChannel)
      supabase.removeChannel(logsChannel)
    }
  }

  // Task operations with OPTIMISTIC UPDATES
  const addTask = useCallback(async (
    text: string,
    category: Category = 'Voice Input',
    priority: Priority = 'Quick Win',
    duration: string = 'Unknown',
    dueDate?: string | null,
    isStreak?: boolean
  ) => {
    const newId = Date.now()
    const newTask: Task = {
      id: newId,
      text,
      category,
      priority,
      duration,
      completed: false,
      waiting_for_reply: false,
      due_date: dueDate || null,
      is_streak: isStreak || false,
      pinned_to_today: false,
      created_at: new Date().toISOString(),
    }

    // Optimistic update
    setTasks(prev => [newTask, ...prev])
    setSyncError(null)

    const supabase = supabaseRef.current
    if (isConfigured && supabase) {
      console.log('[TaskStore] Adding task to Supabase:', newTask.text)
      
      // Build insert object with only basic columns first
      // The new columns (due_date, is_streak, pinned_to_today, completed_at) may not exist yet
      const insertData: Record<string, unknown> = {
        id: newId,
        text,
        category,
        priority,
        duration,
        completed: false,
      }

      const { error } = await supabase.from('tasks').insert(insertData)
      
      if (error) {
        console.error('[TaskStore] Failed to add task:', error)
        setSyncError(`Add failed: ${error.message}`)
        // Rollback
        setTasks(prev => prev.filter(t => t.id !== newId))
      } else {
        console.log('[TaskStore] Task added successfully')
      }
    }
  }, [isConfigured])

  // Toggle task with TIMER FIX - stops timer immediately on completion
  const toggleTask = useCallback(async (taskId: number) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    const completed = !task.completed
    const completedAt = completed ? new Date().toISOString() : null
    console.log('[TaskStore] Toggling task', taskId, 'to completed:', completed)

    // 🐞 TIMER BUG FIX: Stop any active timer immediately when completing
    if (completed && activeTimers.some(t => t.taskId === taskId)) {
      await stopTimer(taskId)
    }

    // Optimistic update
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId
          ? { ...t, completed, completed_at: completedAt, waiting_for_reply: completed ? false : t.waiting_for_reply }
          : t
      )
    )
    setSyncError(null)

    const supabase = supabaseRef.current
    if (isConfigured && supabase) {
      console.log('[TaskStore] Updating task in Supabase...')
      // Only update 'completed' - completed_at may not exist in the schema
      const { data, error } = await supabase
        .from('tasks')
        .update({ completed })
        .eq('id', taskId)
        .select()
      
      if (error) {
        console.error('[TaskStore] Failed to toggle task:', error)
        setSyncError(`Toggle failed: ${error.message}`)
        // Rollback
        setTasks(prev =>
          prev.map(t =>
            t.id === taskId
              ? { ...t, completed: !completed, completed_at: task.completed_at, waiting_for_reply: task.waiting_for_reply }
              : t
          )
        )
        return !completed // Return old state
      } else {
        console.log('[TaskStore] Task updated successfully:', data)
      }
    }

    return completed
  }, [tasks, isConfigured, activeTimers])

  const toggleWaitingForReply = useCallback(async (taskId: number) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task || task.completed) return

    const nextWaiting = !task.waiting_for_reply
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId ? { ...t, waiting_for_reply: nextWaiting } : t
      )
    )
    setSyncError(null)

    const supabase = supabaseRef.current
    if (isConfigured && supabase) {
      const { error } = await supabase
        .from('tasks')
        .update({ waiting_for_reply: nextWaiting })
        .eq('id', taskId)

      if (error) {
        if (error.message?.includes('waiting_for_reply')) {
          console.warn('[TaskStore] waiting_for_reply column not found, keeping local state')
          return
        }
        console.error('[TaskStore] Failed to update waiting status:', error)
        setSyncError(`Waiting update failed: ${error.message}`)
        setTasks(prev =>
          prev.map(t =>
            t.id === taskId ? { ...t, waiting_for_reply: task.waiting_for_reply } : t
          )
        )
      }
    }
  }, [tasks, isConfigured])

  // Pin task to Today
  const pinToToday = useCallback(async (taskId: number, pinned: boolean) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    // Optimistic update
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId ? { ...t, pinned_to_today: pinned } : t
      )
    )
    setSyncError(null)

    const supabase = supabaseRef.current
    if (isConfigured && supabase) {
      const { error } = await supabase
        .from('tasks')
        .update({ pinned_to_today: pinned })
        .eq('id', taskId)
      
      if (error) {
        console.error('[TaskStore] Failed to pin task:', error)
        setSyncError(`Pin failed: ${error.message}`)
        // Rollback
        setTasks(prev =>
          prev.map(t =>
            t.id === taskId ? { ...t, pinned_to_today: task.pinned_to_today } : t
          )
        )
      }
    }
  }, [tasks, isConfigured])

  // Update due date
  const updateDueDate = useCallback(async (taskId: number, dueDate: string | null) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    // Optimistic update
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId ? { ...t, due_date: dueDate } : t
      )
    )

    const supabase = supabaseRef.current
    if (isConfigured && supabase) {
      const { error } = await supabase
        .from('tasks')
        .update({ due_date: dueDate })
        .eq('id', taskId)
      
      if (error) {
        console.error('[TaskStore] Failed to update due date:', error)
        // Rollback
        setTasks(prev =>
          prev.map(t =>
            t.id === taskId ? { ...t, due_date: task.due_date } : t
          )
        )
      }
    }
  }, [tasks, isConfigured])

  // Update task (edit text, category, priority, duration, streak_target)
  const updateTask = useCallback(async (taskId: number, updates: Partial<Pick<Task, 'text' | 'category' | 'priority' | 'duration' | 'streak_target'>>) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    // Optimistic update
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId ? { ...t, ...updates } : t
      )
    )
    setSyncError(null)

    const supabase = supabaseRef.current
    if (isConfigured && supabase) {
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
      
      if (error) {
        console.error('[TaskStore] Failed to update task:', error)
        setSyncError(`Update failed: ${error.message}`)
        // Rollback
        setTasks(prev =>
          prev.map(t =>
            t.id === taskId ? task : t
          )
        )
      }
    }
  }, [tasks, isConfigured])

  const deleteTask = useCallback(async (taskId: number) => {
    const taskToDelete = tasks.find(t => t.id === taskId)
    
    // Stop timer first if running
    if (activeTimers.some(t => t.taskId === taskId)) {
      await stopTimer(taskId)
    }

    // Optimistic update
    setTasks(prev => prev.filter(t => t.id !== taskId))
    setSyncError(null)

    const supabase = supabaseRef.current
    if (isConfigured && supabase) {
      console.log('[TaskStore] Deleting task from Supabase:', taskId)
      const { error } = await supabase.from('tasks').delete().eq('id', taskId)
      if (error) {
        console.error('[TaskStore] Failed to delete task:', error)
        setSyncError(`Delete failed: ${error.message}`)
        if (taskToDelete) {
          setTasks(prev => [...prev, taskToDelete])
        }
      }
    }
  }, [isConfigured, tasks, activeTimers])

  // Timer operations
  const startTimer = useCallback(async (taskId: number) => {
    console.log('[TaskStore] startTimer called for taskId:', taskId)
    
    // Check if timer exists and is paused - if so, resume it
    const existingTimer = activeTimers.find(t => t.taskId === taskId)
    if (existingTimer) {
      if (existingTimer.isPaused) {
        console.log('[TaskStore] Resuming paused timer for taskId:', taskId)
        setActiveTimers(prev => prev.map(t => 
          t.taskId === taskId 
            ? { ...t, isPaused: false, startTime: new Date() }
            : t
        ))
        return
      }
      console.log('[TaskStore] Timer already running for taskId:', taskId)
      return
    }

    const startTime = new Date()
    const timeLogId = crypto.randomUUID()
    console.log('[TaskStore] Starting new timer with ID:', timeLogId)
    
    const newLog: TimeLog = {
      id: timeLogId,
      task_id: taskId,
      start_at: startTime.toISOString(),
    }
    setTimeLogs(prev => [newLog, ...prev])
    setActiveTimers(prev => [...prev, { 
      taskId, 
      startTime, 
      timeLogId,
      isPaused: false,
      accumulatedSeconds: 0
    }])

    const supabase = supabaseRef.current
    if (isConfigured && supabase) {
      const { data, error } = await supabase
        .from('time_logs')
        .insert({ task_id: taskId, start_at: startTime.toISOString() })
        .select()
        .single()
      
      if (error) {
        console.error('[TaskStore] Failed to start timer:', error)
        setTimeLogs(prev => prev.filter(l => l.id !== timeLogId))
        setActiveTimers(prev => prev.filter(t => t.taskId !== taskId))
      } else if (data) {
        setTimeLogs(prev => prev.map(l => 
          l.id === timeLogId ? { ...l, id: data.id } : l
        ))
        setActiveTimers(prev => prev.map(t => 
          t.taskId === taskId ? { ...t, timeLogId: data.id } : t
        ))
      }
    }
  }, [isConfigured, activeTimers])
  
  // Pause timer - saves accumulated time in memory
  const pauseTimer = useCallback((taskId: number) => {
    console.log('[TaskStore] pauseTimer called for taskId:', taskId)
    
    const timer = activeTimers.find(t => t.taskId === taskId)
    if (!timer || timer.isPaused) {
      console.log('[TaskStore] No active timer to pause for taskId:', taskId)
      return
    }
    
    const now = new Date()
    const sessionSeconds = Math.floor((now.getTime() - timer.startTime.getTime()) / 1000)
    const newAccumulated = timer.accumulatedSeconds + sessionSeconds
    
    console.log('[TaskStore] Pausing timer, accumulated:', newAccumulated, 'seconds')
    
    setActiveTimers(prev => prev.map(t => 
      t.taskId === taskId 
        ? { ...t, isPaused: true, accumulatedSeconds: newAccumulated }
        : t
    ))
  }, [activeTimers])

  const stopTimer = useCallback(async (taskId: number) => {
    console.log('[TaskStore] stopTimer called for taskId:', taskId)
    console.log('[TaskStore] Current activeTimers:', activeTimers)
    
    const timer = activeTimers.find(t => t.taskId === taskId)
    if (!timer) {
      console.log('[TaskStore] No active timer found for taskId:', taskId)
      return
    }

    console.log('[TaskStore] Found timer:', timer)
    const endTime = new Date()
    
    // Calculate total duration: accumulated time + current session (if not paused)
    let totalSeconds = timer.accumulatedSeconds
    if (!timer.isPaused) {
      totalSeconds += Math.floor((endTime.getTime() - timer.startTime.getTime()) / 1000)
    }
    console.log('[TaskStore] Total duration:', totalSeconds, 'seconds')

    setTimeLogs(prev =>
      prev.map(l =>
        l.id === timer.timeLogId ? { ...l, end_at: endTime.toISOString(), duration_seconds: totalSeconds } : l
      )
    )
    setActiveTimers(prev => {
      const newTimers = prev.filter(t => t.taskId !== taskId)
      console.log('[TaskStore] New activeTimers after stop:', newTimers)
      return newTimers
    })

    const supabase = supabaseRef.current
    if (isConfigured && supabase && timer.timeLogId) {
      // Try to update with duration_seconds first
      const { error } = await supabase
        .from('time_logs')
        .update({ end_at: endTime.toISOString(), duration_seconds: totalSeconds })
        .eq('id', timer.timeLogId)
      
      if (error) {
        // If duration_seconds column doesn't exist, try without it
        if (error.message?.includes('duration_seconds')) {
          console.warn('[TaskStore] duration_seconds column not found, updating without it')
          const { error: fallbackError } = await supabase
            .from('time_logs')
            .update({ end_at: endTime.toISOString() })
            .eq('id', timer.timeLogId)
          
          if (fallbackError) {
            console.error('[TaskStore] Failed to stop timer (fallback):', fallbackError)
          }
        } else {
          console.error('[TaskStore] Failed to stop timer:', error)
          setTimeLogs(prev =>
            prev.map(l =>
              l.id === timer.timeLogId ? { ...l, end_at: undefined, duration_seconds: undefined } : l
            )
          )
          setActiveTimers(prev => [...prev, timer])
        }
      }
    }
  }, [activeTimers, isConfigured])

  const isTimerActive = useCallback((taskId: number) => {
    const timer = activeTimers.find(t => t.taskId === taskId)
    return timer ? !timer.isPaused : false
  }, [activeTimers])
  
  const isTimerPaused = useCallback((taskId: number) => {
    const timer = activeTimers.find(t => t.taskId === taskId)
    return timer?.isPaused ?? false
  }, [activeTimers])
  
  const hasTimer = useCallback((taskId: number) => {
    return activeTimers.some(t => t.taskId === taskId)
  }, [activeTimers])

  const getActiveTimer = useCallback((taskId: number) => {
    return activeTimers.find(t => t.taskId === taskId)
  }, [activeTimers])

  // Computed values
  const completedCount = tasks.filter(t => t.completed && !t.is_streak).length
  const totalCount = tasks.filter(t => !t.is_streak).length
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  // Helper to check if task is a streak task
  const isStreakTask = (t: Task) => t.is_streak || t.category === 'Streaks'

  // Today's tasks (pinned or Critical priority)
  const todayTasks = useMemo(() => 
    sortWaitingLast(tasks.filter(t => t.pinned_to_today && !t.completed && !isStreakTask(t)))
  , [tasks])

  // Critical tasks (Must Do Now)
  const criticalTasks = useMemo(() => 
    sortWaitingLast(tasks.filter(t => t.priority === 'Critical' && !t.completed && !isStreakTask(t)))
  , [tasks])

  // Quick wins
  const quickWins = useMemo(() => 
    sortWaitingLast(tasks.filter(t => t.priority === 'Quick Win' && !t.completed && !isStreakTask(t)))
  , [tasks])

  // Streak tasks - include both is_streak flag AND category === 'Streaks'
  const streakTasks = useMemo(() => 
    tasks.filter(t => isStreakTask(t))
  , [tasks])

  // Archive - ALL completed tasks (history)
  const archivedTasks = useMemo(() => {
    return tasks.filter(t => t.completed && !isStreakTask(t))
  }, [tasks])

  // Active (non-archived) tasks
  const activeTasks = useMemo(() => {
    const now = new Date()
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    return tasks.filter(t => {
      if (!t.completed) return true
      if (!t.completed_at) return true
      const completedDate = new Date(t.completed_at)
      return completedDate >= twentyFourHoursAgo
    })
  }, [tasks])

  // Group by category (excluding special categories and archived)
  const groupedByCategory = useMemo(() => {
    const filtered = activeTasks.filter(t => 
      t.priority !== 'Critical' && 
      t.priority !== 'Quick Win' && 
      !t.pinned_to_today &&
      !isStreakTask(t) &&
      PROJECT_CATEGORIES.includes(t.category)
    )
    const grouped = filtered.reduce((acc, task) => {
      if (!acc[task.category]) acc[task.category] = []
      acc[task.category].push(task)
      return acc
    }, {} as Record<string, Task[]>)
    Object.keys(grouped).forEach(category => {
      grouped[category] = sortWaitingLast(grouped[category])
    })
    return grouped
  }, [activeTasks])

  // Group archived by category
  const archivedByCategory = useMemo(() => {
    return archivedTasks.reduce((acc, task) => {
      if (!acc[task.category]) acc[task.category] = []
      acc[task.category].push(task)
      return acc
    }, {} as Record<string, Task[]>)
  }, [archivedTasks])

  // Tasks with upcoming due dates
  const urgentTasks = useMemo(() => {
    const now = new Date()
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    return tasks.filter(t => {
      if (!t.due_date || t.completed) return false
      const dueDate = new Date(t.due_date)
      return dueDate <= twentyFourHoursFromNow && dueDate >= now
    })
  }, [tasks])

  return {
    tasks,
    activeTasks,
    timeLogs,
    activeTimers,
    loading,
    isConfigured,
    syncError,
    addTask,
    toggleTask,
    toggleWaitingForReply,
    updateTask,
    deleteTask,
    pinToToday,
    updateDueDate,
    startTimer,
    stopTimer,
    pauseTimer,
    isTimerActive,
    isTimerPaused,
    hasTimer,
    getActiveTimer,
    completedCount,
    totalCount,
    progress,
    todayTasks,
    criticalTasks,
    quickWins,
    streakTasks,
    archivedTasks,
    archivedByCategory,
    groupedByCategory,
    urgentTasks,
  }
}
