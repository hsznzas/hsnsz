'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Key, Eye, EyeOff, ExternalLink, Shield, Trash2, Loader2, CheckCircle } from 'lucide-react'
import { testApiKey } from '@/lib/hooks/useLocalAPIKey'

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
  const [isValidating, setIsValidating] = useState(false)
  const [validationSuccess, setValidationSuccess] = useState(false)

  const handleSave = async () => {
    const trimmedKey = inputKey.trim()
    
    if (!trimmedKey) {
      setError('Please enter an API key')
      return
    }

    if (!trimmedKey.startsWith('AIza')) {
      setError('Invalid Gemini API key format (should start with "AIza")')
      return
    }

    // Test the API key before saving
    setIsValidating(true)
    setError('')
    
    const result = await testApiKey(trimmedKey)
    
    setIsValidating(false)
    
    if (!result.valid) {
      setError(result.error || 'Invalid API key')
      return
    }

    // Key is valid - show success briefly then save
    setValidationSuccess(true)
    setTimeout(() => {
      onSave(trimmedKey)
      setInputKey('')
      setError('')
      setValidationSuccess(false)
      onClose()
    }, 800)
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
            <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden mx-4">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Key className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 dark:text-white">Gemini API Key</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Stored locally in your browser</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 space-y-4">
                {/* Security notice */}
                <div className="flex items-start gap-3 p-3 bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                  <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-emerald-800 dark:text-emerald-300">Your key stays private</p>
                    <p className="text-emerald-600 dark:text-emerald-400 text-xs mt-0.5">
                      Stored only in your browser's localStorage. Never sent to any server except Google's API.
                    </p>
                  </div>
                </div>

                {/* Current key display */}
                {currentKey && (
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Current API Key</p>
                    <div className="flex items-center justify-between">
                      <code className="text-sm text-slate-700 dark:text-slate-300 font-mono">
                        {showKey ? currentKey : maskedKey}
                      </code>
                      <button
                        onClick={() => setShowKey(!showKey)}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                      >
                        {showKey ? (
                          <EyeOff className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        ) : (
                          <Eye className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Input */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
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
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 outline-none transition-all text-sm font-mono bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                  {error && (
                    <p className="text-red-500 dark:text-red-400 text-xs mt-1">{error}</p>
                  )}
                </div>

                {/* Get API key link */}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Get a free Gemini API key from Google AI Studio
                </a>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50">
                {currentKey ? (
                  <button
                    onClick={handleClear}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
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
                    disabled={isValidating}
                    className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!inputKey.trim() || isValidating || validationSuccess}
                    className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:cursor-not-allowed flex items-center gap-2 ${
                      validationSuccess 
                        ? 'bg-emerald-500 dark:bg-emerald-600' 
                        : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50'
                    }`}
                  >
                    {isValidating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Validating...
                      </>
                    ) : validationSuccess ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Valid!
                      </>
                    ) : (
                      'Save Key'
                    )}
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
