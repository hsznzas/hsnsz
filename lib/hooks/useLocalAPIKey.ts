'use client'

import { useState, useEffect, useCallback } from 'react'

const API_KEY_STORAGE_KEY = 'hsnzas_gemini_api_key'
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

export interface ApiKeyTestResult {
  valid: boolean
  error?: string
}

/**
 * Test if a Gemini API key is valid by making a minimal API call
 */
/**
 * Parse Google API error response into user-friendly message
 */
export function parseGoogleApiError(response: Response, errorData: Record<string, unknown>): string {
  const errorMessage = (errorData?.error as Record<string, unknown>)?.message as string || ''
  const errorStatus = (errorData?.error as Record<string, unknown>)?.status as string || ''

  // API Key errors
  if (errorMessage.includes('API key not valid') || errorMessage.includes('API Key not found')) {
    return 'Your API key is invalid or expired. Please get a new key from AI Studio and update it in settings.'
  }

  // Permission errors
  if (errorStatus === 'PERMISSION_DENIED' || errorMessage.includes('permission')) {
    return 'This API key doesn\'t have permission to use Gemini. Enable the Generative Language API in Google Cloud Console.'
  }

  // Quota errors
  if (errorStatus === 'RESOURCE_EXHAUSTED' || errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
    return 'API quota exceeded. Please wait a moment and try again, or check your Google Cloud billing.'
  }

  // Safety/content errors
  if (errorMessage.includes('safety') || errorMessage.includes('blocked')) {
    return 'Request was blocked by content safety filters. Try rephrasing your input.'
  }

  // Status code based fallbacks
  if (response.status === 400) {
    return 'Invalid request. Please try again with different input.'
  }

  if (response.status === 401 || response.status === 403) {
    return 'Authentication failed. Please check your API key in settings.'
  }

  if (response.status === 429) {
    return 'Too many requests. Please wait a moment and try again.'
  }

  if (response.status >= 500) {
    return 'Google\'s servers are temporarily unavailable. Please try again later.'
  }

  // Generic fallback
  return errorMessage || `API error (${response.status}). Please try again.`
}

export async function testApiKey(key: string): Promise<ApiKeyTestResult> {
  if (!key || !key.trim()) {
    return { valid: false, error: 'Please enter an API key' }
  }

  const trimmedKey = key.trim()
  
  if (!trimmedKey.startsWith('AIza')) {
    return { valid: false, error: 'Invalid key format. Gemini API keys start with "AIza"' }
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${trimmedKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Hi' }] }],
        generationConfig: { maxOutputTokens: 1 }
      })
    })

    if (response.ok) {
      return { valid: true }
    }

    // Parse error response
    const errorData = await response.json().catch(() => ({}))
    const errorMessage = errorData?.error?.message || ''
    const errorStatus = errorData?.error?.status || ''

    // Map common errors to user-friendly messages
    if (errorMessage.includes('API key not valid') || errorMessage.includes('API Key not found')) {
      return { valid: false, error: 'This API key is invalid or has been revoked. Please generate a new key from AI Studio.' }
    }
    
    if (errorStatus === 'PERMISSION_DENIED' || errorMessage.includes('permission')) {
      return { valid: false, error: 'This API key doesn\'t have permission to use Gemini. Enable the Generative Language API in Google Cloud Console.' }
    }
    
    if (errorStatus === 'RESOURCE_EXHAUSTED' || errorMessage.includes('quota')) {
      return { valid: false, error: 'API quota exceeded. Wait a bit or check your Google Cloud billing settings.' }
    }

    if (response.status === 400) {
      return { valid: false, error: 'Invalid API key format or request. Please check your key.' }
    }

    if (response.status === 403) {
      return { valid: false, error: 'Access denied. This key may be restricted or the API is not enabled.' }
    }

    // Generic error
    return { valid: false, error: errorMessage || `API error (${response.status}). Please try a different key.` }

  } catch (err) {
    // Network or other errors
    if (err instanceof Error) {
      if (err.message.includes('fetch') || err.message.includes('network')) {
        return { valid: false, error: 'Network error. Please check your internet connection.' }
      }
      return { valid: false, error: `Error: ${err.message}` }
    }
    return { valid: false, error: 'Failed to validate API key. Please try again.' }
  }
}

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
