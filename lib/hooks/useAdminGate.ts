'use client'

import { useCallback, useEffect, useState } from 'react'

const ADMIN_PASSCODE = '5756'
const STORAGE_KEY = 'admin-unlocked'

export function useAdminGate() {
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const stored = typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) === 'true'
    setIsUnlocked(stored)
    setIsChecking(false)
  }, [])

  const unlock = useCallback((passcode: string) => {
    if (passcode === ADMIN_PASSCODE) {
      setIsUnlocked(true)
      localStorage.setItem(STORAGE_KEY, 'true')
      return true
    }
    return false
  }, [])

  const lock = useCallback(() => {
    setIsUnlocked(false)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return {
    isUnlocked,
    isChecking,
    unlock,
    lock,
  }
}
