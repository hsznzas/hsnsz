'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Sparkles, 
  Send, 
  X, 
  Settings, 
  Loader2, 
  CheckCircle,
  AlertCircle,
  XCircle,
  Trash2,
  Pin,
  Edit3,
  Calendar,
  AlertTriangle,
  Info
} from 'lucide-react'
import { useLocalAPIKey } from '@/lib/hooks/useLocalAPIKey'
import { useAICommands, AICommandResult, ParsedTask, TaskFilter } from '@/lib/hooks/useAICommands'
import { APIKeyModal } from './APIKeyModal'
import type { Category, Priority, Task } from '@/lib/supabase/types'

interface AITaskInputProps {
  tasks: Task[]
  onAddTasks: (tasks: { text: string; category: Category; priority: Priority; duration: string; dueDate?: string }[]) => void
  onToggleTask: (id: number) => void
  onDeleteTask: (id: number) => void
  onPinToToday: (id: number, pinned: boolean) => void
  onUpdateDueDate: (id: number, date: string | null) => void
  onUpdateTask: (id: number, updates: Partial<Pick<Task, 'text' | 'category' | 'priority' | 'duration'>>) => void
}

export function AITaskInput({ 
  tasks,
  onAddTasks, 
  onToggleTask, 
  onDeleteTask,
  onPinToToday,
  onUpdateDueDate,
  onUpdateTask,
}: AITaskInputProps) {
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false)
  const [input, setInput] = useState('')
  const [commandResult, setCommandResult] = useState<AICommandResult | null>(null)
  const [matchingTasks, setMatchingTasks] = useState<Task[]>([])
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const { apiKey, setApiKey, clearApiKey, hasApiKey } = useLocalAPIKey()
  const { parseCommand, getMatchingTasks, isLoading, error } = useAICommands(apiKey)

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return

    if (!hasApiKey) {
      setIsKeyModalOpen(true)
      return
    }

    const result = await parseCommand(input)
    setCommandResult(result)

    // For bulk operations, find matching tasks
    if (result.filter && result.type !== 'add_tasks') {
      const matches = getMatchingTasks(tasks, result.filter)
      setMatchingTasks(matches)
    }
  }

  const executeCommand = () => {
    if (!commandResult) return

    switch (commandResult.type) {
      case 'add_tasks':
        if (commandResult.tasks && commandResult.tasks.length > 0) {
          onAddTasks(commandResult.tasks)
          showSuccessToast(`Added ${commandResult.tasks.length} task${commandResult.tasks.length > 1 ? 's' : ''}!`)
        }
        break

      case 'mark_done':
        matchingTasks.filter(t => !t.completed).forEach(t => onToggleTask(t.id))
        showSuccessToast(`Marked ${matchingTasks.filter(t => !t.completed).length} task(s) as done!`)
        break

      case 'mark_undone':
        matchingTasks.filter(t => t.completed).forEach(t => onToggleTask(t.id))
        showSuccessToast(`Marked ${matchingTasks.filter(t => t.completed).length} task(s) as incomplete!`)
        break

      case 'delete_tasks':
        matchingTasks.forEach(t => onDeleteTask(t.id))
        showSuccessToast(`Deleted ${matchingTasks.length} task(s)!`)
        break

      case 'pin_to_today':
        matchingTasks.forEach(t => onPinToToday(t.id, true))
        showSuccessToast(`Pinned ${matchingTasks.length} task(s) to Today!`)
        break

      case 'unpin_from_today':
        matchingTasks.forEach(t => onPinToToday(t.id, false))
        showSuccessToast(`Unpinned ${matchingTasks.length} task(s) from Today!`)
        break

      case 'set_due_date':
        if (commandResult.newValue?.dueDate) {
          matchingTasks.forEach(t => onUpdateDueDate(t.id, commandResult.newValue!.dueDate!))
          showSuccessToast(`Set due date for ${matchingTasks.length} task(s)!`)
        }
        break

      case 'change_priority':
        if (commandResult.newValue?.priority) {
          matchingTasks.forEach(t => onUpdateTask(t.id, { priority: commandResult.newValue!.priority }))
          showSuccessToast(`Changed priority for ${matchingTasks.length} task(s)!`)
        }
        break

      case 'change_category':
        if (commandResult.newValue?.category) {
          matchingTasks.forEach(t => onUpdateTask(t.id, { category: commandResult.newValue!.category }))
          showSuccessToast(`Moved ${matchingTasks.length} task(s) to ${commandResult.newValue.category}!`)
        }
        break

      default:
        break
    }

    resetState()
  }

  const showSuccessToast = (message: string) => {
    setSuccessMessage(message)
    setShowSuccess(true)
    setTimeout(() => {
      setShowSuccess(false)
      setSuccessMessage('')
    }, 2000)
  }

  const resetState = () => {
    setCommandResult(null)
    setMatchingTasks([])
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      resetState()
    }
  }

  const getCommandIcon = (type: string) => {
    switch (type) {
      case 'add_tasks': return <Sparkles className="w-5 h-5 text-purple-500" />
      case 'mark_done': case 'mark_undone': return <CheckCircle className="w-5 h-5 text-emerald-500" />
      case 'delete_tasks': return <Trash2 className="w-5 h-5 text-red-500" />
      case 'pin_to_today': case 'unpin_from_today': return <Pin className="w-5 h-5 text-blue-500" />
      case 'set_due_date': return <Calendar className="w-5 h-5 text-orange-500" />
      case 'change_priority': case 'change_category': return <Edit3 className="w-5 h-5 text-indigo-500" />
      case 'backend_required': return <AlertTriangle className="w-5 h-5 text-amber-500" />
      default: return <Info className="w-5 h-5 text-slate-500" />
    }
  }

  const getCommandTitle = (result: AICommandResult) => {
    switch (result.type) {
      case 'add_tasks': return `Add ${result.tasks?.length || 0} Task${(result.tasks?.length || 0) > 1 ? 's' : ''}`
      case 'mark_done': return `Mark ${matchingTasks.filter(t => !t.completed).length} Task(s) Done`
      case 'mark_undone': return `Mark ${matchingTasks.filter(t => t.completed).length} Task(s) Incomplete`
      case 'delete_tasks': return `Delete ${matchingTasks.length} Task(s)`
      case 'pin_to_today': return `Pin ${matchingTasks.length} Task(s) to Today`
      case 'unpin_from_today': return `Unpin ${matchingTasks.length} Task(s)`
      case 'set_due_date': return `Set Due Date for ${matchingTasks.length} Task(s)`
      case 'change_priority': return `Change Priority for ${matchingTasks.length} Task(s)`
      case 'change_category': return `Move ${matchingTasks.length} Task(s) to ${result.newValue?.category}`
      case 'backend_required': return 'Backend Change Required'
      case 'unknown': return 'Unknown Command'
      default: return 'Command'
    }
  }

  const isDangerous = commandResult?.type === 'delete_tasks'
  const isBackendRequired = commandResult?.type === 'backend_required'
  const isUnknown = commandResult?.type === 'unknown'
  const canExecute = commandResult && !isBackendRequired && !isUnknown && (
    commandResult.type === 'add_tasks' ? (commandResult.tasks?.length || 0) > 0 : matchingTasks.length > 0
  )

  return (
    <>
      {/* Fixed Bottom Input Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        {/* Success Toast */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4"
            >
              <div className="bg-emerald-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">{successMessage}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Command Confirmation Panel */}
        <AnimatePresence>
          {commandResult && !showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-2xl"
            >
              <div className="max-w-3xl mx-auto p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getCommandIcon(commandResult.type)}
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                      {getCommandTitle(commandResult)}
                    </h3>
                  </div>
                  <button
                    onClick={resetState}
                    className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500 dark:text-slate-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Message */}
                {commandResult.message && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    {commandResult.message}
                  </p>
                )}

                {/* Backend Required Message */}
                {isBackendRequired && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl mb-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-800 dark:text-amber-200 mb-2">
                          This action requires database changes
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                          {commandResult.backendMessage}
                        </p>
                        <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 p-3 rounded-lg font-mono">
                          Run in Supabase SQL Editor
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Unknown Command Help */}
                {isUnknown && (
                  <div className="p-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl mb-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                      {commandResult.error || "I couldn't understand that command."}
                    </p>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      <p className="font-medium mb-1">Try commands like:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        <li>"Add task: Review contract for Sinjab"</li>
                        <li>"Mark all high priority tasks done"</li>
                        <li>"Delete tasks containing 'old'"</li>
                        <li>"Pin critical tasks to Today"</li>
                        <li>"Move Personal tasks to Sinjab"</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Tasks Preview (for add_tasks) */}
                {commandResult.type === 'add_tasks' && commandResult.tasks && commandResult.tasks.length > 0 && (
                  <div className="space-y-2 max-h-[250px] overflow-y-auto mb-4">
                    {commandResult.tasks.map((task, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start gap-3"
                      >
                        <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-xs font-bold text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5">
                          +
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 dark:text-slate-200 text-sm">{task.text}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getCategoryColor(task.category)}`}>
                              {task.category}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                            <span className="text-[10px] text-slate-400">⏱️ {task.duration}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Matching Tasks Preview (for bulk operations) */}
                {commandResult.type !== 'add_tasks' && !isBackendRequired && !isUnknown && matchingTasks.length > 0 && (
                  <div className="space-y-1 max-h-[200px] overflow-y-auto mb-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                      Affected tasks:
                    </p>
                    {matchingTasks.slice(0, 10).map((task, index) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className={`p-2 rounded-lg text-sm flex items-center gap-2 ${
                          isDangerous 
                            ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' 
                            : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${task.completed ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        <span className={`flex-1 truncate ${isDangerous ? 'text-red-700 dark:text-red-300' : 'text-slate-700 dark:text-slate-300'}`}>
                          {task.text}
                        </span>
                        <span className="text-[10px] text-slate-400">{task.category}</span>
                      </motion.div>
                    ))}
                    {matchingTasks.length > 10 && (
                      <p className="text-xs text-slate-400 text-center py-1">
                        ... and {matchingTasks.length - 10} more
                      </p>
                    )}
                  </div>
                )}

                {/* No Matching Tasks */}
                {commandResult.type !== 'add_tasks' && !isBackendRequired && !isUnknown && matchingTasks.length === 0 && (
                  <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4 text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      No tasks match the criteria
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={resetState}
                    className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl font-medium transition-colors flex items-center gap-2 text-sm"
                  >
                    <XCircle className="w-4 h-4" />
                    Cancel
                  </button>
                  {canExecute && (
                    <button
                      onClick={executeCommand}
                      className={`px-5 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 text-sm shadow-lg ${
                        isDangerous
                          ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-600/20'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20'
                      }`}
                    >
                      <CheckCircle className="w-4 h-4" />
                      {isDangerous ? 'Delete' : 'Confirm'}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Input Bar */}
        {!commandResult && !showSuccess && (
          <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-lg">
            <div className="max-w-3xl mx-auto p-4">
              {/* Error Display */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-3"
                  >
                    <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input Row */}
              <div className="flex items-center gap-3">
                {/* AI Icon */}
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800">
                  <Sparkles className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </div>

                {/* Text Input */}
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={hasApiKey 
                      ? "Try: 'Add task...', 'Mark done...', 'Delete...', 'Pin to Today...'" 
                      : "Click settings to add your Gemini API key..."
                    }
                    disabled={isLoading}
                    className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-300 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 outline-none transition-all text-sm bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 disabled:bg-slate-200 dark:disabled:bg-slate-800/50"
                  />
                  
                  {/* Send Button */}
                  <button
                    onClick={handleSubmit}
                    disabled={!input.trim() || isLoading || !hasApiKey}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Settings Button */}
                <button
                  onClick={() => setIsKeyModalOpen(true)}
                  className={`p-2.5 rounded-xl transition-colors flex-shrink-0 ${
                    hasApiKey 
                      ? 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400' 
                      : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/60'
                  }`}
                  title={hasApiKey ? "API Key Settings" : "Add API Key"}
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>

              {/* Help Text */}
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 text-center">
                {hasApiKey ? (
                  <>
                    <kbd className="px-1 py-0.5 bg-slate-200 dark:bg-slate-800 rounded text-slate-500 dark:text-slate-400">Enter</kbd> to run • 
                    <kbd className="px-1 py-0.5 bg-slate-200 dark:bg-slate-800 rounded text-slate-500 dark:text-slate-400 ml-1">Esc</kbd> to cancel
                  </>
                ) : (
                  <>🔑 Add your Gemini API key to enable AI commands</>
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* API Key Modal */}
      <APIKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        currentKey={apiKey}
        onSave={setApiKey}
        onClear={clearApiKey}
      />
    </>
  )
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    Sinjab: 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300',
    Ajdel: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300',
    Personal: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300',
    Haseeb: 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300',
    Raqeeb: 'bg-pink-100 dark:bg-pink-900/40 text-pink-800 dark:text-pink-300',
    'Voice Input': 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300',
  }
  return colors[category] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'
}

function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    Critical: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300',
    'Quick Win': 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300',
    High: 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300',
    Medium: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300',
    Low: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
  }
  return colors[priority] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'
}
