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

/**
 * Editor-first, single-panel mobile experience with a bottom nav — not a
 * shrunk desktop layout (spec §41-42). Each screen is full height.
 */
export function MobileWorkspace() {
  const screen = useWorkspaceUiStore((s) => s.mobileScreen)
  const setScreen = useWorkspaceUiStore((s) => s.setMobileScreen)

  return (
    <div className="flex flex-1 flex-col overflow-hidden md:hidden">
      <div className="min-h-0 flex-1">
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

      <nav className="flex shrink-0 border-t border-hairline bg-surface-raised pb-[env(safe-area-inset-bottom)]">
        {SCREENS.map((s) => (
          <button
            key={s.id}
            onClick={() => setScreen(s.id)}
            className={clsx(
              'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px]',
              screen === s.id ? 'text-ember-400' : 'text-graphite-500',
            )}
          >
            <s.icon size={19} />
            {s.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
