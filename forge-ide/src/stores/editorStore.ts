import { create } from 'zustand'
import type { FileSystemService } from '@/services/FileSystemService'

interface OpenTab {
  path: string
  buffer: string
  dirty: boolean
}

interface EditorState {
  tabs: OpenTab[]
  activePath: string | null
  open: (fs: FileSystemService, path: string) => void
  close: (path: string) => void
  closeAll: () => void
  closeOthers: (path: string) => void
  setActive: (path: string) => void
  updateBuffer: (path: string, content: string) => void
  save: (fs: FileSystemService, path: string) => void
  saveActive: (fs: FileSystemService) => void
  reset: () => void
}

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: [],
  activePath: null,

  open: (fs, path) => {
    const existing = get().tabs.find((t) => t.path === path)
    if (existing) {
      set({ activePath: path })
      return
    }
    const buffer = fs.exists(path) ? fs.read(path) : ''
    set((state) => ({ tabs: [...state.tabs, { path, buffer, dirty: false }], activePath: path }))
  },

  close: (path) => {
    set((state) => {
      const tabs = state.tabs.filter((t) => t.path !== path)
      const wasActive = state.activePath === path
      const activePath = wasActive ? (tabs[tabs.length - 1]?.path ?? null) : state.activePath
      return { tabs, activePath }
    })
  },

  closeAll: () => set({ tabs: [], activePath: null }),

  closeOthers: (path) => set((state) => ({ tabs: state.tabs.filter((t) => t.path === path), activePath: path })),

  setActive: (path) => set({ activePath: path }),

  updateBuffer: (path, content) => {
    set((state) => ({ tabs: state.tabs.map((t) => (t.path === path ? { ...t, buffer: content, dirty: true } : t)) }))
  },

  save: (fs, path) => {
    const tab = get().tabs.find((t) => t.path === path)
    if (!tab) return
    fs.write(path, tab.buffer)
    set((state) => ({ tabs: state.tabs.map((t) => (t.path === path ? { ...t, dirty: false } : t)) }))
  },

  saveActive: (fs) => {
    const path = get().activePath
    if (path) get().save(fs, path)
  },

  reset: () => set({ tabs: [], activePath: null }),
}))
