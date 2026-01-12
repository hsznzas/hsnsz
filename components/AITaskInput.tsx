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
  ChevronDown
} from 'lucide-react'
import { useLocalAPIKey } from '@/lib/hooks/useLocalAPIKey'
import { useAIParser, ParsedTask } from '@/lib/hooks/useAIParser'
import { APIKeyModal } from './APIKeyModal'
import type { Category, Priority } from '@/lib/supabase/types'

interface AITaskInputProps {
  onAddTasks: (tasks: { text: string; category: Category; priority: Priority; duration: string }[]) => void
}

export function AITaskInput({ onAddTasks }: AITaskInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false)
  const [input, setInput] = useState('')
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([])
  const [showSuccess, setShowSuccess] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { apiKey, setApiKey, clearApiKey, hasApiKey, isLoaded } = useLocalAPIKey()
  const { parseTasks, isLoading, error } = useAIParser(apiKey)

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

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
      setIsOpen(false)
    }, 1500)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (parsedTasks.length > 0) {
        handleConfirmTasks()
      } else {
        handleSubmit()
      }
    }
  }

  const handleOpen = () => {
    if (!hasApiKey && isLoaded) {
      setIsKeyModalOpen(true)
    } else {
      setIsOpen(true)
    }
  }

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 left-6 z-50">
        <AnimatePresence>
          {!isOpen && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              onClick={handleOpen}
              className="group p-4 rounded-full shadow-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-xl hover:scale-105 transition-all"
              title="AI Task Assistant"
            >
              <Sparkles className="w-6 h-6" />
              
              {/* Tooltip */}
              <span className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                AI Task Assistant
              </span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Expanded Chat Interface */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-[380px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  <span className="font-semibold">AI Task Assistant</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsKeyModalOpen(true)}
                    className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                    title="API Key Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setIsOpen(false)
                      setParsedTasks([])
                      setInput('')
                    }}
                    className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Success Animation */}
              <AnimatePresence>
                {showSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-emerald-500 flex items-center justify-center z-10"
                  >
                    <div className="text-center text-white">
                      <CheckCircle className="w-16 h-16 mx-auto mb-2" />
                      <p className="text-lg font-semibold">Tasks Added!</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Body */}
              <div className="p-4">
                {/* Instructions */}
                {!parsedTasks.length && !isLoading && (
                  <p className="text-sm text-slate-500 mb-3">
                    Describe your tasks in natural language. I'll parse them for you.
                  </p>
                )}

                {/* Input Area */}
                <div className="relative">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="e.g., Review Sinjab contract urgently, call Dhruv, buy groceries..."
                    rows={3}
                    disabled={isLoading || showSuccess}
                    className="w-full px-3 py-2.5 pr-12 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none text-sm disabled:bg-slate-50"
                  />
                  <button
                    onClick={parsedTasks.length > 0 ? handleConfirmTasks : handleSubmit}
                    disabled={!input.trim() || isLoading || showSuccess}
                    className="absolute right-2 bottom-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {/* Parsed Tasks Preview */}
                <AnimatePresence>
                  {parsedTasks.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-slate-700">
                          Parsed {parsedTasks.length} task{parsedTasks.length > 1 ? 's' : ''}:
                        </p>
                        <button
                          onClick={() => setParsedTasks([])}
                          className="text-xs text-slate-500 hover:text-slate-700"
                        >
                          Clear
                        </button>
                      </div>
                      
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {parsedTasks.map((task, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="p-2.5 bg-slate-50 rounded-lg border border-slate-200"
                          >
                            <p className="text-sm font-medium text-slate-800">{task.text}</p>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getCategoryColor(task.category)}`}>
                                {task.category}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPriorityColor(task.priority)}`}>
                                {task.priority}
                              </span>
                              <span className="text-xs text-slate-400">
                                {task.duration}
                              </span>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      <button
                        onClick={handleConfirmTasks}
                        className="w-full mt-3 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Add {parsedTasks.length} Task{parsedTasks.length > 1 ? 's' : ''}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Keyboard shortcut hint */}
                {!parsedTasks.length && (
                  <p className="text-xs text-slate-400 mt-3 text-center">
                    Press <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">Enter</kbd> to send
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
