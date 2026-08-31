import { clsx } from 'clsx'
import { LeftRail } from '@/features/workspace/LeftRail'
import { BottomPanel } from '@/features/workspace/BottomPanel'
import { SidebarDrawer } from '@/features/workspace/SidebarDrawer'
import { FileTree } from '@/features/explorer/FileTree'
import { ProjectSearch } from '@/features/search/ProjectSearch'
import { GitPanel } from '@/features/git/GitPanel'
import { PackagesPanel } from '@/features/packages/PackagesPanel'
import { EditorTabs } from '@/features/editor/EditorTabs'
import { SplitEditor } from '@/features/editor/SplitEditor'
import { Preview } from '@/features/preview/Preview'
import { AiPanel } from '@/features/ai/AiPanel'
import { useWorkspaceUiStore } from '@/stores/workspaceUiStore'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import type { LeftPanel } from '@/stores/workspaceUiStore'

const SIDEBAR_WIDTH = 288 // matches w-72

/**
 * Full workspace layout for tablet and desktop: a set of distinct rounded
 * surfaces with gaps between them — sidebar, editor, bottom panel, right
 * panel — rather than one continuous bordered IDE shell. Below the `lg`
 * breakpoint the sidebar and right panel become overlays instead of static
 * columns, since there isn't room for three columns at once.
 */
export function DesktopWorkspace() {
  const leftPanel = useWorkspaceUiStore((s) => s.leftPanel)
  const rightPanelOpen = useWorkspaceUiStore((s) => s.rightPanelOpen)
  const setLeftPanel = useWorkspaceUiStore((s) => s.setLeftPanel)
  const setRightPanelOpen = useWorkspaceUiStore((s) => s.setRightPanelOpen)
  const isOverlay = useMediaQuery('(max-width: 1023px)')

  const leftOpen = leftPanel !== 'hidden'

  return (
    <div className="relative hidden flex-1 gap-3 overflow-hidden p-3 md:flex">
      <LeftRail />

      {isOverlay ? (
        <SidebarDrawer
          open={leftOpen}
          width={SIDEBAR_WIDTH}
          onClose={() => setLeftPanel('hidden')}
          className="surface-card absolute bottom-3 left-20 top-3 z-30 w-72 overflow-hidden rounded-2xl shadow-2xl shadow-black/40"
        >
          <SidebarPanelBody panel={leftPanel} />
        </SidebarDrawer>
      ) : (
        leftOpen && (
          <div className="surface-card w-64 shrink-0 overflow-hidden rounded-2xl">
            <SidebarPanelBody panel={leftPanel} />
          </div>
        )
      )}

      {isOverlay && leftOpen && (
        <div
          className="absolute inset-0 z-20 bg-black/40 backdrop-blur-[1px]"
          onClick={() => setLeftPanel('hidden')}
          aria-hidden
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="surface-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">
          <EditorTabs />
          <div className="min-h-0 flex-1">
            <SplitEditor />
          </div>
        </div>
        <BottomPanel />
      </div>

      {isOverlay ? (
        rightPanelOpen && (
          <>
            <div className="surface-card animate-slide-up absolute bottom-3 right-3 top-3 z-30 flex w-full max-w-sm flex-col overflow-hidden rounded-2xl shadow-2xl shadow-black/40">
              <RightPanelBody />
            </div>
            <div
              className="absolute inset-0 z-20 bg-black/40 backdrop-blur-[1px]"
              onClick={() => setRightPanelOpen(false)}
              aria-hidden
            />
          </>
        )
      ) : (
        <div
          className={clsx(
            'surface-card w-96 shrink-0 flex-col overflow-hidden rounded-2xl',
            rightPanelOpen ? 'flex' : 'hidden',
          )}
        >
          <RightPanelBody />
        </div>
      )}
    </div>
  )
}

function SidebarPanelBody({ panel }: { panel: LeftPanel }) {
  if (panel === 'explorer') return <FileTree />
  if (panel === 'search') return <ProjectSearch />
  if (panel === 'git') return <GitPanel />
  if (panel === 'packages') return <PackagesPanel />
  return null
}

function RightPanelBody() {
  return (
    <>
      <div className="h-64 shrink-0 border-b border-hairline lg:h-1/2">
        <Preview />
      </div>
      <div className="min-h-0 flex-1">
        <AiPanel />
      </div>
    </>
  )
}
