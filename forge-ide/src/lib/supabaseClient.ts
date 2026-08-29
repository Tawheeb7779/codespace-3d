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
        // Authorization Code + PKCE rather than the legacy implicit flow:
        // the implicit flow returns access/refresh tokens directly in the
        // URL fragment, where they land in history and can leak via
        // referrers. With PKCE the redirect carries only a short-lived
        // code, which the client exchanges using a verifier that never
        // leaves this browser.
        flowType: 'pkce',
      },
    })
  : null
