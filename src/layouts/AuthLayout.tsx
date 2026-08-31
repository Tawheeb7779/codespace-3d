import { useLayoutEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Flame } from 'lucide-react'
import { Spring } from '@/lib/motion/spring'

const ENTRANCE_OFFSET = 18

/**
 * Settles the whole composition into place with the same critically-damped
 * spring the rest of the app uses for non-gesture motion (drawers opening
 * from a button, not a drag) — a physically real deceleration rather than a
 * CSS ease curve standing in for one. No overshoot: per the spring's own
 * docs, overshoot is only correct when a gesture carried momentum in, and a
 * mount never has any.
 *
 * Re-runs whenever the caller changes `key` on the element this is attached
 * to (a new React mount), which is how the auth pages get a "transition"
 * between sign-in/sign-up and between form/success/error phases without any
 * shared transition machinery — it's just the entrance replaying.
 *
 * The offset/opacity are set imperatively on the DOM node (like
 * `useDrawerGesture` does for drawers) rather than through React's `style`
 * prop, so a re-render from typing in the form below doesn't stomp the
 * mid-flight value back to its start.
 */
function useEntranceSpring<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // Set synchronously before paint so the element starts already offset
    // instead of flashing at full opacity for a frame first.
    el.style.transform = `translateY(${ENTRANCE_OFFSET}px)`
    el.style.opacity = '0'
    el.style.willChange = 'transform, opacity'

    const spring = new Spring(ENTRANCE_OFFSET, { damping: 1, response: 0.5 }, (value) => {
      el.style.transform = `translateY(${value}px)`
      el.style.opacity = String(Math.max(0, Math.min(1, 1 - value / ENTRANCE_OFFSET)))
    })
    spring.setTarget(0, undefined, () => {
      el.style.willChange = ''
    })
    return () => spring.stop()
  }, [])

  return ref
}

/**
 * Auth screens as a single centered composition: brand, then a translucent
 * elevated card, then a footer link — the same layered-surface language and
 * ambient lighting as the dashboard shell, so this doesn't read as a
 * separate product bolted onto the front of it.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  const entranceRef = useEntranceSpring<HTMLDivElement>()

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-surface-base px-5 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))]">
      <div className="ambient-glow" aria-hidden />

      <div ref={entranceRef} className="relative z-10 w-full max-w-[27rem]">
        <Link
          to="/"
          className="mx-auto mb-8 flex w-fit items-center gap-2.5 rounded-lg transition-opacity duration-200 hover:opacity-70"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ember-500/12 ring-1 ring-inset ring-ember-500/20">
            <Flame size={17} className="text-ember-400" />
          </span>
          <span className="text-[0.9375rem] font-semibold tracking-[-0.016em] text-graphite-50">Forge IDE</span>
        </Link>

        <div className="surface-glass rounded-[1.75rem] p-8 sm:p-9">
          <header className="mb-8">
            <h1 className="type-display text-graphite-50">{title}</h1>
            {subtitle && <p className="type-body mt-2.5 text-graphite-400">{subtitle}</p>}
          </header>
          {children}
        </div>

        {footer && <div className="mt-7 text-center">{footer}</div>}
      </div>
    </div>
  )
}
