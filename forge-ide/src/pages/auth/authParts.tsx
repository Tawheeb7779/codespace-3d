import { Spinner } from '@/components/ui/misc'

/** Neutral hold while the session is still being restored (prevents auth flicker). */
export function AuthRedirectGate() {
  return (
    <div className="flex h-screen items-center justify-center bg-graphite-950">
      <Spinner size={22} />
    </div>
  )
}

/** The "or" rule between OAuth and email sign-in. */
export function AuthDivider() {
  return (
    <div className="my-6 flex items-center gap-3" aria-hidden>
      <div className="h-px flex-1 bg-graphite-800" />
      <span className="text-xs text-graphite-600">or</span>
      <div className="h-px flex-1 bg-graphite-800" />
    </div>
  )
}
