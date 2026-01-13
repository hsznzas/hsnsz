'use client'

import { useCallback } from 'react'
import { AlertCircle, Zap, Droplets, RefreshCw, AlertTriangle } from 'lucide-react'

import { useTaskStore } from '@/lib/hooks/useTaskStore'
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span className="text-lg">Loading tasks...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800 relative pb-32">
      <div className="max-w-4xl mx-auto">
        
        {/* Sync Error Banner */}
        {syncError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Sync Error</p>
              <p className="text-xs text-red-600">{syncError}</p>
            </div>
          </div>
        )}

        {/* Header Section */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-slate-900">Today's Command Center</h1>
            <div className="flex items-center gap-2">
              {isConfigured ? (
                <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                  ✓ Synced
                </span>
              ) : (
                <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-medium">
                  ⚠ Local Only
                </span>
              )}
            </div>
          </div>
          <p className="text-slate-600 mb-4">
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
            <div className="bg-white rounded-xl shadow-md border-l-4 border-red-500 overflow-hidden">
              <div className="bg-red-50 p-3 border-b border-red-100 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <h2 className="font-bold text-red-800">Must Do Now</h2>
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
                  <p className="text-sm text-slate-400 p-3">No critical tasks! 🎉</p>
                )}
              </div>
            </div>

            {/* Quick Wins Block */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-emerald-50 p-3 border-b border-emerald-100 flex items-center gap-2">
                <Zap className="w-5 h-5 text-emerald-600" />
                <h2 className="font-bold text-emerald-800">Quick Wins (Under 15m)</h2>
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
                  <p className="text-sm text-slate-400 p-3">No quick wins available</p>
                )}
              </div>
            </div>

            {/* Personal Health Block */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-cyan-50 p-3 border-b border-cyan-100 flex items-center gap-2">
                <Droplets className="w-5 h-5 text-cyan-600" />
                <h2 className="font-bold text-cyan-800">Health Check</h2>
              </div>
              <div className="p-4 text-sm text-slate-600 space-y-2">
                <div className="flex items-center gap-2">
                  <input type="checkbox" className="rounded text-cyan-600 focus:ring-cyan-500" />
                  <span>Drink Water + Sea Salt</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" className="rounded text-cyan-600 focus:ring-cyan-500" />
                  <span>Rightbite Subscribed?</span>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: PROJECTS & DEEP WORK */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Project Groups */}
            {Object.entries(groupedByCategory).map(([category, catTasks]) => (
              <div key={category} className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl flex justify-between items-center">
                  <h3 className="font-bold text-slate-700 text-lg">{category} List</h3>
                  <span className="text-xs text-slate-400 font-mono">
                    {catTasks.filter(t => !t.completed).length} remaining
                  </span>
                </div>
                <div className="p-2 divide-y divide-slate-100">
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
