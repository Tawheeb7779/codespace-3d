import { useToastStore } from '@/stores/toastStore'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
}

const ACCENTS = {
  success: 'text-signal-green',
  error: 'text-signal-red',
  info: 'text-signal-violet',
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
            className="animate-toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-graphite-700/70 bg-graphite-850/95 p-3 shadow-lg shadow-black/40 backdrop-blur"
          >
            <Icon size={17} className={`mt-px shrink-0 ${ACCENTS[t.variant]}`} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-snug text-graphite-50">{t.title}</p>
              {t.description && <p className="mt-1 text-xs leading-relaxed text-graphite-400">{t.description}</p>}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="-m-1 shrink-0 rounded-md p-1 text-graphite-500 transition-colors hover:bg-graphite-800 hover:text-graphite-200"
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
