export type Priority = 'Critical' | 'Quick Win' | 'High' | 'Medium' | 'Low'
export type Category = 'Sinjab' | 'Ajdel' | 'Personal' | 'Haseeb' | 'Raqeeb' | 'Voice Input' | 'Today' | 'Streaks'

export interface Task {
  id: number
  text: string
  category: Category
  priority: Priority
  duration: string
  completed: boolean
  waiting_for_reply?: boolean
  created_at?: string
  updated_at?: string
  completed_at?: string | null
  due_date?: string | null
  pinned_to_today?: boolean
  is_streak?: boolean
  streak_current?: number
  streak_target?: number
  user_id?: string
}

export interface TimeLog {
  id: string
  task_id: number
  start_at: string
  end_at?: string
  duration_seconds?: number
  user_id?: string
}

// Category badge colors - with dark mode support
export const CATEGORY_COLORS: Record<Category, string> = {
  'Sinjab': 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300',
  'Ajdel': 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300',
  'Personal': 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300',
  'Haseeb': 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300',
  'Raqeeb': 'bg-pink-100 dark:bg-pink-900/40 text-pink-800 dark:text-pink-300',
  'Voice Input': 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300',
  'Today': 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300',
  'Streaks': 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300',
}

// Priority colors
export const PRIORITY_COLORS: Record<Priority, string> = {
  'Critical': 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300',
  'Quick Win': 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300',
  'High': 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300',
  'Medium': 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300',
  'Low': 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
}

// Project categories (excluding special categories)
export const PROJECT_CATEGORIES: Category[] = ['Sinjab', 'Ajdel', 'Personal', 'Haseeb', 'Raqeeb']

// All categories for edit dropdown
export const CATEGORIES: Category[] = ['Sinjab', 'Ajdel', 'Personal', 'Haseeb', 'Raqeeb', 'Voice Input', 'Today', 'Streaks']

// All priorities for edit dropdown
export const PRIORITIES: Priority[] = ['Critical', 'Quick Win', 'High', 'Medium', 'Low']

// Initial 36 tasks from source
export const INITIAL_TASKS: Omit<Task, 'created_at' | 'updated_at' | 'user_id'>[] = [
  // CRITICAL PRIORITY
  { id: 1, text: "Send Financial Dashboard to Dhruv", category: "Sinjab", priority: "Critical", duration: "High Focus", completed: false },
  { id: 2, text: "Revise Ridhima/Thrive Agreement & Re-approve bookings", category: "Sinjab", priority: "Critical", duration: "Medium", completed: false },

  // QUICK WINS (Momentum Builders)
  { id: 3, text: "Fix AJDEL website ordering", category: "Ajdel", priority: "Quick Win", duration: "15m", completed: false },
  { id: 4, text: "Update links on AJDEL website", category: "Ajdel", priority: "Quick Win", duration: "15m", completed: false },
  { id: 5, text: "Subscribe to Rightbite meal plan", category: "Personal", priority: "Quick Win", duration: "10m", completed: false },
  { id: 6, text: "Buy Water & Amazon stuff", category: "Personal", priority: "Quick Win", duration: "15m", completed: false },
  { id: 7, text: "Follow up with Quinn (Replit subscription)", category: "Personal", priority: "Quick Win", duration: "10m", completed: false },
  { id: 8, text: "Follow up with Faris (Vacation)", category: "Sinjab", priority: "Quick Win", duration: "5m", completed: false },
  { id: 29, text: "Cancel bank card & order new ADIB card", category: "Personal", priority: "Quick Win", duration: "15m", completed: false },
  { id: 31, text: "Activate DIB bank Card", category: "Personal", priority: "Quick Win", duration: "15m", completed: false },
  { id: 32, text: "Contact Khalifa", category: "Personal", priority: "Quick Win", duration: "5m", completed: false },
  { id: 33, text: "Contact Abdullah and Khaled Al-Awar", category: "Personal", priority: "Quick Win", duration: "10m", completed: false },

  // DEEP WORK (Ajdel)
  { id: 9, text: "Create ad content (TikTok/Telegram)", category: "Ajdel", priority: "High", duration: "2h", completed: false },
  { id: 10, text: "Send R&R to Barry (Finance)", category: "Ajdel", priority: "High", duration: "30m", completed: false },
  { id: 11, text: "Find AI tool for campaign analysis", category: "Ajdel", priority: "Medium", duration: "Unknown", completed: false },
  { id: 12, text: "Enhance TikTok & Telegram campaigns", category: "Ajdel", priority: "Medium", duration: "Unknown", completed: false },

  // HASEEB (Dev & Admin)
  { id: 13, text: "Debug iPhone app & Deploy to TestFlight", category: "Haseeb", priority: "High", duration: "Focus", completed: false },
  { id: 14, text: "Deploy to Live Apple Account", category: "Haseeb", priority: "High", duration: "Pending Test", completed: false },
  { id: 15, text: "Apply for DUNS number + Email follow-up", category: "Haseeb", priority: "Medium", duration: "Admin", completed: false },
  { id: 16, text: "Apply for Play Store (Capacitor/Android)", category: "Haseeb", priority: "Medium", duration: "Admin", completed: false },
  { id: 17, text: "Research Telegram bot for email reminders", category: "Haseeb", priority: "Low", duration: "Research", completed: false },
  { id: 30, text: "Wispr Flow session: Brainstorm Haseeb features & analyze AI response", category: "Haseeb", priority: "Medium", duration: "Ideation", completed: false },

  // RAQEEB (Product Improvement)
  { id: 18, text: "Fix auto-transaction bugs (Mobile glitch)", category: "Raqeeb", priority: "High", duration: "Dev", completed: false },
  { id: 19, text: "Enhance AI text smartness", category: "Raqeeb", priority: "Medium", duration: "Dev", completed: false },
  { id: 20, text: "Add picture input for transactions", category: "Raqeeb", priority: "Medium", duration: "Dev", completed: false },
  { id: 21, text: "Batch enhancement analysis vs Monarch", category: "Raqeeb", priority: "Low", duration: "Analysis", completed: false },

  // SINJAB (Comms)
  { id: 22, text: "WhatsApp Replies (Mansour, Nasr, Turki, Falcons, Advertiser)", category: "Sinjab", priority: "Medium", duration: "Comms", completed: false },

  // PERSONAL (Growth & Health)
  { id: 23, text: "Establish Water + Sea Salt routine", category: "Personal", priority: "High", duration: "Routine", completed: false },
  { id: 24, text: "Watch 2 Grek YouTube episodes (Dev skills)", category: "Personal", priority: "Medium", duration: "Learning", completed: false },
  { id: 25, text: "Research Gemini CLI", category: "Personal", priority: "Low", duration: "Research", completed: false },
  { id: 26, text: "Design AI Workflow (Telegram integration)", category: "Personal", priority: "Low", duration: "Research", completed: false },
  { id: 27, text: "Design Custom Reminder Project", category: "Personal", priority: "Low", duration: "Ideation", completed: false },
  { id: 28, text: "Manage AI API usage (Sustainability)", category: "Personal", priority: "Low", duration: "Admin", completed: false },
  { id: 34, text: "Create a personal dashboard", category: "Personal", priority: "Medium", duration: "Project", completed: false },
  { id: 35, text: "Create flow for auto-social media content", category: "Personal", priority: "Medium", duration: "Automation", completed: false },
  { id: 36, text: "Create a holding company dashboard", category: "Personal", priority: "Medium", duration: "Project", completed: false },
]
