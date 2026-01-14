'use client'

import { useState, useEffect, useCallback } from 'react'

type Theme = 'light' | 'dark'

const THEME_KEY = 'hsnzas-theme'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY) as Theme | null
    
    if (stored) {
      setThemeState(stored)
      document.documentElement.classList.toggle('dark', stored === 'dark')
    } else {
      // Default to light
      setThemeState('light')
      document.documentElement.classList.remove('dark')
    }
    
    setMounted(true)
  }, [])

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem(THEME_KEY, newTheme)
    
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }, [theme, setTheme])

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark',
    mounted,
  }
}
