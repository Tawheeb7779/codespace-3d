import { clsx } from 'clsx'
import { Loader2 } from 'lucide-react'

export function Spinner({ className, size = 16 }: { className?: string; size?: number }) {
  return <Loader2 size={size} className={clsx('animate-spin text-graphite-500', className)} />
}

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'violet'

/*
 * Badges are tinted fills with a matching hairline rather than outlined
 * chips: at this size a solid border competes with the label for attention.
 */
const BADGE_CLASSES: Record<BadgeVariant, string> = {
  default: 'bg-white/[0.06] text-graphite-300 ring-white/[0.08]',
  success: 'bg-signal-green/12 text-signal-green ring-signal-green/25',
  warning: 'bg-signal-amber/12 text-signal-amber ring-signal-amber/25',
  danger: 'bg-signal-red/12 text-signal-red ring-signal-red/25',
  violet: 'bg-signal-violet/12 text-signal-violet ring-signal-violet/25',
}

export function Badge({
  children,
  variant = 'default',
  className,
}: {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[0.6875rem] font-medium leading-[1.4] ring-1 ring-inset',
        BADGE_CLASSES[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx('surface-card rounded-card', className)}>{children}</div>
}

/*
 * Empty states carry real vertical presence instead of a thin dashed box —
 * an empty area should look deliberate, not broken. The icon sits in its
 * own recessed medallion so it reads as an illustration rather than a
 * stray glyph.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: React.ComponentType<{ size?: number; className?: string }>
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 rounded-card border border-hairline bg-surface-raised/40 px-6 py-16 text-center">
      {Icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-sunken ring-1 ring-inset ring-hairline">
          <Icon size={24} className="text-graphite-500" />
        </div>
      )}
      <div className="space-y-1.5">
        <p className="type-heading text-graphite-100">{title}</p>
        {description && <p className="type-body mx-auto max-w-sm text-graphite-500">{description}</p>}
      </div>
      {action}
    </div>
  )
}
