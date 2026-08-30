import { Spinner } from '@/components/ui/misc'

/**
 * Neutral hold while the session is still being restored (prevents auth
 * flicker), and reused by the OAuth callback screen's own "working" phase —
 * one visual for "the app is figuring out who you are," on the same
 * ambient-lit background as the rest of auth, instead of a bare flat one.
 */
export function AuthRedirectGate({ label }: { label?: string }) {
  return (
    <div className="relative flex h-screen flex-col items-center justify-center gap-3 overflow-hidden bg-surface-base">
      <div className="ambient-glow" aria-hidden />
      <Spinner size={22} className="relative z-10" />
      {label && <p className="relative z-10 text-sm text-graphite-500">{label}</p>}
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
