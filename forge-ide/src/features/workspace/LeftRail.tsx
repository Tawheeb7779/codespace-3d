import { Files, GitBranch, Search } from 'lucide-react'
import { clsx } from 'clsx'
import { useWorkspaceUiStore } from '@/stores/workspaceUiStore'
import type { LeftPanel } from '@/stores/workspaceUiStore'

const ITEMS: Array<{ id: LeftPanel; icon: typeof Files; label: string }> = [
  { id: 'explorer', icon: Files, label: 'Explorer' },
  { id: 'search', icon: Search, label: 'Search' },
  { id: 'git', icon: GitBranch, label: 'Source control' },
]

export function LeftRail() {
  const leftPanel = useWorkspaceUiStore((s) => s.leftPanel)
  const toggleLeftPanel = useWorkspaceUiStore((s) => s.toggleLeftPanel)

  return (
    <div className="relative z-30 flex w-12 shrink-0 flex-col items-center gap-1 border-r border-graphite-800 bg-graphite-950 py-2">
      {ITEMS.map((item) => (
        <button
          key={item.id}
          onClick={() => toggleLeftPanel(item.id)}
          aria-label={item.label}
          title={item.label}
          aria-pressed={leftPanel === item.id}
          className={clsx(
            'flex h-10 w-10 items-center justify-center rounded-lg transition-colors duration-150',
            'active:scale-95 motion-reduce:active:scale-100',
            leftPanel === item.id
              ? 'bg-graphite-800 text-ember-400'
              : 'text-graphite-500 hover:bg-graphite-850 hover:text-graphite-200',
          )}
        >
          <item.icon size={17} />
        </button>
      ))}
    </div>
  )
}
