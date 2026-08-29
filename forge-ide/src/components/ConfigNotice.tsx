import { AlertTriangle } from 'lucide-react'

export function ConfigNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-signal-amber/30 bg-signal-amber/10 p-3 text-sm text-signal-amber">
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  )
}
