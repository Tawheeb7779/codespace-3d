import { create } from 'zustand'
import type { AuthStatus, UserProfile } from '@/types/auth'
import { AuthService, toProfile } from '@/services/AuthService'

interface AuthState {
  status: AuthStatus
  user: UserProfile | null
  /** Subscribes to Supabase auth state. Returns an unsubscribe function. */
  initialize: () => () => void
  signOut: () => Promise<void>
}

/**
 * The single source of truth for who is signed in.
 *
 * `status` starts as 'loading' whenever Supabase is configured, so nothing
 * downstream has to guess between "signed out" and "not restored yet" —
 * that distinction is what prevents the login screen flashing on refresh.
 * With no Supabase project configured the app runs in 'local' mode, which
 * is a real offline mode rather than a stand-in for being signed in.
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  status: AuthService.isConfigured ? 'loading' : 'local',
  user: null,

  initialize: () => {
    if (!AuthService.isConfigured) {
      set({ status: 'local', user: null })
      return () => {}
    }

    const apply = (session: Awaited<ReturnType<typeof AuthService.getSession>>) => {
      const status: AuthStatus = session ? 'authenticated' : 'unauthenticated'
      const user = session ? toProfile(session.user) : null
      const current = get()
      // Supabase re-emits on every token refresh; skipping no-op updates
      // keeps those from re-rendering every subscriber on a timer.
      if (current.status === status && current.user?.id === user?.id) return
      set({ status, user })
    }

    // onAuthStateChange fires an initial event with the restored session,
    // and getSession() covers the case where that event is missed.
    const unsubscribe = AuthService.onAuthStateChange(apply)
    void AuthService.getSession().then(apply)

    return unsubscribe
  },

  signOut: async () => {
    await AuthService.signOut()
    // Don't wait on the auth event to clear local identity — the UI should
    // reflect the sign-out immediately.
    set({ status: 'unauthenticated', user: null })
  },
}))
