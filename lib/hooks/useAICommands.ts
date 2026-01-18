'use client'

import { useState, useCallback } from 'react'
import type { Category, Priority, Task } from '@/lib/supabase/types'

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
  | 'create_list'         // Create a new project list
  | 'delete_list'         // Delete a project list
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
  // For create_list / delete_list
  listName?: string
  listColor?: string
  listIcon?: string
  // For backend_required
  backendMessage?: string
  // General
  message?: string
  error?: string
}

// Dynamic system prompt builder
function buildSystemPrompt(availableCategories: string[]): string {
  return `You are a task management assistant optimized for people with ADHD/dyslexia. Interpret natural language commands.

AVAILABLE COMMANDS:
1. ADD TASKS - Create new tasks
2. MARK DONE - Complete tasks matching criteria  
3. MARK UNDONE - Uncomplete tasks
4. DELETE TASKS - Remove tasks matching criteria
5. PIN TO TODAY - Pin tasks to Today focus list
6. UNPIN FROM TODAY - Remove from Today list
7. SET DUE DATE - Add/change due dates
8. CHANGE PRIORITY - Update priority levels
9. CHANGE CATEGORY - Move tasks between existing lists
10. EDIT TEXT - Modify task text
11. CREATE LIST - Create a new project list (returns type: "create_list")
12. DELETE LIST - Delete an empty project list (returns type: "delete_list")

CRITICAL - TASK TEXT FORMAT (for ADD TASKS):
Each task "text" MUST follow: "EMOJI SHORT_TITLE\\nDESCRIPTION"
- EMOJI: One relevant emoji at the start (📋, 🏢, 📞, 💼, 🔧, 📧, 🏠, 💰, 🎯, ✅, etc.)
- SHORT_TITLE: 2-5 words maximum, action-oriented, easy to scan
- \\n: Literal newline separating title from description
- DESCRIPTION: The detailed context

CURRENT PROJECT LISTS: ${availableCategories.join(', ')}
AVAILABLE PRIORITIES: Critical, Quick Win, High, Medium, Low

AVAILABLE COLORS for new lists: slate, red, orange, amber, yellow, lime, green, emerald, teal, cyan, sky, blue, indigo, violet, purple, fuchsia, pink, rose
AVAILABLE ICONS for new lists: folder, briefcase, user, code, target, star, heart, zap, flame, rocket, coffee, book, music, camera, mail, phone, home, settings, globe, award

FILTER OPTIONS:
- byPriority: ["Critical", "High", etc.]
- byCategory: ["Personal", "Sinjab", etc.]
- byKeyword: "search term"
- byCompleted: true/false
- all: true (for all tasks)

Respond with ONLY valid JSON (no markdown). Example responses:

For adding tasks (NOTICE THE \\n FORMAT):
{"type":"add_tasks","tasks":[{"text":"📞 Call John\\nDiscuss meeting schedule and agenda","category":"Personal","priority":"High","duration":"15m"}],"message":"Adding 1 task to Personal"}

For bulk operations:
{"type":"mark_done","filter":{"byPriority":["High","Critical"]},"message":"Marking all high priority and critical tasks as done"}

For creating a new list:
{"type":"create_list","listName":"Home Construction","listColor":"amber","listIcon":"home","message":"Creating new project list 'Home Construction'"}

For deleting a list:
{"type":"delete_list","listName":"Old Project","message":"Deleting project list 'Old Project'"}

For moving tasks between lists:
{"type":"change_category","filter":{"byCategory":["Personal"]},"newValue":{"category":"Sinjab"},"message":"Moving all Personal tasks to Sinjab"}

For unknown:
{"type":"unknown","message":"I couldn't understand that command. Try: 'Add task...', 'Mark done...', 'Delete...', 'Create list...', etc."}
`
}

export function useAICommands(apiKey: string | null, availableCategories: string[] = ['Sinjab', 'Ajdel', 'Personal', 'Haseeb', 'Raqeeb']) {
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

    const systemPrompt = buildSystemPrompt(availableCategories)

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
                  { text: systemPrompt },
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
            category: validateCategory(t.category, availableCategories),
            priority: validatePriority(t.priority),
            duration: t.duration || 'Unknown',
            dueDate: t.dueDate,
          })).filter(t => t.text)
        }

        if (result.filter) {
          if (result.filter.byCategory) {
            // Allow filtering by any category (existing or to be created)
            result.filter.byCategory = result.filter.byCategory.filter(c => 
              typeof c === 'string' && c.length > 0
            ) as Category[]
          }
          if (result.filter.byPriority) {
            result.filter.byPriority = result.filter.byPriority.filter(p =>
              ['Critical', 'Quick Win', 'High', 'Medium', 'Low'].includes(p)
            ) as Priority[]
          }
        }

        if (result.newValue?.category) {
          result.newValue.category = validateCategory(result.newValue.category, availableCategories)
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
  }, [apiKey, availableCategories])

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

  return {
    parseCommand,
    getMatchingTasks,
    isLoading,
    error,
  }
}

function validateCategory(category: string, availableCategories: string[]): Category {
  // Accept any non-empty string - categories are now dynamic
  if (typeof category === 'string' && category.trim().length > 0) {
    // If it's an existing category, use it as-is
    if (availableCategories.includes(category)) {
      return category
    }
    // For new categories, return as-is (will be created)
    return category.trim()
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
