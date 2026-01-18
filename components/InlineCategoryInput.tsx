'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Sparkles, 
  Send, 
  X, 
  Loader2, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Settings
} from 'lucide-react'
import { useLocalAPIKey } from '@/lib/hooks/useLocalAPIKey'
import { useAIParser, ParsedTask } from '@/lib/hooks/useAIParser'
import { APIKeyModal } from './APIKeyModal'
import type { Category, Priority } from '@/lib/supabase/types'

interface InlineCategoryInputProps {
  category: Category
  onAddTask: (text: string, category: Category, priority: Priority, duration: string) => void
  placeholder?: string
}

// Priority colors for the confirmation preview
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

export function InlineCategoryInput({ category, onAddTask, placeholder }: InlineCategoryInputProps) {
  const [input, setInput] = useState('')
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([])
  const [showSuccess, setShowSuccess] = useState(false)
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const { apiKey, setApiKey, clearApiKey, hasApiKey } = useLocalAPIKey()
  const { parseTasks, isLoading, error } = useAIParser(apiKey)

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return

    // If no API key, prompt to add one OR just add as single task
    if (!hasApiKey) {
      // Fallback: add as single task without AI parsing
      onAddTask(input.trim(), category, 'Medium', 'Unknown')
      setInput('')
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 1500)
      return
    }

    // Use AI to parse the input
    const result = await parseTasks(input)
    
    if (result.tasks.length > 0) {
      // Override all tasks with this list's category
      const tasksWithCategory = result.tasks.map(task => ({
        ...task,
        category: category // Force the category to this list
      }))
      setParsedTasks(tasksWithCategory)
    } else if (result.error) {
      // If AI fails, add as single task
      onAddTask(input.trim(), category, 'Medium', 'Unknown')
      setInput('')
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 1500)
    }
  }

  const handleConfirmTasks = () => {
    if (parsedTasks.length === 0) return

    // Add all parsed tasks
    parsedTasks.forEach(task => {
      onAddTask(task.text, task.category, task.priority, task.duration)
    })
    
    // Show success animation
    setShowSuccess(true)
    setTimeout(() => {
      setShowSuccess(false)
      setParsedTasks([])
      setInput('')
    }, 1500)
  }

  const handleCancelTasks = () => {
    setParsedTasks([])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      setParsedTasks([])
    }
  }

  return (
    <>
      <div className="relative">
        {/* Success Toast */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50"
            >
              <div className="bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm whitespace-nowrap">
                <CheckCircle className="w-4 h-4" />
                <span>Added!</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Confirmation Panel */}
        <AnimatePresence>
          {parsedTasks.length > 0 && !showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="absolute bottom-full left-0 right-0 mb-2 z-50"
            >
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {parsedTasks.length} Task{parsedTasks.length > 1 ? 's' : ''} Detected
                    </span>
                  </div>
                  <button
                    onClick={handleCancelTasks}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-500 dark:text-slate-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Tasks Preview */}
                <div className="p-3 space-y-2 max-h-[250px] overflow-y-auto">
                  {parsedTasks.map((task, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-700"
                    >
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5">
                        {task.text}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          ⏱️ {task.duration}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
                  <button
                    onClick={handleCancelTasks}
                    className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors flex items-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmTasks}
                    className="px-4 py-1.5 text-xs bg-emerald-600 dark:bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors flex items-center gap-1"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Add {parsedTasks.length}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Display */}
        <AnimatePresence>
          {error && !parsedTasks.length && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full left-0 right-0 mb-2 z-50"
            >
              <div className="p-2 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Row */}
        <div className="flex items-center gap-2 p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl">
          {/* AI Icon - Minimalist */}
          <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 border ${
            hasApiKey 
              ? 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800' 
              : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800'
          }`}>
            <Sparkles className={`w-3.5 h-3.5 ${hasApiKey ? 'text-slate-600 dark:text-slate-400' : 'text-slate-400 dark:text-slate-500'}`} />
          </div>

          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder || `Add tasks to ${category}... (AI-powered)`}
              disabled={isLoading}
              className="w-full px-3 py-2 pr-10 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:bg-slate-100 dark:disabled:bg-slate-800/50"
            />
            
            {/* Send Button */}
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Settings Button - Only show if no API key */}
          {!hasApiKey && (
            <button
              onClick={() => setIsKeyModalOpen(true)}
              className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors flex-shrink-0"
              title="Add API Key for AI parsing"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>
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
