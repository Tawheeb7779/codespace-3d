import { create } from 'zustand'

export type LeftPanel = 'explorer' | 'search' | 'git' | 'packages' | 'tasks' | 'hidden'
export type BottomPanel = 'terminal' | 'problems' | 'logs' | 'hidden'
export type MobileScreen = 'editor' | 'explorer' | 'terminal' | 'preview' | 'ai'

interface WorkspaceUiState {
  leftPanel: LeftPanel
  rightPanelOpen: boolean
  bottomPanel: BottomPanel
  mobileScreen: MobileScreen
  commandPaletteOpen: boolean
  aiDraftPrompt: { text: string; nonce: number } | null
  setLeftPanel: (panel: LeftPanel) => void
  toggleLeftPanel: (panel: LeftPanel) => void
  setBottomPanel: (panel: BottomPanel) => void
  toggleBottomPanel: (panel: BottomPanel) => void
  setRightPanelOpen: (open: boolean) => void
  setMobileScreen: (screen: MobileScreen) => void
  setCommandPaletteOpen: (open: boolean) => void
  requestAiAction: (text: string) => void
  /** Closes the side drawer after a selection, but only where it overlays content. */
  dismissOverlayPanels: () => void
}

/**
 * Below this width the side panels are overlays rather than columns, so
 * only one may be open at a time — otherwise the editor is squeezed to a
 * sliver between two drawers. Matches the `lg:` breakpoint the workspace
 * layout uses to switch from overlay to static panels.
 */
const STATIC_PANEL_BREAKPOINT = 1024

function panelsAreOverlays(): boolean {
  return typeof window !== 'undefined' && window.innerWidth < STATIC_PANEL_BREAKPOINT
}

export const useWorkspaceUiStore = create<WorkspaceUiState>((set, get) => ({
  leftPanel: 'explorer',
  // On a tablet-width screen the preview/AI column would cover the editor
  // on load, so it starts closed and is opened deliberately.
  rightPanelOpen: !panelsAreOverlays(),
  bottomPanel: 'terminal',
  mobileScreen: 'editor',
  commandPaletteOpen: false,
  aiDraftPrompt: null,

  setLeftPanel: (panel) =>
    set(panel !== 'hidden' && panelsAreOverlays() ? { leftPanel: panel, rightPanelOpen: false } : { leftPanel: panel }),
  toggleLeftPanel: (panel) => {
    const next = get().leftPanel === panel ? 'hidden' : panel
    set(next !== 'hidden' && panelsAreOverlays() ? { leftPanel: next, rightPanelOpen: false } : { leftPanel: next })
  },
  setBottomPanel: (panel) => set({ bottomPanel: panel }),
  toggleBottomPanel: (panel) => set({ bottomPanel: get().bottomPanel === panel ? 'hidden' : panel }),
  setRightPanelOpen: (open) =>
    set(open && panelsAreOverlays() ? { rightPanelOpen: true, leftPanel: 'hidden' } : { rightPanelOpen: open }),
  setMobileScreen: (screen) => set({ mobileScreen: screen }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  dismissOverlayPanels: () => {
    if (panelsAreOverlays()) set({ leftPanel: 'hidden' })
  },
  requestAiAction: (text) =>
    set({
      rightPanelOpen: true,
      // Opening the AI panel on an overlay-width screen closes the left
      // drawer, for the same reason as setRightPanelOpen.
      ...(panelsAreOverlays() ? { leftPanel: 'hidden' as LeftPanel } : {}),
      mobileScreen: 'ai',
      aiDraftPrompt: { text, nonce: Date.now() },
    }),
}))
