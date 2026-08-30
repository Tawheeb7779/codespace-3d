import { useState } from 'react'
import { Bot, Code2, Files, Monitor, TerminalSquare } from 'lucide-react'
import { clsx } from 'clsx'
import { EditorTabs } from '@/features/editor/EditorTabs'
import { MonacoEditor } from '@/features/editor/MonacoEditor'
import { FileTree } from '@/features/explorer/FileTree'
import { Terminal } from '@/features/terminal/Terminal'
import { Preview } from '@/features/preview/Preview'
import { AiPanel } from '@/features/ai/AiPanel'
import { useWorkspaceUiStore } from '@/stores/workspaceUiStore'
import type { MobileScreen } from '@/stores/workspaceUiStore'

const SCREENS: Array<{ id: MobileScreen; icon: typeof Files; label: string }> = [
  { id: 'explorer', icon: Files, label: 'Files' },
  { id: 'editor', icon: Code2, label: 'Editor' },
  { id: 'terminal', icon: TerminalSquare, label: 'Terminal' },
  { id: 'preview', icon: Monitor, label: 'Preview' },
  { id: 'ai', icon: Bot, label: 'AI' },
]

const SCREEN_INDEX = new Map(SCREENS.map((s, i) => [s.id, i]))

/**
 * Editor-first, single-panel mobile experience with a bottom nav — not a
 * shrunk desktop layout (spec §41-42). Each screen is full height.
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
                active ? 'text-ember-400' : 'text-graphite-500',
              )}
            >
              {/* Moving indicator rather than a static underline per tab —
                  the same "one element travels" language as the sidebar's
                  edge accent and the editor tab's top accent. */}
              {active && (
                <span className="absolute inset-x-5 top-0 h-[2px] rounded-full bg-ember-500" aria-hidden />
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
