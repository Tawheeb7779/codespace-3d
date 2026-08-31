import { BarChart3, Database, Files, GitBranch, Image, ListTodo, Package, Search } from 'lucide-react'
import { clsx } from 'clsx'
import { useWorkspaceUiStore } from '@/stores/workspaceUiStore'
import type { LeftPanel } from '@/stores/workspaceUiStore'

const ITEMS: Array<{ id: LeftPanel; icon: typeof Files; label: string }> = [
  { id: 'explorer', icon: Files, label: 'Explorer' },
  { id: 'search', icon: Search, label: 'Search' },
  { id: 'git', icon: GitBranch, label: 'Source control' },
  { id: 'packages', icon: Package, label: 'Packages' },
  { id: 'tasks', icon: ListTodo, label: 'Tasks' },
  { id: 'sql', icon: Database, label: 'SQL Studio' },
  { id: 'assets', icon: Image, label: 'Assets' },
  { id: 'analytics', icon: BarChart3, label: 'Analytics' },
]

export function LeftRail() {
  const leftPanel = useWorkspaceUiStore((s) => s.leftPanel)
  const toggleLeftPanel = useWorkspaceUiStore((s) => s.toggleLeftPanel)

  return (
    // Its own floating surface rather than a flush strip against the
    // viewport edge — one of several panels in the workspace now composed
    // as distinct rounded cards with gaps between them, instead of one
    // continuous bordered IDE chrome.
    // z-40, above the sliding drawer's z-30: the drawer's closing animation
    // passes leftward through the rail's screen position on its way
    // offscreen, and the rail must stay clickable throughout that transit,
    // not just before/after it.
    <div className="surface-card relative z-40 flex w-14 shrink-0 flex-col items-center gap-1 rounded-2xl py-3">
      {ITEMS.map((item) => (
        <button
          key={item.id}
          onClick={() => toggleLeftPanel(item.id)}
          aria-label={item.label}
          title={item.label}
          aria-pressed={leftPanel === item.id}
          className={clsx(
            'relative flex h-10 w-10 items-center justify-center rounded-control',
            'transition-[background-color,color,transform] duration-150 ease-out',
            'active:scale-95 motion-reduce:active:scale-100',
            // The active item gets a small accent marker on the rail edge —
            // clearer than color alone at this icon size, and it survives
            // being viewed at a glance.
            leftPanel === item.id
              ? 'nav-pill-active text-ember-400 before:absolute before:-left-2.5 before:h-5 before:w-[2.5px] before:rounded-r-full before:bg-ember-500'
              : 'text-graphite-500 hover:bg-surface-raised hover:text-graphite-200',
          )}
        >
          <item.icon size={17} />
        </button>
      ))}
    </div>
  )
}
