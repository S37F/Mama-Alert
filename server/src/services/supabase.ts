import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { validateEnv } from '@/config/env'

validateEnv()

const url = process.env.SUPABASE_URL as string
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string

export const supabaseAdmin: SupabaseClient = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
