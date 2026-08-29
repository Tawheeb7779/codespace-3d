import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Spinner } from '@/components/ui/misc'

/**
 * Guards routes that need a signed-in identity. When Supabase isn't
 * configured, the app runs in local-only mode and every route is open —
 * we never fake a signed-in session (spec §7, §62).
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status)

  if (status === 'local') return <>{children}</>

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-graphite-950">
        <Spinner size={24} />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
