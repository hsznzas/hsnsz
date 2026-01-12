'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Key, Eye, EyeOff, ExternalLink, Shield, Trash2 } from 'lucide-react'

interface APIKeyModalProps {
  isOpen: boolean
  onClose: () => void
  currentKey: string | null
  onSave: (key: string) => void
  onClear: () => void
}

export function APIKeyModal({ isOpen, onClose, currentKey, onSave, onClear }: APIKeyModalProps) {
  const [inputKey, setInputKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [error, setError] = useState('')

  const handleSave = () => {
    const trimmedKey = inputKey.trim()
    
    if (!trimmedKey) {
      setError('Please enter an API key')
      return
    }

    if (!trimmedKey.startsWith('AIza')) {
      setError('Invalid Gemini API key format (should start with "AIza")')
      return
    }

    onSave(trimmedKey)
    setInputKey('')
    setError('')
    onClose()
  }

  const handleClear = () => {
    onClear()
    setInputKey('')
    onClose()
  }

  const maskedKey = currentKey 
    ? `${currentKey.slice(0, 8)}${'•'.repeat(20)}${currentKey.slice(-4)}`
    : null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Key className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900">Gemini API Key</h2>
                    <p className="text-xs text-slate-500">Stored locally in your browser</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 space-y-4">
                {/* Security notice */}
                <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <Shield className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-emerald-800">Your key stays private</p>
                    <p className="text-emerald-600 text-xs mt-0.5">
                      Stored only in your browser's localStorage. Never sent to any server except Google's API.
                    </p>
                  </div>
                </div>

                {/* Current key display */}
                {currentKey && (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">Current API Key</p>
                    <div className="flex items-center justify-between">
                      <code className="text-sm text-slate-700 font-mono">
                        {showKey ? currentKey : maskedKey}
                      </code>
                      <button
                        onClick={() => setShowKey(!showKey)}
                        className="p-1.5 hover:bg-slate-200 rounded transition-colors"
                      >
                        {showKey ? (
                          <EyeOff className="w-4 h-4 text-slate-500" />
                        ) : (
                          <Eye className="w-4 h-4 text-slate-500" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Input */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    {currentKey ? 'Update API Key' : 'Enter API Key'}
                  </label>
                  <input
                    type="password"
                    value={inputKey}
                    onChange={(e) => {
                      setInputKey(e.target.value)
                      setError('')
                    }}
                    placeholder="AIza..."
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm font-mono"
                  />
                  {error && (
                    <p className="text-red-500 text-xs mt-1">{error}</p>
                  )}
                </div>

                {/* Get API key link */}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Get a free Gemini API key from Google AI Studio
                </a>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50">
                {currentKey ? (
                  <button
                    onClick={handleClear}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove Key
                  </button>
                ) : (
                  <div />
                )}
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!inputKey.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save Key
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
