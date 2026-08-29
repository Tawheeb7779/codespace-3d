import { create } from 'zustand'

export type LeftPanel = 'explorer' | 'search' | 'git' | 'hidden'
export type BottomPanel = 'terminal' | 'problems' | 'hidden'
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
}

export const useWorkspaceUiStore = create<WorkspaceUiState>((set, get) => ({
  leftPanel: 'explorer',
  rightPanelOpen: true,
  bottomPanel: 'terminal',
  mobileScreen: 'editor',
  commandPaletteOpen: false,
  aiDraftPrompt: null,

  setLeftPanel: (panel) => set({ leftPanel: panel }),
  toggleLeftPanel: (panel) => set({ leftPanel: get().leftPanel === panel ? 'hidden' : panel }),
  setBottomPanel: (panel) => set({ bottomPanel: panel }),
  toggleBottomPanel: (panel) => set({ bottomPanel: get().bottomPanel === panel ? 'hidden' : panel }),
  setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
  setMobileScreen: (screen) => set({ mobileScreen: screen }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  requestAiAction: (text) => set({ rightPanelOpen: true, mobileScreen: 'ai', aiDraftPrompt: { text, nonce: Date.now() } }),
}))
