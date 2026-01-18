'use client'

import { useCallback, useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { 
  AlertCircle, 
  Zap, 
  RefreshCw, 
  AlertTriangle, 
  Sun, 
  Moon, 
  CalendarCheck, 
  Archive, 
  Flame,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Home
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { useTaskStore } from '@/lib/hooks/useTaskStore'
import { useTheme } from '@/lib/hooks/useTheme'
import { ProgressBar } from '@/components/ProgressBar'
import { TaskItem } from '@/components/TaskItem'
import { AITaskInput } from '@/components/AITaskInput'
import { InlineCategoryInput } from '@/components/InlineCategoryInput'
import { WeeklyGantt } from '@/components/WeeklyGantt'
import { StreakCard } from '@/components/StreakCard'
import { ListHeader } from '@/components/ListHeader'
import { triggerCompletionConfetti, triggerQuickWinConfetti } from '@/lib/utils/confetti'
import type { Category, Priority, Task } from '@/lib/supabase/types'
import { PROJECT_CATEGORIES } from '@/lib/supabase/types'

type ViewTab = 'tasks' | 'archive' | 'timeline'

// Sortable wrapper for project list items
interface SortableListItemProps {
  id: string
  children: (props: { 
    dragHandleProps: { attributes: React.HTMLAttributes<HTMLElement>; listeners: React.DOMAttributes<HTMLElement> | undefined }
    isDragging: boolean 
  }) => React.ReactNode
}

function SortableListItem({ id, children }: SortableListItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  }

  return (
    <div ref={setNodeRef} style={style}>
      {children({ 
        dragHandleProps: { attributes, listeners },
        isDragging 
      })}
    </div>
  )
}

export default function ProductivityDashboard() {
  const {
    tasks,
    activeTasks,
    timeLogs,
    loading,
    isConfigured,
    syncError,
    addTask,
    toggleTask,
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
  } = useTaskStore()

  const { theme, toggleTheme, mounted } = useTheme()
  const [activeTab, setActiveTab] = useState<ViewTab>('tasks')
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})
  const [expandedProjectLists, setExpandedProjectLists] = useState<Record<string, boolean>>(() => {
    // Default all lists to expanded
    return { Sinjab: true, Ajdel: true, Personal: true, Haseeb: true, Raqeeb: true }
  })
  const [newTaskIds, setNewTaskIds] = useState<Set<number>>(new Set())
  const prevTaskCountRef = useRef(tasks.length)
  
  // List order state - initialized from localStorage
  const [listOrder, setListOrder] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('project-list-order')
      if (stored) {
        try {
          return JSON.parse(stored)
        } catch {
          return PROJECT_CATEGORIES
        }
      }
    }
    return PROJECT_CATEGORIES
  })
  
  // DnD sensors for keyboard and pointer
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )
  
  // Handle drag end - reorder lists
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    
    if (over && active.id !== over.id) {
      setListOrder((items) => {
        const oldIndex = items.indexOf(active.id as string)
        const newIndex = items.indexOf(over.id as string)
        const newOrder = arrayMove(items, oldIndex, newIndex)
        
        // Save to localStorage
        localStorage.setItem('project-list-order', JSON.stringify(newOrder))
        
        return newOrder
      })
    }
  }, [])

  // Track newly added tasks for shimmer effect
  useEffect(() => {
    if (tasks.length > prevTaskCountRef.current) {
      // Find new task IDs
      const existingIds = new Set(tasks.slice(tasks.length - prevTaskCountRef.current).map(t => t.id))
      const newestTask = tasks[0] // Tasks are added to the beginning
      if (newestTask && !existingIds.has(newestTask.id)) {
        setNewTaskIds(prev => new Set([...Array.from(prev), newestTask.id]))
        // Remove shimmer after 3 seconds
        setTimeout(() => {
          setNewTaskIds(prev => {
            const next = new Set(prev)
            next.delete(newestTask.id)
            return next
          })
        }, 3000)
      }
    }
    prevTaskCountRef.current = tasks.length
  }, [tasks])

  // Handle task toggle with confetti
  const handleToggle = useCallback(async (id: number) => {
    const task = tasks.find(t => t.id === id)
    const completed = await toggleTask(id)
    
    if (completed) {
      if (task?.priority === 'Quick Win') {
        triggerQuickWinConfetti()
      } else {
        triggerCompletionConfetti()
      }
    }
  }, [tasks, toggleTask])

  // Handle adding multiple tasks from AI
  const handleAddMultipleTasks = useCallback((newTasks: { text: string; category: Category; priority: Priority; duration: string }[]) => {
    newTasks.forEach(task => {
      addTask(task.text, task.category, task.priority, task.duration)
    })
  }, [addTask])

  // Toggle category expansion in archive
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  // Toggle project list expansion
  const toggleProjectList = (category: string) => {
    setExpandedProjectLists(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span className="text-lg">Loading tasks...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4 md:p-8 font-sans text-slate-800 dark:text-slate-200 relative pb-[200px]">
      <div className="max-w-6xl mx-auto">
        
        {/* Sync Error Banner */}
        {syncError && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-300">Sync Error</p>
              <p className="text-xs text-red-600 dark:text-red-400">{syncError}</p>
            </div>
          </div>
        )}

        {/* Header Section */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">The Super To Do List</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">ADHD-Optimized Hyper-Focus</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Home Button */}
              <Link
                href="/"
                className="p-2 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                aria-label="Go to home page"
              >
                <Home className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </Link>
              
              {/* Dark Mode Toggle */}
              {mounted && (
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                  aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {theme === 'dark' ? (
                    <Sun className="w-5 h-5 text-amber-500" />
                  ) : (
                    <Moon className="w-5 h-5 text-slate-600" />
                  )}
                </button>
              )}
              
              {isConfigured ? (
                <span className="text-xs px-2 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 rounded-full font-medium">
                  ✓ Synced
                </span>
              ) : (
                <span className="text-xs px-2 py-1 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 rounded-full font-medium">
                  ⚠ Local Only
                </span>
              )}
            </div>
          </div>
          
          <ProgressBar 
            completed={completedCount}
            total={totalCount}
            progress={progress}
          />

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 mt-6">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'tasks'
                  ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              <CalendarCheck className="w-4 h-4" />
              Tasks
            </button>
            <button
              onClick={() => setActiveTab('archive')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'archive'
                  ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              <Archive className="w-4 h-4" />
              Archive ({archivedTasks.length})
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'timeline'
                  ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Timeline
            </button>
          </div>
        </header>

        {/* TASKS VIEW */}
        {activeTab === 'tasks' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* LEFT COLUMN: HYPER-FOCUS */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Today's Tasks */}
              {todayTasks.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl shadow-md border-l-4 border-amber-500 overflow-hidden">
                  <div className="bg-amber-100 dark:bg-amber-900/40 p-3 border-b border-amber-200 dark:border-amber-800 flex items-center gap-2">
                    <CalendarCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <h2 className="font-bold text-amber-800 dark:text-amber-300">Today's Focus</h2>
                    <span className="ml-auto text-xs bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
                      {todayTasks.length} pinned
                    </span>
                  </div>
                  <div className="p-2">
                    {todayTasks.map(task => (
                      <TaskItem 
                        key={task.id} 
                        task={task} 
                        onToggle={handleToggle}
                        isTimerActive={isTimerActive(task.id)}
                        isTimerPaused={isTimerPaused(task.id)}
                        timerStartTime={getActiveTimer(task.id)?.startTime}
                        accumulatedSeconds={getActiveTimer(task.id)?.accumulatedSeconds ?? 0}
                        onStartTimer={() => startTimer(task.id)}
                        onPauseTimer={() => pauseTimer(task.id)}
                        onStopTimer={() => stopTimer(task.id)}
                        onPinToToday={pinToToday}
                        onUpdateDueDate={updateDueDate}
                        onUpdateTask={updateTask}
                        onDeleteTask={deleteTask}
                        isNew={newTaskIds.has(task.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Critical Priority Block - Must Do Now */}
              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl shadow-md border-l-4 border-red-500 overflow-hidden">
                <div className="bg-red-100 dark:bg-red-900/40 p-3 border-b border-red-200 dark:border-red-800 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <h2 className="font-bold text-red-800 dark:text-red-300">Must Do Now</h2>
                </div>
                <div className="p-2">
                  {criticalTasks.map(task => (
                    <TaskItem 
                      key={task.id} 
                      task={task} 
                      onToggle={handleToggle}
                      isTimerActive={isTimerActive(task.id)}
                      isTimerPaused={isTimerPaused(task.id)}
                      timerStartTime={getActiveTimer(task.id)?.startTime}
                      accumulatedSeconds={getActiveTimer(task.id)?.accumulatedSeconds ?? 0}
                      onStartTimer={() => startTimer(task.id)}
                      onPauseTimer={() => pauseTimer(task.id)}
                      onStopTimer={() => stopTimer(task.id)}
                      onPinToToday={pinToToday}
                      onUpdateDueDate={updateDueDate}
                      onUpdateTask={updateTask}
                      onDeleteTask={deleteTask}
                      isNew={newTaskIds.has(task.id)}
                    />
                  ))}
                  {criticalTasks.length === 0 && (
                    <p className="text-sm text-slate-400 dark:text-slate-500 p-3">No critical tasks! 🎉</p>
                  )}
                </div>
              </div>

              {/* Quick Wins Block */}
              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="bg-emerald-100 dark:bg-emerald-900/40 p-3 border-b border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="font-bold text-emerald-800 dark:text-emerald-300">Quick Wins (Under 15m)</h2>
                </div>
                <div className="p-2">
                  {quickWins.map(task => (
                    <TaskItem 
                      key={task.id} 
                      task={task} 
                      onToggle={handleToggle}
                      isTimerActive={isTimerActive(task.id)}
                      isTimerPaused={isTimerPaused(task.id)}
                      timerStartTime={getActiveTimer(task.id)?.startTime}
                      accumulatedSeconds={getActiveTimer(task.id)?.accumulatedSeconds ?? 0}
                      onStartTimer={() => startTimer(task.id)}
                      onPauseTimer={() => pauseTimer(task.id)}
                      onStopTimer={() => stopTimer(task.id)}
                      onPinToToday={pinToToday}
                      showQuickWinButton={false}
                      onUpdateDueDate={updateDueDate}
                      onUpdateTask={updateTask}
                      onDeleteTask={deleteTask}
                      isNew={newTaskIds.has(task.id)}
                    />
                  ))}
                  {quickWins.length === 0 && (
                    <p className="text-sm text-slate-400 dark:text-slate-500 p-3">No quick wins available</p>
                  )}
                </div>
              </div>

              {/* Streaks Section */}
              {streakTasks.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="bg-orange-100 dark:bg-orange-900/40 p-3 border-b border-orange-200 dark:border-orange-800 flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    <h2 className="font-bold text-orange-800 dark:text-orange-300">Daily Streaks</h2>
                  </div>
                  <div className="p-3 space-y-3">
                    {streakTasks.map(task => (
                      <StreakCard 
                        key={task.id} 
                        task={task} 
                        onToggle={handleToggle}
                        onUpdateTask={updateTask}
                        onDeleteTask={deleteTask}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: PROJECTS & DEEP WORK */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Project Groups - Draggable */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={listOrder}
                  strategy={verticalListSortingStrategy}
                >
                  {listOrder.map((category) => {
                    const catTasks = groupedByCategory[category] || []
                    return (
                      <SortableListItem key={category} id={category}>
                        {({ dragHandleProps, isDragging }) => (
                          <div className={`bg-slate-50 dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-visible ${isDragging ? 'shadow-2xl' : ''}`}>
                            <ListHeader
                              categoryKey={category}
                              defaultName={`${category} List`}
                              remainingCount={catTasks.filter(t => !t.completed).length}
                              isExpanded={expandedProjectLists[category] !== false}
                              onToggleExpand={() => toggleProjectList(category)}
                              dragHandleProps={dragHandleProps}
                              isDragging={isDragging}
                            />
                            
                            {expandedProjectLists[category] !== false && (
                              <>
                                <div className="p-2 divide-y divide-slate-100 dark:divide-slate-800">
                                  {catTasks.map(task => (
                                    <TaskItem 
                                      key={task.id} 
                                      task={task} 
                                      onToggle={handleToggle} 
                                      showCategory={false}
                                      isTimerActive={isTimerActive(task.id)}
                                      isTimerPaused={isTimerPaused(task.id)}
                                      timerStartTime={getActiveTimer(task.id)?.startTime}
                                      accumulatedSeconds={getActiveTimer(task.id)?.accumulatedSeconds ?? 0}
                                      onStartTimer={() => startTimer(task.id)}
                                      onPauseTimer={() => pauseTimer(task.id)}
                                      onStopTimer={() => stopTimer(task.id)}
                                      onPinToToday={pinToToday}
                                      onUpdateDueDate={updateDueDate}
                                      onUpdateTask={updateTask}
                                      onDeleteTask={deleteTask}
                                      isNew={newTaskIds.has(task.id)}
                                    />
                                  ))}
                                </div>
                                {/* Inline Category Input */}
                                <InlineCategoryInput 
                                  category={category as Category}
                                  onAddTask={addTask}
                                />
                              </>
                            )}
                          </div>
                        )}
                      </SortableListItem>
                    )
                  })}
                </SortableContext>
              </DndContext>
            </div>
          </div>
        )}

        {/* ARCHIVE VIEW */}
        {activeTab === 'archive' && (
          <div className="space-y-4">
            {archivedTasks.length === 0 ? (
              <div className="text-center py-16 text-slate-400 dark:text-slate-500">
                <Archive className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No completed tasks yet</p>
                <p className="text-sm">Completed tasks will appear here as your history</p>
              </div>
            ) : (
              Object.entries(archivedByCategory).map(([category, catTasks]) => (
                <div key={category} className="bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full p-4 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {expandedCategories[category] ? (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      )}
                      <h3 className="font-bold text-slate-700 dark:text-slate-300">{category}</h3>
                      <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full">
                        {catTasks.length} completed
                      </span>
                    </div>
                  </button>
                  
                  {expandedCategories[category] && (
                    <div className="border-t border-slate-200 dark:border-slate-700 p-3 space-y-2">
                      {catTasks.map(task => (
                        <div 
                          key={task.id}
                          className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-lg opacity-60"
                        >
                          <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 line-through">{task.text}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                              Completed: {task.completed_at ? new Date(task.completed_at).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : 'Unknown'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* TIMELINE VIEW */}
        {activeTab === 'timeline' && (
          <WeeklyGantt timeLogs={timeLogs} tasks={tasks} />
        )}

        {/* Bottom Spacer - ensures content can scroll above the fixed AI input */}
        <div className="h-32" aria-hidden="true" />
      </div>

      {/* AI Task Input Bar (Fixed at Bottom) */}
      <AITaskInput 
        tasks={tasks}
        onAddTasks={handleAddMultipleTasks}
        onToggleTask={toggleTask}
        onDeleteTask={deleteTask}
        onPinToToday={pinToToday}
        onUpdateDueDate={updateDueDate}
        onUpdateTask={updateTask}
      />
    </div>
  )
}
