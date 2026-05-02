import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured =
  typeof url === 'string' && url.trim() !== '' && typeof anonKey === 'string' && anonKey.trim() !== ''

export const supabase = isSupabaseConfigured
  ? createClient<Database>(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null
