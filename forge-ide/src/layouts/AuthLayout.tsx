import { Link } from 'react-router-dom'
import { Flame } from 'lucide-react'

/**
 * Auth screens are composed as a single centered column: mark, then title
 * block, then controls. The card carries its own elevation rather than a
 * drawn outline, and the page behind it gets one very soft warm wash so
 * the composition has a focal point without resorting to a gradient
 * backdrop.
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
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-surface-base px-5 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))]">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ember-500/[0.07] blur-[120px]"
      />

      <div className="animate-slide-up relative w-full max-w-[26rem]">
        <Link
          to="/"
          className="mx-auto mb-9 flex w-fit items-center gap-2.5 rounded-lg text-[0.9375rem] font-semibold tracking-[-0.014em] text-graphite-50 transition-opacity duration-200 hover:opacity-70"
        >
          <Flame size={19} className="text-ember-500" />
          Forge IDE
        </Link>

        <div className="surface-card rounded-modal p-7 sm:p-8">
          <header className="mb-8">
            <h1 className="type-display text-graphite-50">{title}</h1>
            {subtitle && <p className="type-body mt-2.5 text-graphite-400">{subtitle}</p>}
          </header>
          {children}
        </div>

        {footer && <div className="mt-6 text-center">{footer}</div>}
      </div>
    </div>
  )
}
