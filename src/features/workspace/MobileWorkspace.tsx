import { useState } from 'react'
import { ArrowLeft, BarChart3, Bot, Code2, Database, Files, GitBranch, Image, ListTodo, MoreHorizontal, Monitor, Package, Search, TerminalSquare } from 'lucide-react'
import { clsx } from 'clsx'
import { EditorTabs } from '@/features/editor/EditorTabs'
import { MonacoEditor } from '@/features/editor/MonacoEditor'
import { FileTree } from '@/features/explorer/FileTree'
import { ProjectSearch } from '@/features/search/ProjectSearch'
import { GitPanel } from '@/features/git/GitPanel'
import { PackagesPanel } from '@/features/packages/PackagesPanel'
import { TasksPanel } from '@/features/tasks/TasksPanel'
import { SqlStudioPanel } from '@/features/sql/SqlStudioPanel'
import { AssetsPanel } from '@/features/assets/AssetsPanel'
import { AnalyticsPanel } from '@/features/analytics/AnalyticsPanel'
import { Terminal } from '@/features/terminal/Terminal'
import { Preview } from '@/features/preview/Preview'
import { AiPanel } from '@/features/ai/AiPanel'
import { useWorkspaceUiStore } from '@/stores/workspaceUiStore'
import type { MobileExtraPanel, MobileScreen } from '@/stores/workspaceUiStore'

const SCREENS: Array<{ id: MobileScreen; icon: typeof Files; label: string }> = [
  { id: 'explorer', icon: Files, label: 'Files' },
  { id: 'editor', icon: Code2, label: 'Editor' },
  { id: 'terminal', icon: TerminalSquare, label: 'Terminal' },
  { id: 'preview', icon: Monitor, label: 'Preview' },
  { id: 'ai', icon: Bot, label: 'AI' },
  { id: 'more', icon: MoreHorizontal, label: 'More' },
]

const SCREEN_INDEX = new Map(SCREENS.map((s, i) => [s.id, i]))

const EXTRA_PANELS: Array<{ id: MobileExtraPanel; icon: typeof Files; label: string }> = [
  { id: 'search', icon: Search, label: 'Search' },
  { id: 'git', icon: GitBranch, label: 'Source control' },
  { id: 'packages', icon: Package, label: 'Packages' },
  { id: 'tasks', icon: ListTodo, label: 'Tasks' },
  { id: 'sql', icon: Database, label: 'SQL Studio' },
  { id: 'assets', icon: Image, label: 'Assets' },
  { id: 'analytics', icon: BarChart3, label: 'Analytics' },
]

function MoreScreen() {
  const extraPanel = useWorkspaceUiStore((s) => s.mobileExtraPanel)
  const setExtraPanel = useWorkspaceUiStore((s) => s.setMobileExtraPanel)

  if (extraPanel) {
    const meta = EXTRA_PANELS.find((p) => p.id === extraPanel)
    return (
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center gap-2 border-b border-hairline px-3 py-2.5">
          <button onClick={() => setExtraPanel(null)} aria-label="Back to more" className="-m-1 rounded-lg p-1 text-graphite-400 hover:bg-surface-hover">
            <ArrowLeft size={16} />
          </button>
          <span className="text-[0.8125rem] font-medium text-graphite-100">{meta?.label}</span>
        </div>
        <div className="min-h-0 flex-1">
          {extraPanel === 'search' && <ProjectSearch />}
          {extraPanel === 'git' && <GitPanel />}
          {extraPanel === 'packages' && <PackagesPanel />}
          {extraPanel === 'tasks' && <TasksPanel />}
          {extraPanel === 'sql' && <SqlStudioPanel />}
          {extraPanel === 'assets' && <AssetsPanel />}
          {extraPanel === 'analytics' && <AnalyticsPanel />}
        </div>
      </div>
    )
  }

  return (
    <div className="scrollbar-thin h-full overflow-y-auto p-3">
      <p className="type-label px-1 text-graphite-600">More</p>
      <div className="mt-2 space-y-0.5">
        {EXTRA_PANELS.map((p) => (
          <button
            key={p.id}
            onClick={() => setExtraPanel(p.id)}
            className="flex w-full items-center gap-3 rounded-lg px-2.5 py-3 text-left text-[0.9375rem] text-graphite-200 hover:bg-surface-hover"
          >
            <p.icon size={17} className="text-graphite-500" />
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Editor-first, single-panel mobile experience with a bottom nav — not a
 * shrunk desktop layout (spec §41-42). Each screen is full height. The
 * desktop LeftRail has more panels than fit in a bottom nav (Search, Git,
 * Packages, Tasks, SQL Studio, Assets, Analytics) — rather than shrinking
 * them into a cramped strip of tiny icons, they live behind a "More" sheet,
 * the same drill-down pattern most mobile apps use for secondary
 * destinations.
 */
export function MobileWorkspace() {
  const screen = useWorkspaceUiStore((s) => s.mobileScreen)
  const setScreen = useWorkspaceUiStore((s) => s.setMobileScreen)

  // Direction points motion at where a screen conceptually lives in the
  // nav, rather than every switch fading in from nowhere. Tracked via the
  // render-time state-comparison pattern (not a ref mutated during render)
  // so it stays correct under StrictMode's double-invocation.
  const [nav, setNav] = useState({ screen, fromRight: true })
  if (nav.screen !== screen) {
    setNav({ screen, fromRight: (SCREEN_INDEX.get(screen) ?? 0) >= (SCREEN_INDEX.get(nav.screen) ?? 0) })
  }
  const enteringFromRight = nav.fromRight

  return (
    <div className="flex flex-1 flex-col overflow-hidden md:hidden">
      <div className="min-h-0 flex-1 overflow-hidden">
        <div
          key={screen}
          className={enteringFromRight ? 'animate-screen-from-right h-full' : 'animate-screen-from-left h-full'}
        >
          {screen === 'explorer' && <FileTree />}
          {screen === 'editor' && (
            <div className="flex h-full flex-col">
              <EditorTabs />
              <div className="min-h-0 flex-1">
                <MonacoEditor />
              </div>
            </div>
          )}
          {screen === 'terminal' && <Terminal active={screen === 'terminal'} />}
          {screen === 'preview' && <Preview />}
          {screen === 'ai' && <AiPanel />}
          {screen === 'more' && <MoreScreen />}
        </div>
      </div>

      <nav className="flex shrink-0 border-t border-hairline bg-surface-raised pb-[env(safe-area-inset-bottom)]">
        {SCREENS.map((s) => {
          const active = screen === s.id
          return (
            <button
              key={s.id}
              onClick={() => setScreen(s.id)}
              aria-current={active || undefined}
              className={clsx(
                'relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium',
                'transition-[color,transform] duration-150 active:scale-90 motion-reduce:active:scale-100',
                active && s.id === 'ai' ? 'text-signal-violet' : active ? 'text-ember-400' : 'text-graphite-500',
              )}
            >
              {/* Moving indicator rather than a static underline per tab —
                  the same "one element travels" language as the sidebar's
                  edge accent and the editor tab's top accent. The AI tab
                  gets the secondary (violet) accent instead of primary
                  orange, giving that color a clear, consistent home. */}
              {active && (
                <span
                  className={clsx('absolute inset-x-5 top-0 h-[2px] rounded-full', s.id === 'ai' ? 'bg-signal-violet' : 'bg-ember-500')}
                  aria-hidden
                />
              )}
              <s.icon size={19} />
              {s.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
