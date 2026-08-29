import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient'
import type { UserProfile } from '@/types/auth'
import type { OAuthProviderId } from '@/features/auth/providers'
import { DEFAULT_POST_AUTH_PATH, safeRedirectPath } from '@/features/auth/redirect'

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable cloud accounts.')
    this.name = 'SupabaseNotConfiguredError'
  }
}

function requireClient() {
  if (!supabase) throw new SupabaseNotConfiguredError()
  return supabase
}

export function toProfile(user: User): UserProfile {
  return {
    id: user.id,
    email: user.email ?? null,
    displayName: (user.user_metadata?.full_name as string | undefined) ?? user.email?.split('@')[0] ?? 'User',
    avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? null,
  }
}

export const AuthService = {
  isConfigured: isSupabaseConfigured,

  async getSession(): Promise<Session | null> {
    if (!supabase) return null
    const { data } = await supabase.auth.getSession()
    return data.session
  },

  onAuthStateChange(callback: (session: Session | null) => void) {
    if (!supabase) return () => {}
    const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session))
    return () => data.subscription.unsubscribe()
  },

  async signUpWithPassword(email: string, password: string) {
    const client = requireClient()
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) throw error
    return data
  },

  async signInWithPassword(email: string, password: string) {
    const client = requireClient()
    const { data, error } = await client.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  },

  /**
   * Starts a real OAuth authorization-code flow through Supabase Auth. The
   * browser is redirected to the provider; on return, Supabase's client
   * exchanges the code for a session (detectSessionInUrl) at /auth/callback.
   *
   * `next` is the in-app path to land on afterwards. It is passed through
   * the callback URL and validated there — never used to build the redirect
   * host, so it cannot be turned into an open redirect off-origin.
   */
  async signInWithOAuth(provider: OAuthProviderId, next?: string) {
    const client = requireClient()
    const callback = new URL('/auth/callback', window.location.origin)
    const target = safeRedirectPath(next)
    if (target !== DEFAULT_POST_AUTH_PATH) callback.searchParams.set('next', target)

    const { error } = await client.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callback.toString() },
    })
    if (error) throw error
  },

  async sendPasswordReset(email: string) {
    const client = requireClient()
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (error) throw error
  },

  async updatePassword(newPassword: string) {
    const client = requireClient()
    const { error } = await client.auth.updateUser({ password: newPassword })
    if (error) throw error
  },

  async signOut() {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },
}
