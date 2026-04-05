import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (typeof url !== 'string' || url.trim() === '' || typeof anonKey !== 'string' || anonKey.trim() === '') {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Add them in Vercel → Project → Settings → Environment Variables, then redeploy (Vite reads them at build time).',
  )
}

export const supabase = createClient<Database>(url, anonKey)
