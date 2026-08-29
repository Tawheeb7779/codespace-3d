import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { FieldError } from '@/components/ui/Input'
import { AuthService } from '@/services/AuthService'
import { OAUTH_PROVIDERS } from '@/features/auth/providers'
import type { OAuthProviderId } from '@/features/auth/providers'
import { safeRedirectPath } from '@/features/auth/redirect'

/**
 * Real OAuth entry points. Clicking one starts an actual authorization-code
 * flow via Supabase Auth and navigates the browser to the provider — there
 * is no simulated success path here.
 *
 * Because a successful start ends in a full-page redirect, the pending state
 * is intentionally never cleared on success: the button stays in its loading
 * state until the browser leaves, which avoids a flash of the idle state
 * mid-navigation. It is only cleared when the call fails and we stay put.
 */
export function OAuthButtons({ disabled = false }: { disabled?: boolean }) {
  const location = useLocation()
  const [pending, setPending] = useState<OAuthProviderId | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Where to land after the round trip: whatever protected route sent the
  // user here, else the dashboard.
  const next = safeRedirectPath((location.state as { from?: string } | null)?.from)

  async function start(provider: OAuthProviderId) {
    setError(null)
    setPending(provider)
    try {
      await AuthService.signInWithOAuth(provider, next)
    } catch (err) {
      setPending(null)
      setError(
        err instanceof Error
          ? `Couldn't start sign-in: ${err.message}`
          : "Couldn't start sign-in. Please try again.",
      )
    }
  }

  return (
    <div className="space-y-3">
      {/* Full-width stacked rather than side-by-side: the auth card is
          384px, where two columns would clip these labels. */}
      <div className="grid gap-2.5">
        {OAUTH_PROVIDERS.map(({ id, label, icon: Icon }) => {
          const isPending = pending === id
          return (
            <Button
              key={id}
              type="button"
              variant="outline"
              size="lg"
              touch
              loading={isPending}
              disabled={disabled || (pending !== null && !isPending)}
              onClick={() => start(id)}
              aria-label={`Continue with ${label}`}
              className="w-full justify-center"
            >
              {!isPending && <Icon className="h-[18px] w-[18px] shrink-0" />}
              <span>{isPending ? 'Redirecting…' : `Continue with ${label}`}</span>
            </Button>
          )
        })}
      </div>

      {error && <FieldError>{error}</FieldError>}
    </div>
  )
}
