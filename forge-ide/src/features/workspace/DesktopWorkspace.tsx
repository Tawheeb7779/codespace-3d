import { clsx } from 'clsx'
import { LeftRail } from '@/features/workspace/LeftRail'
import { BottomPanel } from '@/features/workspace/BottomPanel'
import { FileTree } from '@/features/explorer/FileTree'
import { ProjectSearch } from '@/features/search/ProjectSearch'
import { GitPanel } from '@/features/git/GitPanel'
import { EditorTabs } from '@/features/editor/EditorTabs'
import { MonacoEditor } from '@/features/editor/MonacoEditor'
import { Preview } from '@/features/preview/Preview'
import { AiPanel } from '@/features/ai/AiPanel'
import { useWorkspaceUiStore } from '@/stores/workspaceUiStore'

/** Full 3-pane IDE layout for tablet and desktop (spec §41: "Explorer | Editor | Preview / Terminal"). */
export function DesktopWorkspace() {
  const leftPanel = useWorkspaceUiStore((s) => s.leftPanel)
  const rightPanelOpen = useWorkspaceUiStore((s) => s.rightPanelOpen)
  const setLeftPanel = useWorkspaceUiStore((s) => s.setLeftPanel)

  return (
    <div className="hidden flex-1 overflow-hidden md:flex">
      <LeftRail />

      {leftPanel !== 'hidden' && (
        <>
          <div
            className="fixed bottom-0 left-11 top-12 z-30 w-72 border-r border-graphite-800 bg-graphite-900 lg:static lg:inset-auto lg:z-auto lg:w-64 lg:shrink-0"
          >
            {leftPanel === 'explorer' && <FileTree />}
            {leftPanel === 'search' && <ProjectSearch />}
            {leftPanel === 'git' && <GitPanel />}
          </div>
          <div className="fixed inset-x-0 bottom-0 top-12 z-20 bg-black/40 lg:hidden" onClick={() => setLeftPanel('hidden')} />
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <EditorTabs />
        <div className="min-h-0 flex-1">
          <MonacoEditor />
        </div>
        <BottomPanel />
      </div>

      <div
        className={clsx(
          'shrink-0 flex-col border-l border-graphite-800 bg-graphite-900 lg:flex lg:w-96',
          rightPanelOpen ? 'fixed bottom-0 right-0 top-12 z-30 flex w-full max-w-sm lg:static lg:inset-auto lg:z-auto' : 'hidden',
        )}
      >
        <div className="h-64 shrink-0 border-b border-graphite-800 lg:h-1/2">
          <Preview />
        </div>
        <div className="min-h-0 flex-1">
          <AiPanel />
        </div>
      </div>
    </div>
  )
}
