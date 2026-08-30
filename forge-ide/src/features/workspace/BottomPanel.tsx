import { clsx } from 'clsx'
import { X } from 'lucide-react'
import { Terminal } from '@/features/terminal/Terminal'
import { ProblemsPanel } from '@/features/runtime/ProblemsPanel'
import { useRuntimeStore } from '@/stores/runtimeStore'
import { useWorkspaceUiStore } from '@/stores/workspaceUiStore'

export function BottomPanel() {
  const bottomPanel = useWorkspaceUiStore((s) => s.bottomPanel)
  const setBottomPanel = useWorkspaceUiStore((s) => s.setBottomPanel)
  const errorCount = useRuntimeStore((s) => s.logs.filter((l) => l.isError).length)

  if (bottomPanel === 'hidden') return null

  return (
    // A floating card like the rest of the workspace's panels, not a strip
    // flush against the window edge with only a top border to separate it.
    <div className="surface-card animate-slide-up flex h-56 shrink-0 flex-col overflow-hidden rounded-2xl">
      {/* Segmented control rather than underlined tabs: at this scale a
          filled pill is easier to hit and to read at a glance than a 2px
          rule, and it matches the pill language used elsewhere. */}
      <div className="flex items-center justify-between gap-2 border-b border-hairline bg-surface-raised px-2 py-1.5">
        <div className="flex gap-0.5 rounded-lg bg-surface-sunken p-0.5">
          {(['terminal', 'problems'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setBottomPanel(tab)}
              aria-pressed={bottomPanel === tab}
              className={clsx(
                'rounded-[0.3125rem] px-2.5 py-1 text-[0.6875rem] font-medium capitalize tracking-[0.01em]',
                'transition-colors duration-150',
                bottomPanel === tab
                  ? 'bg-surface-hover text-graphite-50 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.06)]'
                  : 'text-graphite-500 hover:text-graphite-200',
              )}
            >
              {tab}
              {tab === 'problems' && errorCount > 0 && (
                <span className="ml-1 text-signal-red" data-numeric>
                  {errorCount}
                </span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={() => setBottomPanel('hidden')}
          className="-m-1 rounded-md p-1.5 text-graphite-500 transition-colors duration-150 hover:bg-surface-hover hover:text-graphite-100"
          aria-label="Close panel"
        >
          <X size={13} />
        </button>
      </div>
      <div className="flex-1 overflow-hidden bg-surface-sunken">
        <div className={bottomPanel === 'terminal' ? 'h-full' : 'hidden'}>
          <Terminal active={bottomPanel === 'terminal'} />
        </div>
        {bottomPanel === 'problems' && <ProblemsPanel />}
      </div>
    </div>
  )
}
