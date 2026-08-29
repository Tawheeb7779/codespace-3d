import { clsx } from 'clsx'
import { Loader2 } from 'lucide-react'

export function Spinner({ className, size = 16 }: { className?: string; size?: number }) {
  return <Loader2 size={size} className={clsx('animate-spin text-graphite-400', className)} />
}

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'violet'

const BADGE_CLASSES: Record<BadgeVariant, string> = {
  default: 'bg-graphite-800 text-graphite-300 border-graphite-700',
  success: 'bg-signal-green/10 text-signal-green border-signal-green/30',
  warning: 'bg-signal-amber/10 text-signal-amber border-signal-amber/30',
  danger: 'bg-signal-red/10 text-signal-red border-signal-red/30',
  violet: 'bg-signal-violet/10 text-signal-violet border-signal-violet/30',
}

export function Badge({ children, variant = 'default', className }: { children: React.ReactNode; variant?: BadgeVariant; className?: string }) {
  return (
    <span className={clsx('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium', BADGE_CLASSES[variant], className)}>
      {children}
    </span>
  )
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx('rounded-xl border border-graphite-800 bg-graphite-900/60', className)}>{children}</div>
}

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
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-graphite-800 px-6 py-16 text-center">
      {Icon && <Icon size={28} className="text-graphite-600" />}
      <div>
        <p className="text-sm font-medium text-graphite-200">{title}</p>
        {description && <p className="mt-1 max-w-sm text-sm text-graphite-500">{description}</p>}
      </div>
      {action}
    </div>
  )
}
