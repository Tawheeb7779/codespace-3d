import { useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { Spinner } from '@/components/ui/misc'
import { Button } from '@/components/ui/Button'
import { AuthLayout } from '@/layouts/AuthLayout'
import { safeRedirectPath } from '@/features/auth/redirect'

type CallbackState =
  | { phase: 'working' }
  | { phase: 'done'; next: string }
  | { phase: 'cancelled' }
  | { phase: 'failed'; message: string }

/**
 * Lands the OAuth round trip. Supabase's client exchanges the code for a
 * session automatically (detectSessionInUrl), so this screen's job is to
 * wait for that to resolve and to handle the paths that aren't success:
 * the user declining consent at the provider, and provider/config errors.
 *
 * Providers report failures either in the query string or the URL fragment
 * depending on the response mode, so both are checked.
 */
export function AuthCallbackPage() {
  const [params] = useSearchParams()
  const [state, setState] = useState<CallbackState>({ phase: 'working' })

  useEffect(() => {
    if (!supabase) {
      setState({ phase: 'failed', message: 'Supabase is not configured for this deployment.' })
      return
    }

    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const errorCode = params.get('error') ?? hashParams.get('error')
    const errorDescription = params.get('error_description') ?? hashParams.get('error_description')

    if (errorCode) {
      // The provider's own "cancel"/"deny" outcome — not a failure worth
      // showing as an error state.
      if (errorCode === 'access_denied') {
        setState({ phase: 'cancelled' })
      } else {
        setState({ phase: 'failed', message: errorDescription ?? `Sign-in failed (${errorCode}).` })
      }
      return
    }

    let cancelled = false
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setState({ phase: 'failed', message: error.message })
          return
        }
        if (!data.session) {
          setState({
            phase: 'failed',
            message: 'The sign-in link was missing or has already been used. Please try signing in again.',
          })
          return
        }
        // Only same-origin in-app paths are honoured, so a tampered
        // ?next= can't bounce the user to another site after login.
        setState({ phase: 'done', next: safeRedirectPath(params.get('next')) })
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({ phase: 'failed', message: err instanceof Error ? err.message : 'Sign-in failed.' })
        }
      })

    return () => {
      cancelled = true
    }
  }, [params])

  if (state.phase === 'done') return <Navigate to={state.next} replace />

  if (state.phase === 'working') {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-surface-base">
        <Spinner size={22} />
        <p className="text-sm text-graphite-500">Completing sign-in…</p>
      </div>
    )
  }

  const cancelled = state.phase === 'cancelled'

  return (
    <AuthLayout
      title={cancelled ? 'Sign-in cancelled' : 'Sign-in failed'}
      subtitle={
        cancelled
          ? 'You cancelled the request at the provider, so no account was connected.'
          : undefined
      }
    >
      {!cancelled && (
        <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-signal-red/30 bg-signal-red/10 p-3 text-sm text-signal-red">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <p>{state.message}</p>
        </div>
      )}
      <Link to="/login" className="block">
        <Button variant="primary" size="lg" touch className="w-full">
          Back to sign in
        </Button>
      </Link>
    </AuthLayout>
  )
}
