import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Spinner } from '@/components/ui/misc'

/**
 * Guards routes that need a signed-in identity.
 *
 * While the session is still being restored the gate holds rather than
 * rendering either outcome — redirecting on a not-yet-known session is what
 * makes a signed-in user briefly bounce to the login screen on refresh.
 *
 * When Supabase isn't configured the app runs in local-only mode and every
 * route is open; we never fake a signed-in session (spec §7, §62).
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status)
  const location = useLocation()

  if (status === 'local') return <>{children}</>

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-graphite-950">
        <Spinner size={24} />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    // Remember where they were headed so sign-in returns them there
    // instead of always dropping them on the dashboard.
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  return <>{children}</>
}
