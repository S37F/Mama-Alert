/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_API_URL: string
  /** Seed patient phone for /demo “Trigger real SOS” (E.164). */
  readonly VITE_DEMO_PHONE?: string
  readonly VITE_DEMO_HOSPITAL_ID?: string
  /** When "true", /hospital web inbox is available (default: hidden; SMS-only for facilities). */
  readonly VITE_ENABLE_HOSPITAL_PORTAL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
