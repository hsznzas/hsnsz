'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, ChevronDown } from 'lucide-react'
import { clsx } from 'clsx'
import type { Category, Priority } from '@/lib/supabase/types'

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'Sinjab', label: 'Sinjab' },
  { value: 'Ajdel', label: 'Ajdel' },
  { value: 'Personal', label: 'Personal' },
  { value: 'Haseeb', label: 'Haseeb' },
  { value: 'Raqeeb', label: 'Raqeeb' },
  { value: 'Voice Input', label: 'Voice Input' },
]

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'Critical', label: 'Critical - Must Do Now' },
  { value: 'Quick Win', label: 'Quick Win' },
  { value: 'High', label: 'High Priority' },
  { value: 'Medium', label: 'Medium Priority' },
  { value: 'Low', label: 'Low Priority' },
]

interface AddTaskFormProps {
  onAddTask: (text: string, category: Category, priority: Priority, duration: string) => void
  initialText?: string
  onClear?: () => void
}

export function AddTaskForm({ onAddTask, initialText = '', onClear }: AddTaskFormProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [text, setText] = useState(initialText)
  const [duration, setDuration] = useState('')
  const [category, setCategory] = useState<Category>('Personal')
  const [priority, setPriority] = useState<Priority>('Medium')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return

    onAddTask(text.trim(), category, priority, duration.trim() || 'Unknown')
    
    // Reset form
    setText('')
    setDuration('')
    setCategory('Personal')
    setPriority('Medium')
    setIsExpanded(false)
    onClear?.()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && text.trim()) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      {/* Quick add input */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={clsx(
              'flex-shrink-0 w-8 h-8 rounded-full transition-all duration-300',
              'flex items-center justify-center',
              'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-110 active:scale-95',
              isExpanded && 'rotate-45'
            )}
          >
            <Plus className="w-5 h-5" />
          </button>
          
          <input
            type="text"
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              if (e.target.value && !isExpanded) setIsExpanded(true)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Add a new task... (Press Enter to quickly add)"
            className="flex-1 bg-transparent text-slate-800 placeholder-slate-400 focus:outline-none text-sm"
          />

          {text && (
            <button
              onClick={() => {
                setText('')
                onClear?.()
              }}
              className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Expanded form */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <form onSubmit={handleSubmit} className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-4">
              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  Duration (optional)
                </label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g., 15m, 1h, Focus"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              {/* Category & Priority row */}
              <div className="grid grid-cols-2 gap-4">
                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">
                    Category
                  </label>
                  <div className="relative">
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as Category)}
                      className="w-full px-3 py-2 rounded-lg appearance-none bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">
                    Priority
                  </label>
                  <div className="relative">
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as Priority)}
                      className="w-full px-3 py-2 rounded-lg appearance-none bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    >
                      {PRIORITIES.map((pri) => (
                        <option key={pri.value} value={pri.value}>
                          {pri.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsExpanded(false)
                    setText('')
                    setDuration('')
                    onClear?.()
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!text.trim()}
                  className="px-6 py-2 rounded-lg font-medium transition-all bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  Add Task
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
