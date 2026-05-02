import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const url  = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const sb = createClient<Database>(url, anonKey, {
  auth: {
    flowType: 'implicit',
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  }
})

export type { Database }
