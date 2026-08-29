import { create } from 'zustand'
import type { AuthStatus, UserProfile } from '@/types/auth'
import { AuthService, toProfile } from '@/services/AuthService'

interface AuthState {
  status: AuthStatus
  user: UserProfile | null
  initialize: () => () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  status: AuthService.isConfigured ? 'loading' : 'local',
  user: null,

  initialize: () => {
    if (!AuthService.isConfigured) {
      set({ status: 'local', user: null })
      return () => {}
    }

    AuthService.getSession().then((session) => {
      set({
        status: session ? 'authenticated' : 'unauthenticated',
        user: session ? toProfile(session.user) : null,
      })
    })

    return AuthService.onAuthStateChange((session) => {
      set({
        status: session ? 'authenticated' : 'unauthenticated',
        user: session ? toProfile(session.user) : null,
      })
    })
  },
}))
