import { clsx } from 'clsx'
import { useToastStore } from '@/stores/toastStore'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
}

const BADGES = {
  success: 'bg-signal-green/12 text-signal-green ring-signal-green/20',
  error: 'bg-signal-red/12 text-signal-red ring-signal-red/20',
  info: 'bg-signal-blue/12 text-signal-blue ring-signal-blue/20',
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  return (
    <div
      // Bottom-anchored and inset from the safe area so toasts clear the
      // mobile home indicator and the workspace's bottom navigation.
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 pb-[max(1rem,calc(env(safe-area-inset-bottom)+4.75rem))] sm:inset-x-auto sm:right-6 sm:items-end sm:pb-6"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((t) => {
        const Icon = ICONS[t.variant]
        return (
          <div
            key={t.id}
            role={t.variant === 'error' ? 'alert' : 'status'}
            aria-live={t.variant === 'error' ? 'assertive' : 'polite'}
            className={clsx(
              'surface-overlay pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-card p-3.5 backdrop-blur-xl',
              t.dismissing ? 'animate-toast-out' : 'animate-toast-in',
            )}
          >
            <span className={clsx('mt-px flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 ring-inset', BADGES[t.variant])}>
              <Icon size={14} aria-hidden />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[0.8125rem] font-medium leading-snug tracking-[-0.006em] text-graphite-50">
                {t.title}
              </p>
              {t.description && <p className="mt-1 text-xs leading-relaxed text-graphite-400">{t.description}</p>}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="-m-1 shrink-0 rounded-md p-1 text-graphite-500 transition-[background-color,color,transform] duration-150 ease-out hover:bg-surface-hover hover:text-graphite-100 active:scale-90 motion-reduce:active:scale-100"
              aria-label={`Dismiss: ${t.title}`}
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
