'use client'

import { useState, useCallback } from 'react'
import type { Category, Priority, Task } from '@/lib/supabase/types'
import { PROJECT_CATEGORIES, CATEGORIES } from '@/lib/supabase/types'

// Types of commands the AI can understand
export type CommandType =
  | 'add_tasks'           // Add new tasks
  | 'mark_done'           // Mark tasks as complete
  | 'mark_undone'         // Mark tasks as incomplete
  | 'delete_tasks'        // Delete tasks
  | 'pin_to_today'        // Pin tasks to Today
  | 'unpin_from_today'    // Unpin tasks from Today
  | 'set_due_date'        // Set due dates
  | 'change_priority'     // Change priority
  | 'change_category'     // Move to different list
  | 'edit_text'           // Edit task text
  | 'backend_required'    // Needs database changes
  | 'unknown'             // Can't understand

export interface ParsedTask {
  text: string
  category: Category
  priority: Priority
  duration: string
  dueDate?: string
}

export interface TaskFilter {
  byPriority?: Priority[]
  byCategory?: Category[]
  byKeyword?: string
  byCompleted?: boolean
  byId?: number[]
  all?: boolean
}

export interface TaskTextUpdate {
  id: number
  originalText: string
  newText: string
}

export interface AICommandResult {
  type: CommandType
  // For add_tasks
  tasks?: ParsedTask[]
  // For bulk operations
  filter?: TaskFilter
  // For updates
  newValue?: {
    priority?: Priority
    category?: Category
    dueDate?: string
    text?: string
    pinned?: boolean
  }
  // For edit_text bulk transformations
  textTransform?: string  // Description of transformation (e.g., "make shorter", "add emoji")
  textUpdates?: TaskTextUpdate[]  // Generated text updates for each task
  // For backend_required
  backendMessage?: string
  // General
  message?: string
  error?: string
}

const COMMAND_SYSTEM_PROMPT = `You are a task management assistant that interprets natural language commands.

CRITICAL RULE FOR TITLES:
- If input is **SHORT** (< 10 words): Use as title.
- If input is **LONG**: Generate a **SHORT TITLE** (2-5 words) and put details in specific fields or description.

AVAILABLE COMMANDS:
1. ADD TASKS - Create new tasks. **IMPORTANT:** If the input is a list (commas or newlines), separate them into individual tasks.
2. MARK DONE - Complete tasks matching criteria  
3. MARK UNDONE - Uncomplete tasks
4. DELETE - Remove tasks matching criteria
5. PIN TO TODAY - Pin tasks to Today focus list
6. UNPIN FROM TODAY - Remove from Today list
7. SET DUE DATE - Add/change due dates
8. CHANGE PRIORITY - Update priority levels
9. CHANGE CATEGORY - Move tasks between lists
10. EDIT TEXT - Modify task text (rename, shorten, add emojis, rephrase, etc.)

AVAILABLE CATEGORIES (PROJECT LISTS): ${PROJECT_CATEGORIES.join(', ')}
AVAILABLE PRIORITIES: Critical, Quick Win, High, Medium, Low

FILTER OPTIONS:
- byPriority: ["Critical", "High", etc.]
- byCategory: ["Personal", "Sinjab", etc.]
- byKeyword: "search term"
- byCompleted: true/false
- all: true (for all tasks)

BACKEND REQUIRED - Return this when user asks for:
- Creating NEW project lists/categories
- Adding new fields to tasks
- Custom automations
- Database structure changes
- User management features

Respond with ONLY valid JSON (no markdown). Example responses:

For adding tasks:
{"type":"add_tasks","tasks":[{"text":"Call John","category":"Personal","priority":"High","duration":"15m"}]}

For bulk operations:
{"type":"mark_done","filter":{"byPriority":["High","Critical"]},"message":"Marking all high priority and critical tasks as done"}

For editing/renaming task text (bulk AI transformations):
{"type":"edit_text","filter":{"byCategory":["Personal"]},"textTransform":"make shorter and more concise","message":"Making Personal task titles shorter"}

For editing a single task's text directly:
{"type":"edit_text","filter":{"byKeyword":"specific task text"},"newValue":{"text":"New exact text"},"message":"Renaming task"}

For backend required:
{"type":"backend_required","backendMessage":"Creating a new project list 'Home Construction' requires adding a new value to the task_category enum in PostgreSQL. Run: ALTER TYPE task_category ADD VALUE 'Home Construction';"}

For unknown:
{"type":"unknown","message":"I couldn't understand that command. Try: 'Add task...', 'Mark done...', 'Delete...', etc."}
`

export function useAICommands(apiKey: string | null) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parseCommand = useCallback(async (input: string): Promise<AICommandResult> => {
    if (!apiKey) {
      return { type: 'unknown', error: 'No API key configured. Add NEXT_PUBLIC_GEMINI_API_KEY to .env.local' }
    }

    if (!input.trim()) {
      return { type: 'unknown', error: 'Please enter a command' }
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
                  { text: COMMAND_SYSTEM_PROMPT },
                  { text: `Interpret this command: "${input}"` }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 2048,
            }
          })
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData?.error?.message || `API error: ${response.status}`
        setError(errorMessage)
        return { type: 'unknown', error: errorMessage }
      }

      const data = await response.json()
      const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text

      if (!textContent) {
        setError('No response from AI')
        return { type: 'unknown', error: 'No response from AI' }
      }

      // Parse JSON from response
      let jsonStr = textContent.trim()
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
        const result = JSON.parse(jsonStr) as AICommandResult

        // Validate and sanitize the result
        if (result.tasks) {
          result.tasks = result.tasks.map(t => ({
            text: t.text?.trim() || '',
            category: validateCategory(t.category),
            priority: validatePriority(t.priority),
            duration: t.duration || 'Unknown',
            dueDate: t.dueDate,
          })).filter(t => t.text)
        }

        if (result.filter) {
          if (result.filter.byCategory) {
            result.filter.byCategory = result.filter.byCategory.filter(c =>
              CATEGORIES.includes(c as Category)
            ) as Category[]
          }
          if (result.filter.byPriority) {
            result.filter.byPriority = result.filter.byPriority.filter(p =>
              ['Critical', 'Quick Win', 'High', 'Medium', 'Low'].includes(p)
            ) as Priority[]
          }
        }

        if (result.newValue?.category) {
          result.newValue.category = validateCategory(result.newValue.category)
        }
        if (result.newValue?.priority) {
          result.newValue.priority = validatePriority(result.newValue.priority)
        }

        return result
      } catch (parseError) {
        console.error('Failed to parse AI response:', textContent)
        setError('Failed to parse AI response')
        return { type: 'unknown', error: 'Failed to understand the command. Try rephrasing.' }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      return { type: 'unknown', error: message }
    } finally {
      setIsLoading(false)
    }
  }, [apiKey])

  // Execute a command against the task list
  const getMatchingTasks = useCallback((tasks: Task[], filter: TaskFilter): Task[] => {
    return tasks.filter(task => {
      if (filter.all) return true

      if (filter.byId && filter.byId.length > 0) {
        if (!filter.byId.includes(task.id)) return false
      }

      if (filter.byPriority && filter.byPriority.length > 0) {
        if (!filter.byPriority.includes(task.priority)) return false
      }

      if (filter.byCategory && filter.byCategory.length > 0) {
        if (!filter.byCategory.includes(task.category)) return false
      }

      if (filter.byKeyword) {
        const keyword = filter.byKeyword.toLowerCase()
        if (!task.text.toLowerCase().includes(keyword)) return false
      }

      if (filter.byCompleted !== undefined) {
        if (task.completed !== filter.byCompleted) return false
      }

      return true
    })
  }, [])

  // Generate text transformations for tasks using AI
  const generateTextTransforms = useCallback(async (
    tasks: Task[],
    transformDescription: string
  ): Promise<TaskTextUpdate[]> => {
    if (!apiKey || tasks.length === 0) return []

    setIsLoading(true)
    setError(null)

    const taskList = tasks.map(t => ({ id: t.id, text: t.text }))

    const transformPrompt = `You are a task text transformer. Transform each task title according to the instruction.

INSTRUCTION: ${transformDescription}

TASKS TO TRANSFORM:
${JSON.stringify(taskList, null, 2)}

RULES:
- Keep the core meaning/action of each task
- Apply the transformation consistently to all tasks
- Return valid JSON array only (no markdown)
- Each item must have: id (number), originalText (string), newText (string)

Respond with ONLY a JSON array like:
[{"id":1,"originalText":"Original task text","newText":"Transformed text"},...]`

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
                parts: [{ text: transformPrompt }]
              }
            ],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 4096,
            }
          })
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData?.error?.message || `API error: ${response.status}`
        setError(errorMessage)
        return []
      }

      const data = await response.json()
      const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text

      if (!textContent) {
        setError('No response from AI')
        return []
      }

      // Parse JSON from response
      let jsonStr = textContent.trim()
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
        const updates = JSON.parse(jsonStr) as TaskTextUpdate[]
        // Validate the structure
        return updates.filter(u =>
          typeof u.id === 'number' &&
          typeof u.originalText === 'string' &&
          typeof u.newText === 'string' &&
          u.newText.trim().length > 0
        )
      } catch (parseError) {
        console.error('Failed to parse text transform response:', textContent)
        setError('Failed to parse AI text transformations')
        return []
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      return []
    } finally {
      setIsLoading(false)
    }
  }, [apiKey])

  return {
    parseCommand,
    getMatchingTasks,
    generateTextTransforms,
    isLoading,
    error,
  }
}

function validateCategory(category: string): Category {
  if (CATEGORIES.includes(category as Category)) {
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
