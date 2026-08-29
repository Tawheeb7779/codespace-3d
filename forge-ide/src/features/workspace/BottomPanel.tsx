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
    <div className="flex h-56 shrink-0 flex-col border-t border-graphite-800 bg-graphite-950">
      <div className="flex items-center justify-between border-b border-graphite-800 px-2">
        <div className="flex">
          {(['terminal', 'problems'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setBottomPanel(tab)}
              className={clsx(
                'px-3 py-1.5 text-xs capitalize',
                bottomPanel === tab ? 'border-b-2 border-ember-500 text-graphite-100' : 'text-graphite-500',
              )}
            >
              {tab}
              {tab === 'problems' && errorCount > 0 && <span className="ml-1 text-signal-red">({errorCount})</span>}
            </button>
          ))}
        </div>
        <button onClick={() => setBottomPanel('hidden')} className="p-1 text-graphite-500 hover:text-graphite-200" aria-label="Close panel">
          <X size={13} />
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <div className={bottomPanel === 'terminal' ? 'h-full' : 'hidden'}>
          <Terminal active={bottomPanel === 'terminal'} />
        </div>
        {bottomPanel === 'problems' && <ProblemsPanel />}
      </div>
    </div>
  )
}
