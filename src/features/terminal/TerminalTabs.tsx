import { Plus, X } from 'lucide-react'
import { clsx } from 'clsx'
import { useShallow } from 'zustand/react/shallow'
import { Terminal } from '@/features/terminal/Terminal'
import { useTerminalTabsStore } from '@/stores/terminalTabsStore'

/**
 * Multiple independent shells, each a real WebContainer `jsh` process
 * (spawnShell has no single-instance limit — see WebContainerService).
 * Every tab's <Terminal> stays mounted even when not shown, the same
 * "hidden, not unmounted" trick BottomPanel uses for terminal vs.
 * problems, so switching tabs never kills a running shell.
 */
export function TerminalTabs({ active }: { active: boolean }) {
  const { ids, activeId, addTerminal, closeTerminal, setActive } = useTerminalTabsStore(
    useShallow((s) => ({ ids: s.ids, activeId: s.activeId, addTerminal: s.addTerminal, closeTerminal: s.closeTerminal, setActive: s.setActive })),
  )

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-stretch gap-0.5 border-b border-hairline bg-surface-raised px-1.5 pt-1">
        {ids.map((id, i) => (
          <div
            key={id}
            onClick={() => setActive(id)}
            className={clsx(
              'group flex cursor-pointer items-center gap-1.5 rounded-t-md px-2.5 py-1.5 text-xs',
              id === activeId ? 'bg-surface-sunken text-graphite-100' : 'text-graphite-500 hover:text-graphite-300',
            )}
          >
            Terminal {i + 1}
            {ids.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  closeTerminal(id)
                }}
                aria-label={`Close terminal ${i + 1}`}
                className="rounded p-0.5 opacity-0 hover:bg-surface-hover group-hover:opacity-100"
              >
                <X size={11} />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={addTerminal}
          aria-label="New terminal"
          title="New terminal"
          className="my-auto ml-0.5 rounded-md p-1 text-graphite-500 transition-colors hover:bg-surface-hover hover:text-graphite-100"
        >
          <Plus size={13} />
        </button>
      </div>
      <div className="min-h-0 flex-1">
        {ids.map((id) => (
          <div key={id} className={id === activeId ? 'h-full' : 'hidden'}>
            <Terminal active={active && id === activeId} />
          </div>
        ))}
      </div>
    </div>
  )
}
