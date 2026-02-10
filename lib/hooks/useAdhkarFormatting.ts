'use client'

import { useState, useEffect } from 'react'
import { defaultFormatting, type AdhkarFormatting } from '@/lib/adhkar-formatting'

export function useAdhkarFormatting() {
  const [formatting, setFormatting] = useState<AdhkarFormatting>(defaultFormatting)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/adhkar-settings')
      .then((res) => res.json())
      .then((data) => {
        setFormatting(data)
        setIsLoading(false)
      })
      .catch(() => {
        setIsLoading(false)
      })
  }, [])

  return { formatting, isLoading }
}
