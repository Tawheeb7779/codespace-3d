import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

/**
 * Real Supabase client. `null` when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
 * aren't set — callers must check `isSupabaseConfigured` and fall back to
 * local-only behavior rather than pretending to be signed in (spec §7, §62).
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null
