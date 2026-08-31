import { BarChart3, Bot, Database, Files, GitBranch, Image, ListTodo, Package, Play, Search } from 'lucide-react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { clsx } from 'clsx'
import { useWorkspaceUiStore } from '@/stores/workspaceUiStore'
import type { LeftPanel } from '@/stores/workspaceUiStore'

type RailItem = {
  id: LeftPanel | 'run' | 'ai'
  icon: typeof Files
  label: string
  /** AI is the one violet-accented destination; everything else is ember. */
  accent?: 'ember' | 'violet'
}

/*
 * Grouped, not a flat column of eight icons. Each group is a different kind
 * of work — editing the code, asking the agent, touching project data,
 * tracking the project itself — and the rule + tooltip header make that
 * legible without widening the rail into a full sidebar.
 */
const GROUPS: Array<{ name: string; items: RailItem[] }> = [
  {
    name: 'Workspace',
    items: [
      { id: 'explorer', icon: Files, label: 'Files' },
      { id: 'search', icon: Search, label: 'Search' },
      { id: 'git', icon: GitBranch, label: 'Source control' },
      { id: 'run', icon: Play, label: 'Run & Debug' },
      { id: 'packages', icon: Package, label: 'Packages' },
    ],
  },
  {
    name: 'AI',
    items: [{ id: 'ai', icon: Bot, label: 'AI Agent', accent: 'violet' }],
  },
  {
    name: 'Data',
    items: [
      { id: 'sql', icon: Database, label: 'SQL Studio' },
      { id: 'assets', icon: Image, label: 'Assets' },
    ],
  },
  {
    name: 'Project',
    items: [
      { id: 'tasks', icon: ListTodo, label: 'Tasks' },
      { id: 'analytics', icon: BarChart3, label: 'Analytics' },
    ],
  },
]

export function LeftRail() {
  const leftPanel = useWorkspaceUiStore((s) => s.leftPanel)
  const toggleLeftPanel = useWorkspaceUiStore((s) => s.toggleLeftPanel)
  const setBottomPanel = useWorkspaceUiStore((s) => s.setBottomPanel)
  const setRightPanelOpen = useWorkspaceUiStore((s) => s.setRightPanelOpen)
  const rightPanelOpen = useWorkspaceUiStore((s) => s.rightPanelOpen)

  function activate(item: RailItem) {
    // Run & Debug and AI don't own a left panel — they focus the surface
    // they actually live on, rather than being dead icons in the rail.
    if (item.id === 'run') {
      setBottomPanel('logs')
      return
    }
    if (item.id === 'ai') {
      setRightPanelOpen(true)
      return
    }
    toggleLeftPanel(item.id)
  }

  function isActive(item: RailItem) {
    if (item.id === 'ai') return rightPanelOpen
    if (item.id === 'run') return false
    return leftPanel === item.id
  }

  return (
    // Its own floating surface rather than a flush strip against the
    // viewport edge — one of several panels in the workspace now composed
    // as distinct rounded cards with gaps between them, instead of one
    // continuous bordered IDE chrome.
    // z-40, above the sliding drawer's z-30: the drawer's closing animation
    // passes leftward through the rail's screen position on its way
    // offscreen, and the rail must stay clickable throughout that transit,
    // not just before/after it.
    <Tooltip.Provider delayDuration={250}>
      <div className="surface-panel relative z-40 flex w-14 shrink-0 flex-col items-center gap-1 rounded-2xl py-3">
        {GROUPS.map((group, gi) => (
          <div key={group.name} className="flex flex-col items-center gap-1">
            {gi > 0 && <div className="rail-divider my-2" aria-hidden />}
            {group.items.map((item) => {
              const active = isActive(item)
              const violet = item.accent === 'violet'
              return (
                <Tooltip.Root key={item.id}>
                  <Tooltip.Trigger asChild>
                    <button
                      onClick={() => activate(item)}
                      aria-label={item.label}
                      aria-pressed={active}
                      className={clsx(
                        'relative flex h-10 w-10 items-center justify-center rounded-control',
                        'transition-[background-color,color,transform] duration-150 ease-out',
                        'active:scale-95 motion-reduce:active:scale-100',
                        // The active item gets a small accent marker on the rail edge —
                        // clearer than color alone at this icon size, and it survives
                        // being viewed at a glance.
                        active && violet
                          ? 'nav-pill-accent text-signal-violet before:absolute before:-left-2.5 before:h-5 before:w-[2.5px] before:rounded-r-full before:bg-signal-violet'
                          : active
                            ? 'nav-pill-active text-ember-400 before:absolute before:-left-2.5 before:h-5 before:w-[2.5px] before:rounded-r-full before:bg-ember-500'
                            : violet
                              ? 'text-graphite-500 hover:bg-signal-violet/10 hover:text-signal-violet'
                              : 'text-graphite-500 hover:bg-surface-hover hover:text-graphite-200',
                      )}
                    >
                      <item.icon size={17} />
                    </button>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      side="right"
                      sideOffset={10}
                      className="surface-overlay z-50 rounded-lg px-2.5 py-1.5 text-[0.8125rem] text-graphite-100 data-[state=closed]:animate-fade-out data-[state=delayed-open]:animate-fade-in"
                    >
                      <span className="type-label mr-2 text-graphite-500">{group.name}</span>
                      {item.label}
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              )
            })}
          </div>
        ))}
      </div>
    </Tooltip.Provider>
  )
}
