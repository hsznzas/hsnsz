'use client'

import { useState, useEffect, useCallback } from 'react'

const API_KEY_STORAGE_KEY = 'hsnzas_gemini_api_key'

export function useLocalAPIKey() {
  const [apiKey, setApiKeyState] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load API key from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY)
      setApiKeyState(storedKey)
      setIsLoaded(true)
    }
  }, [])

  // Save API key to localStorage
  const setApiKey = useCallback((key: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(API_KEY_STORAGE_KEY, key)
      setApiKeyState(key)
    }
  }, [])

  // Remove API key from localStorage
  const clearApiKey = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(API_KEY_STORAGE_KEY)
      setApiKeyState(null)
    }
  }, [])

  // Check if API key is configured
  const hasApiKey = Boolean(apiKey && apiKey.trim().length > 0)

  return {
    apiKey,
    setApiKey,
    clearApiKey,
    hasApiKey,
    isLoaded,
  }
}
