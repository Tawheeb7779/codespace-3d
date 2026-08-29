import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
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
 * These are the primary way most people will sign in, so they're built as
 * first-class controls rather than styled as secondary buttons: full width,
 * 48px tall, with the brand mark pinned left and the label optically
 * centered in the row. The mark keeps a fixed column so both rows align
 * with each other regardless of glyph width.
 *
 * Because a successful start ends in a full-page redirect, the pending
 * state is intentionally never cleared on success: the button stays in its
 * loading state until the browser leaves, which avoids a flash of the idle
 * state mid-navigation. It is only cleared when the call fails and we stay.
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
    <div>
      {/* Full-width stacked rather than side-by-side: the auth card is
          416px, where two columns would clip these labels. */}
      <div className="grid gap-2.5">
        {OAUTH_PROVIDERS.map(({ id, label, icon: Icon }) => {
          const isPending = pending === id
          const isDimmed = disabled || (pending !== null && !isPending)
          return (
            <button
              key={id}
              type="button"
              onClick={() => start(id)}
              disabled={isDimmed || isPending}
              aria-busy={isPending || undefined}
              aria-label={`Continue with ${label}`}
              className={clsx(
                'group relative flex h-12 w-full items-center gap-3 rounded-control px-4',
                'bg-surface-hover text-[0.9375rem] font-medium tracking-[-0.008em] text-graphite-50',
                'border border-hairline-strong',
                'shadow-[inset_0_1px_0_0_rgb(255_255_255/0.06),0_1px_2px_rgb(0_0_0/0.25)]',
                'transition-[background-color,border-color,transform,opacity] duration-150 ease-out',
                'hover:bg-surface-overlay hover:border-white/20',
                'active:scale-[0.985] motion-reduce:active:scale-100',
                'disabled:pointer-events-none disabled:opacity-45',
              )}
            >
              {/* Fixed-width mark column keeps both rows' labels aligned. */}
              <span className="flex w-5 shrink-0 items-center justify-center">
                {isPending ? (
                  <Loader2 size={18} className="animate-spin text-graphite-400" aria-hidden />
                ) : (
                  <Icon className="h-[18px] w-[18px]" />
                )}
              </span>
              <span className="flex-1 text-center">
                {isPending ? 'Redirecting…' : `Continue with ${label}`}
              </span>
              {/* Balances the mark column so the label is centered in the row. */}
              <span className="w-5 shrink-0" aria-hidden />
            </button>
          )
        })}
      </div>

      {error && <FieldError>{error}</FieldError>}
    </div>
  )
}
