import { create } from 'zustand'
import type { FileSystemService } from '@/services/FileSystemService'

interface OpenTab {
  path: string
  buffer: string
  dirty: boolean
}

interface PendingReveal {
  path: string
  line: number
  /** Distinguishes two requests for the same path+line (e.g. re-clicking
   *  the same search hit twice) so MonacoEditor's effect fires again. */
  nonce: number
}

interface EditorState {
  tabs: OpenTab[]
  activePath: string | null
  /** A one-shot "scroll to this line" request — set by anything that opens
   *  a file at a specific line (search results, Problems panel) and
   *  consumed by MonacoEditor once it acts on it. */
  pendingReveal: PendingReveal | null
  open: (fs: FileSystemService, path: string) => void
  openAtLine: (fs: FileSystemService, path: string, line: number) => void
  clearPendingReveal: () => void
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
  pendingReveal: null,

  open: (fs, path) => {
    const existing = get().tabs.find((t) => t.path === path)
    if (existing) {
      set({ activePath: path })
      return
    }
    const buffer = fs.exists(path) ? fs.read(path) : ''
    set((state) => ({ tabs: [...state.tabs, { path, buffer, dirty: false }], activePath: path }))
  },

  openAtLine: (fs, path, line) => {
    get().open(fs, path)
    set({ pendingReveal: { path, line, nonce: Date.now() + Math.random() } })
  },

  clearPendingReveal: () => set({ pendingReveal: null }),

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

  reset: () => set({ tabs: [], activePath: null, pendingReveal: null }),
}))
