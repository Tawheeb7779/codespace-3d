import { AlertTriangle } from 'lucide-react'

/**
 * Marks a feature that is implemented but needs external configuration.
 * Deliberately calmer than an error: it's information, not a failure, so it
 * uses a tinted well and a hairline rather than a saturated alert block.
 */
export function ConfigNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-card border border-signal-amber/20 bg-signal-amber/[0.07] p-3.5">
      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-signal-amber" />
      <div className="text-[0.8125rem] leading-relaxed text-signal-amber/90">{children}</div>
    </div>
  )
}
