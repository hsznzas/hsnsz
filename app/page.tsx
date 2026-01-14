'use client'

import { useCallback } from 'react'
import { AlertCircle, Zap, Droplets, RefreshCw, AlertTriangle, Sun, Moon } from 'lucide-react'

import { useTaskStore } from '@/lib/hooks/useTaskStore'
import { useTheme } from '@/lib/hooks/useTheme'
import { ProgressBar } from '@/components/ProgressBar'
import { TaskItem } from '@/components/TaskItem'
import { AITaskInput } from '@/components/AITaskInput'
import { triggerCompletionConfetti, triggerQuickWinConfetti } from '@/lib/utils/confetti'
import type { Category, Priority } from '@/lib/supabase/types'

export default function ProductivityDashboard() {
  const {
    tasks,
    loading,
    isConfigured,
    syncError,
    addTask,
    toggleTask,
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
  } = useTaskStore()

  const { theme, toggleTheme, mounted } = useTheme()

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
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4 md:p-8 font-sans text-slate-800 dark:text-slate-200 relative pb-32">
      <div className="max-w-4xl mx-auto">
        
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
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Today's Command Center</h1>
            <div className="flex items-center gap-2">
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
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Focus on the Critical items first, then use Quick Wins to build momentum.
          </p>
          
          <ProgressBar 
            completed={completedCount}
            total={totalCount}
            progress={progress}
          />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT COLUMN: ACTION NOW */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Critical Priority Block */}
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
                    timerStartTime={getActiveTimer(task.id)?.startTime}
                    onStartTimer={() => startTimer(task.id)}
                    onStopTimer={() => stopTimer(task.id)}
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
                    timerStartTime={getActiveTimer(task.id)?.startTime}
                    onStartTimer={() => startTimer(task.id)}
                    onStopTimer={() => stopTimer(task.id)}
                  />
                ))}
                {quickWins.length === 0 && (
                  <p className="text-sm text-slate-400 dark:text-slate-500 p-3">No quick wins available</p>
                )}
              </div>
            </div>

            {/* Personal Health Block */}
            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="bg-cyan-100 dark:bg-cyan-900/40 p-3 border-b border-cyan-200 dark:border-cyan-800 flex items-center gap-2">
                <Droplets className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                <h2 className="font-bold text-cyan-800 dark:text-cyan-300">Health Check</h2>
              </div>
              <div className="p-4 text-sm text-slate-600 dark:text-slate-400 space-y-2">
                <div className="flex items-center gap-2">
                  <input type="checkbox" className="rounded text-cyan-600 focus:ring-cyan-500 dark:bg-slate-700 dark:border-slate-600" />
                  <span>Drink Water + Sea Salt</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" className="rounded text-cyan-600 focus:ring-cyan-500 dark:bg-slate-700 dark:border-slate-600" />
                  <span>Rightbite Subscribed?</span>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: PROJECTS & DEEP WORK */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Project Groups */}
            {Object.entries(groupedByCategory).map(([category, catTasks]) => (
              <div key={category} className="bg-slate-50 dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50 rounded-t-xl flex justify-between items-center">
                  <h3 className="font-bold text-slate-700 dark:text-slate-300 text-lg">{category} List</h3>
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                    {catTasks.filter(t => !t.completed).length} remaining
                  </span>
                </div>
                <div className="p-2 divide-y divide-slate-100 dark:divide-slate-800">
                  {catTasks.map(task => (
                    <TaskItem 
                      key={task.id} 
                      task={task} 
                      onToggle={handleToggle} 
                      showCategory={false}
                      isTimerActive={isTimerActive(task.id)}
                      timerStartTime={getActiveTimer(task.id)?.startTime}
                      onStartTimer={() => startTimer(task.id)}
                      onStopTimer={() => stopTimer(task.id)}
                    />
                  ))}
                </div>
              </div>
            ))}

          </div>
        </div>
      </div>

      {/* AI Task Input Bar (Fixed at Bottom) */}
      <AITaskInput onAddTasks={handleAddMultipleTasks} />
    </div>
  )
}
