/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_API_URL: string
  readonly VITE_HELP_PHONE?: string
  readonly VITE_DEMO_SOS_TOKEN?: string
  readonly VITE_DEMO_STATUS_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
