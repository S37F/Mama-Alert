import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { validateEnv } from '@/config/env'

validateEnv()

const url = process.env.SUPABASE_URL as string
const anonKey = process.env.SUPABASE_ANON_KEY as string

export const supabaseAnon: SupabaseClient = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
