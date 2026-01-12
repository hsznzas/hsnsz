'use client'

import { useState, useCallback } from 'react'
import type { Category, Priority } from '@/lib/supabase/types'

export interface ParsedTask {
  text: string
  category: Category
  priority: Priority
  duration: string
}

interface AIParserResult {
  tasks: ParsedTask[]
  error?: string
}

const SYSTEM_PROMPT = `You are a task parsing assistant for a productivity app. Parse the user's natural language input into structured tasks.

Available categories: Sinjab, Ajdel, Personal, Haseeb, Raqeeb, Voice Input
Available priorities: Critical, Quick Win, High, Medium, Low

Rules:
- "Critical" = urgent, must do now, important deadlines
- "Quick Win" = tasks under 15 minutes, easy wins
- "High" = important but not immediate
- "Medium" = normal priority
- "Low" = can wait, nice to have

Respond ONLY with a valid JSON array of tasks. No markdown, no explanation. Example:
[{"text": "Call John", "category": "Personal", "priority": "Quick Win", "duration": "5m"}]

If the input mentions specific projects:
- Sinjab = business/company tasks
- Ajdel = marketing/ads tasks
- Haseeb = app development tasks
- Raqeeb = finance/tracking tasks
- Personal = personal life tasks

Estimate realistic durations like: 5m, 10m, 15m, 30m, 1h, 2h, Focus, Unknown`

export function useAIParser(apiKey: string | null) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parseTasks = useCallback(async (input: string): Promise<AIParserResult> => {
    if (!apiKey) {
      return { tasks: [], error: 'No API key configured' }
    }

    if (!input.trim()) {
      return { tasks: [], error: 'Please enter some text' }
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: SYSTEM_PROMPT },
                  { text: `Parse this into tasks: "${input}"` }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 1024,
            }
          })
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData?.error?.message || `API error: ${response.status}`
        setError(errorMessage)
        return { tasks: [], error: errorMessage }
      }

      const data = await response.json()
      
      // Extract text from Gemini response
      const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text
      
      if (!textContent) {
        setError('No response from AI')
        return { tasks: [], error: 'No response from AI' }
      }

      // Parse JSON from response (handle potential markdown code blocks)
      let jsonStr = textContent.trim()
      
      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7)
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3)
      }
      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3)
      }
      jsonStr = jsonStr.trim()

      try {
        const tasks = JSON.parse(jsonStr) as ParsedTask[]
        
        // Validate and sanitize tasks
        const validTasks = tasks
          .filter(t => t.text && typeof t.text === 'string')
          .map(t => ({
            text: t.text.trim(),
            category: validateCategory(t.category),
            priority: validatePriority(t.priority),
            duration: t.duration || 'Unknown',
          }))

        return { tasks: validTasks }
      } catch (parseError) {
        console.error('Failed to parse AI response:', textContent)
        setError('Failed to parse AI response')
        return { tasks: [], error: 'Failed to parse AI response' }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      return { tasks: [], error: message }
    } finally {
      setIsLoading(false)
    }
  }, [apiKey])

  return {
    parseTasks,
    isLoading,
    error,
  }
}

function validateCategory(category: string): Category {
  const validCategories: Category[] = ['Sinjab', 'Ajdel', 'Personal', 'Haseeb', 'Raqeeb', 'Voice Input']
  if (validCategories.includes(category as Category)) {
    return category as Category
  }
  return 'Personal'
}

function validatePriority(priority: string): Priority {
  const validPriorities: Priority[] = ['Critical', 'Quick Win', 'High', 'Medium', 'Low']
  if (validPriorities.includes(priority as Priority)) {
    return priority as Priority
  }
  return 'Medium'
}
