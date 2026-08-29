import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { Spinner } from '@/components/ui/misc'

/**
 * Handles the redirect back from OAuth / magic-link flows. Supabase's
 * client picks the session up from the URL automatically (detectSessionInUrl)
 * — this just waits for that to resolve before routing on.
 */
export function AuthCallbackPage() {
  const [ready, setReady] = useState(false)
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    if (!supabase) {
      setReady(true)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session))
      setReady(true)
    })
  }, [])

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-graphite-950">
        <Spinner size={24} />
      </div>
    )
  }

  return <Navigate to={hasSession ? '/dashboard' : '/login'} replace />
}
