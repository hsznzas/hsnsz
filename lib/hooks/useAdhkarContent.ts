'use client'

import { useState, useEffect, useCallback } from 'react'
import { exitAdhkar, morningEveningAdhkar, type Dhikr } from '@/lib/adhkar-data'

export interface AdhkarContent {
  exit: Dhikr[]
  morningEvening: Dhikr[]
}

const defaultContent: AdhkarContent = {
  exit: exitAdhkar,
  morningEvening: morningEveningAdhkar
}

export function useAdhkarContent() {
  const [content, setContent] = useState<AdhkarContent>(defaultContent)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/adhkar-content')
      .then((res) => res.json())
      .then((data) => {
        setContent(data)
        setIsLoading(false)
      })
      .catch(() => {
        setIsLoading(false)
      })
  }, [])

  const saveContent = useCallback(async (newContent: AdhkarContent) => {
    const res = await fetch('/api/adhkar-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newContent)
    })
    if (res.ok) {
      setContent(newContent)
    }
    return res.ok
  }, [])

  return { content, isLoading, saveContent, setContent }
}
