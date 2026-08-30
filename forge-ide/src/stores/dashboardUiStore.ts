import { create } from 'zustand'

/**
 * UI state for the dashboard app shell (sidebar + topbar + status panel).
 * Separate from `workspaceUiStore`, which owns the IDE workspace's own
 * explorer/git/search rail — the two layouts are deliberately not sharing
 * one sidebar, since a project's file tree and the account-level nav serve
 * different tasks.
 */
interface DashboardUiState {
  sidebarOpen: boolean
  rightPanelOpen: boolean
  /** Incremented to ask the dashboard page to open its create-project dialog. */
  createProjectRequest: number
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setRightPanelOpen: (open: boolean) => void
  toggleRightPanel: () => void
  requestCreateProject: () => void
}

export const useDashboardUiStore = create<DashboardUiState>((set, get) => ({
  sidebarOpen: false,
  rightPanelOpen: false,
  createProjectRequest: 0,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
  setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
  toggleRightPanel: () => set({ rightPanelOpen: !get().rightPanelOpen }),
  requestCreateProject: () => set({ createProjectRequest: get().createProjectRequest + 1 }),
}))
