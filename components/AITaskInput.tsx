'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Sparkles, 
  Send, 
  X, 
  Settings, 
  Loader2, 
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react'
import { useLocalAPIKey } from '@/lib/hooks/useLocalAPIKey'
import { useAIParser, ParsedTask } from '@/lib/hooks/useAIParser'
import { APIKeyModal } from './APIKeyModal'
import type { Category, Priority } from '@/lib/supabase/types'

interface AITaskInputProps {
  onAddTasks: (tasks: { text: string; category: Category; priority: Priority; duration: string }[]) => void
}

export function AITaskInput({ onAddTasks }: AITaskInputProps) {
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false)
  const [input, setInput] = useState('')
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([])
  const [showSuccess, setShowSuccess] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const { apiKey, setApiKey, clearApiKey, hasApiKey, isLoaded } = useLocalAPIKey()
  const { parseTasks, isLoading, error } = useAIParser(apiKey)

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return

    if (!hasApiKey) {
      setIsKeyModalOpen(true)
      return
    }

    const result = await parseTasks(input)
    
    if (result.tasks.length > 0) {
      setParsedTasks(result.tasks)
    }
  }

  const handleConfirmTasks = () => {
    if (parsedTasks.length === 0) return

    onAddTasks(parsedTasks)
    
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
  }

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
                <span className="font-medium">Tasks added successfully!</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Confirmation Panel */}
        <AnimatePresence>
          {parsedTasks.length > 0 && !showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-white border-t border-slate-200 shadow-2xl"
            >
              <div className="max-w-3xl mx-auto p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    <h3 className="font-semibold text-slate-800">
                      Confirm {parsedTasks.length} Task{parsedTasks.length > 1 ? 's' : ''}
                    </h3>
                  </div>
                  <button
                    onClick={handleCancelTasks}
                    className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Tasks Preview */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto mb-4">
                  {parsedTasks.map((task, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3"
                    >
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0 mt-0.5">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800">{task.text}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getCategoryColor(task.category)}`}>
                            {task.category}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                          <span className="text-xs text-slate-400">
                            ⏱️ {task.duration}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={handleCancelTasks}
                    className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmTasks}
                    className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Add {parsedTasks.length} Task{parsedTasks.length > 1 ? 's' : ''}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Input Bar */}
        {parsedTasks.length === 0 && !showSuccess && (
          <div className="bg-white border-t border-slate-200 shadow-lg">
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
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input Row */}
              <div className="flex items-center gap-3">
                {/* AI Icon */}
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-white" />
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
                      ? "Add tasks naturally... e.g., 'Review contract, call John, buy groceries'" 
                      : "Click settings to add your Gemini API key first..."
                    }
                    disabled={isLoading}
                    className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm bg-slate-50 disabled:bg-slate-100"
                  />
                  
                  {/* Send Button */}
                  <button
                    onClick={handleSubmit}
                    disabled={!input.trim() || isLoading || !hasApiKey}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                      ? 'hover:bg-slate-100 text-slate-500' 
                      : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                  }`}
                  title={hasApiKey ? "API Key Settings" : "Add API Key"}
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>

              {/* Help Text */}
              <p className="text-xs text-slate-400 mt-2 text-center">
                {hasApiKey ? (
                  <>Press <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">Enter</kbd> to parse tasks with AI</>
                ) : (
                  <>🔑 Add your Gemini API key to enable AI task parsing</>
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
    Sinjab: 'bg-purple-100 text-purple-800',
    Ajdel: 'bg-blue-100 text-blue-800',
    Personal: 'bg-green-100 text-green-800',
    Haseeb: 'bg-orange-100 text-orange-800',
    Raqeeb: 'bg-pink-100 text-pink-800',
    'Voice Input': 'bg-indigo-100 text-indigo-800',
  }
  return colors[category] || 'bg-gray-100 text-gray-800'
}

function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    Critical: 'bg-red-100 text-red-800',
    'Quick Win': 'bg-amber-100 text-amber-800',
    High: 'bg-orange-100 text-orange-800',
    Medium: 'bg-blue-100 text-blue-800',
    Low: 'bg-slate-100 text-slate-600',
  }
  return colors[priority] || 'bg-gray-100 text-gray-800'
}
