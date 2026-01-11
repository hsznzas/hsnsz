import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey)
}

// Only create client if configured, otherwise create a dummy client
let supabaseInstance: SupabaseClient | null = null

export const getSupabase = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) {
    return null
  }
  
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl!, supabaseAnonKey!)
  }
  
  return supabaseInstance
}

// For backwards compatibility - will return null if not configured
export const supabase = isSupabaseConfigured() 
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : (null as unknown as SupabaseClient)
