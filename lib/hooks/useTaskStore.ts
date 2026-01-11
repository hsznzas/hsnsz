'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client'
import type { Task, TimeLog, Category, Priority } from '@/lib/supabase/types'
import { INITIAL_TASKS } from '@/lib/supabase/types'

export interface ActiveTimer {
  taskId: number
  startTime: Date
  timeLogId?: string
}

export function useTaskStore() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([])
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([])
  const [loading, setLoading] = useState(true)
  const [isConfigured, setIsConfigured] = useState(false)
  const supabaseRef = useRef(getSupabase())

  // Initialize and setup real-time subscriptions
  useEffect(() => {
    const configured = isSupabaseConfigured()
    setIsConfigured(configured)
    supabaseRef.current = getSupabase()

    if (configured && supabaseRef.current) {
      loadFromSupabase()
      const cleanup = setupRealtimeSubscription()
      return cleanup
    } else {
      // Use local demo data
      setTasks(INITIAL_TASKS as Task[])
      setLoading(false)
    }
  }, [])

  const loadFromSupabase = async () => {
    const supabase = supabaseRef.current
    if (!supabase) return

    try {
      setLoading(true)
      
      // Load tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('id', { ascending: true })

      if (tasksError) {
        console.error('Failed to load tasks:', tasksError)
        setTasks(INITIAL_TASKS as Task[])
        setLoading(false)
        return
      }

      // Check if database is empty - if so, seed it
      if (!tasksData || tasksData.length === 0) {
        console.log('Database empty, seeding with initial tasks...')
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
        // Restore active timers (logs without end_at)
        const activeLogs = logs.filter(log => !log.end_at)
        setActiveTimers(
          activeLogs.map(log => ({
            taskId: log.task_id,
            startTime: new Date(log.start_at),
            timeLogId: log.id,
          }))
        )
      }
    } catch (error) {
      console.error('Failed to load from Supabase:', error)
      setTasks(INITIAL_TASKS as Task[])
    } finally {
      setLoading(false)
    }
  }

  const seedDatabase = async () => {
    const supabase = supabaseRef.current
    if (!supabase) return

    try {
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
        console.error('Failed to seed database:', error)
        setTasks(INITIAL_TASKS as Task[])
      } else if (data) {
        console.log('Database seeded successfully with', data.length, 'tasks')
        setTasks(data as Task[])
      }
    } catch (error) {
      console.error('Seeding error:', error)
      setTasks(INITIAL_TASKS as Task[])
    } finally {
      setLoading(false)
    }
  }

  const setupRealtimeSubscription = () => {
    const supabase = supabaseRef.current
    if (!supabase) return () => {}

    const tasksChannel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTasks(prev => {
              // Avoid duplicates
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
      .subscribe()

    const logsChannel = supabase
      .channel('time-logs-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'time_logs' },
        (payload) => {
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
    duration: string = 'Unknown'
  ) => {
    const newId = Date.now()
    const newTask: Task = {
      id: newId,
      text,
      category,
      priority,
      duration,
      completed: false,
    }

    // Optimistic update - add to UI immediately
    setTasks(prev => [newTask, ...prev])

    const supabase = supabaseRef.current
    if (isConfigured && supabase) {
      const { error } = await supabase.from('tasks').insert({
        id: newId,
        text,
        category,
        priority,
        duration,
        completed: false,
      })
      if (error) {
        console.error('Failed to add task:', error)
        // Rollback on error
        setTasks(prev => prev.filter(t => t.id !== newId))
      }
    }
  }, [isConfigured])

  const toggleTask = useCallback(async (taskId: number) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    const completed = !task.completed

    // Optimistic update - update UI immediately
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId ? { ...t, completed } : t
      )
    )

    const supabase = supabaseRef.current
    if (isConfigured && supabase) {
      const { error } = await supabase
        .from('tasks')
        .update({ completed })
        .eq('id', taskId)
      
      if (error) {
        console.error('Failed to toggle task:', error)
        // Rollback on error
        setTasks(prev =>
          prev.map(t =>
            t.id === taskId ? { ...t, completed: !completed } : t
          )
        )
      }
    }

    return completed
  }, [tasks, isConfigured])

  const deleteTask = useCallback(async (taskId: number) => {
    // Store for potential rollback
    const taskToDelete = tasks.find(t => t.id === taskId)
    
    // Optimistic update
    setTasks(prev => prev.filter(t => t.id !== taskId))

    const supabase = supabaseRef.current
    if (isConfigured && supabase) {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId)
      if (error) {
        console.error('Failed to delete task:', error)
        // Rollback on error
        if (taskToDelete) {
          setTasks(prev => [...prev, taskToDelete])
        }
      }
    }

    // Also stop any active timer for this task
    stopTimer(taskId)
  }, [isConfigured, tasks])

  // Timer operations with OPTIMISTIC UPDATES
  const startTimer = useCallback(async (taskId: number) => {
    // Check if timer already active for this task
    if (activeTimers.some(t => t.taskId === taskId)) return

    const startTime = new Date()
    const timeLogId = crypto.randomUUID()
    
    // Optimistic update
    const newLog: TimeLog = {
      id: timeLogId,
      task_id: taskId,
      start_at: startTime.toISOString(),
    }
    setTimeLogs(prev => [newLog, ...prev])
    setActiveTimers(prev => [...prev, { taskId, startTime, timeLogId }])

    const supabase = supabaseRef.current
    if (isConfigured && supabase) {
      const { data, error } = await supabase
        .from('time_logs')
        .insert({ task_id: taskId, start_at: startTime.toISOString() })
        .select()
        .single()
      
      if (error) {
        console.error('Failed to start timer:', error)
        // Rollback
        setTimeLogs(prev => prev.filter(l => l.id !== timeLogId))
        setActiveTimers(prev => prev.filter(t => t.taskId !== taskId))
      } else if (data) {
        // Update with actual ID from database
        setTimeLogs(prev => prev.map(l => 
          l.id === timeLogId ? { ...l, id: data.id } : l
        ))
        setActiveTimers(prev => prev.map(t => 
          t.taskId === taskId ? { ...t, timeLogId: data.id } : t
        ))
      }
    }
  }, [isConfigured, activeTimers])

  const stopTimer = useCallback(async (taskId: number) => {
    const timer = activeTimers.find(t => t.taskId === taskId)
    if (!timer) return

    const endTime = new Date()

    // Optimistic update
    setTimeLogs(prev =>
      prev.map(l =>
        l.id === timer.timeLogId
          ? { ...l, end_at: endTime.toISOString() }
          : l
      )
    )
    setActiveTimers(prev => prev.filter(t => t.taskId !== taskId))

    const supabase = supabaseRef.current
    if (isConfigured && supabase && timer.timeLogId) {
      const { error } = await supabase
        .from('time_logs')
        .update({ end_at: endTime.toISOString() })
        .eq('id', timer.timeLogId)
      
      if (error) {
        console.error('Failed to stop timer:', error)
        // Rollback
        setTimeLogs(prev =>
          prev.map(l =>
            l.id === timer.timeLogId
              ? { ...l, end_at: undefined }
              : l
          )
        )
        setActiveTimers(prev => [...prev, timer])
      }
    }
  }, [activeTimers, isConfigured])

  const isTimerActive = useCallback((taskId: number) => {
    return activeTimers.some(t => t.taskId === taskId)
  }, [activeTimers])

  const getActiveTimer = useCallback((taskId: number) => {
    return activeTimers.find(t => t.taskId === taskId)
  }, [activeTimers])

  // Computed values
  const completedCount = tasks.filter(t => t.completed).length
  const totalCount = tasks.length
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  // Grouped tasks
  const criticalTasks = tasks.filter(t => t.priority === 'Critical')
  const quickWins = tasks.filter(t => t.priority === 'Quick Win')
  const otherTasks = tasks.filter(t => t.priority !== 'Critical' && t.priority !== 'Quick Win')

  // Group other tasks by category
  const groupedByCategory = otherTasks.reduce((acc, task) => {
    if (!acc[task.category]) acc[task.category] = []
    acc[task.category].push(task)
    return acc
  }, {} as Record<string, Task[]>)

  return {
    tasks,
    timeLogs,
    activeTimers,
    loading,
    isConfigured,
    addTask,
    toggleTask,
    deleteTask,
    startTimer,
    stopTimer,
    isTimerActive,
    getActiveTimer,
    completedCount,
    totalCount,
    progress,
    criticalTasks,
    quickWins,
    groupedByCategory,
  }
}
