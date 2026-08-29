import { useToastStore } from '@/stores/toastStore'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
}

const ACCENTS = {
  success: 'border-signal-green/30 text-signal-green',
  error: 'border-signal-red/30 text-signal-red',
  info: 'border-signal-violet/30 text-signal-violet',
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2 sm:bottom-6 sm:right-6" aria-live="polite">
      {toasts.map((t) => {
        const Icon = ICONS[t.variant]
        return (
          <div
            key={t.id}
            role="status"
            className={`animate-slide-up flex items-start gap-3 rounded-lg border bg-graphite-850 p-3 shadow-lg shadow-black/30 ${ACCENTS[t.variant]}`}
          >
            <Icon size={18} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-graphite-50">{t.title}</p>
              {t.description && <p className="mt-0.5 text-xs text-graphite-400">{t.description}</p>}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded p-0.5 text-graphite-500 hover:text-graphite-200"
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
