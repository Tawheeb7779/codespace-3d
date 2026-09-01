export interface UserProfile {
  id: string
  email: string | null
  displayName: string
  avatarUrl: string | null
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'local'
