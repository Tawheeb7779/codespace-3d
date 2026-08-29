import { Spinner } from '@/components/ui/misc'

/** Neutral hold while the session is still being restored (prevents auth flicker). */
export function AuthRedirectGate() {
  return (
    <div className="flex h-screen items-center justify-center bg-surface-base">
      <Spinner size={22} />
    </div>
  )
}

/**
 * The rule between OAuth and email sign-in. The line fades out toward the
 * label rather than butting into it, so the divider reads as one continuous
 * element instead of two stubs with a word between them.
 */
export function AuthDivider() {
  return (
    <div className="my-7 flex items-center gap-4" aria-hidden>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-hairline-strong" />
      <span className="text-[0.75rem] font-medium uppercase tracking-[0.08em] text-graphite-600">or</span>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-hairline-strong" />
    </div>
  )
}
