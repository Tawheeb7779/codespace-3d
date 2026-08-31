import { create } from 'zustand'
import type { FileSystemService } from '@/services/FileSystemService'
import { WebContainerService } from '@/services/WebContainerService'
import { useRuntimeStore } from '@/stores/runtimeStore'

interface OpenTab {
  path: string
  buffer: string
  dirty: boolean
}

interface PendingReveal {
  path: string
  line: number
  column?: number
  /** Distinguishes two requests for the same path+line (e.g. re-clicking
   *  the same search hit twice) so MonacoEditor's effect fires again. */
  nonce: number
}

/** How many recently-closed tabs "Reopen Closed Tab" can step back through. */
const CLOSED_STACK_LIMIT = 20

function pushClosed(stack: string[], paths: string[]): string[] {
  if (paths.length === 0) return stack
  return [...stack, ...paths].slice(-CLOSED_STACK_LIMIT)
}

export type SplitDirection = 'vertical' | 'horizontal'

interface EditorState {
  tabs: OpenTab[]
  activePath: string | null
  /** A second pane showing one of the same shared open tabs — not an
   *  independent editor group with its own tab set, deliberately: this
   *  keeps "which files are open" a single source of truth instead of
   *  two, while still letting two tabs be viewed side by side. `null`
   *  means no split is active. 'vertical' stacks the divider vertically
   *  (panes side by side); 'horizontal' stacks it horizontally (panes
   *  stacked top/bottom). */
  split: { path: string; direction: SplitDirection } | null
  /** A one-shot "scroll to this line" request — set by anything that opens
   *  a file at a specific line (search results, Problems panel) and
   *  consumed by MonacoEditor once it acts on it. */
  pendingReveal: PendingReveal | null
  /** Paths of recently closed tabs, most recent last. Only the path is
   *  kept — reopening re-reads the file from disk rather than restoring
   *  whatever buffer was open, since a dirty tab's close already asked
   *  the user to confirm discarding those edits. */
  closedStack: string[]
  open: (fs: FileSystemService, path: string) => void
  openAtLine: (fs: FileSystemService, path: string, line: number, column?: number) => void
  clearPendingReveal: () => void
  close: (path: string) => void
  closeAll: () => void
  closeOthers: (path: string) => void
  reopenLastClosed: (fs: FileSystemService) => void
  openSplit: (path: string, direction: SplitDirection) => void
  setSplitPath: (path: string) => void
  closeSplit: () => void
  setActive: (path: string) => void
  updateBuffer: (path: string, content: string) => void
  save: (fs: FileSystemService, path: string) => void
  saveActive: (fs: FileSystemService) => void
  reset: () => void
}

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: [],
  activePath: null,
  split: null,
  pendingReveal: null,
  closedStack: [],

  open: (fs, path) => {
    const existing = get().tabs.find((t) => t.path === path)
    if (existing) {
      set({ activePath: path })
      return
    }
    const buffer = fs.exists(path) ? fs.read(path) : ''
    set((state) => ({ tabs: [...state.tabs, { path, buffer, dirty: false }], activePath: path }))
  },

  openAtLine: (fs, path, line, column) => {
    get().open(fs, path)
    set({ pendingReveal: { path, line, column, nonce: Date.now() + Math.random() } })
  },

  clearPendingReveal: () => set({ pendingReveal: null }),

  close: (path) => {
    set((state) => {
      const tabs = state.tabs.filter((t) => t.path !== path)
      const wasActive = state.activePath === path
      const activePath = wasActive ? (tabs[tabs.length - 1]?.path ?? null) : state.activePath
      const split = state.split?.path === path ? null : state.split
      return { tabs, activePath, split, closedStack: pushClosed(state.closedStack, [path]) }
    })
  },

  closeAll: () =>
    set((state) => ({
      tabs: [],
      activePath: null,
      split: null,
      closedStack: pushClosed(state.closedStack, state.tabs.map((t) => t.path)),
    })),

  closeOthers: (path) =>
    set((state) => ({
      tabs: state.tabs.filter((t) => t.path === path),
      activePath: path,
      split: null,
      closedStack: pushClosed(state.closedStack, state.tabs.filter((t) => t.path !== path).map((t) => t.path)),
    })),

  reopenLastClosed: (fs) => {
    const stack = [...get().closedStack]
    while (stack.length > 0) {
      const path = stack.pop()!
      if (fs.exists(path) && !get().tabs.some((t) => t.path === path)) {
        set({ closedStack: stack })
        get().open(fs, path)
        return
      }
    }
    set({ closedStack: stack })
  },

  openSplit: (path, direction) => {
    if (!get().tabs.some((t) => t.path === path)) return
    set({ split: { path, direction } })
  },

  setSplitPath: (path) => {
    if (!get().tabs.some((t) => t.path === path)) return
    set((state) => (state.split ? { split: { ...state.split, path } } : state))
  },

  closeSplit: () => set({ split: null }),

  setActive: (path) => set({ activePath: path }),

  updateBuffer: (path, content) => {
    set((state) => ({ tabs: state.tabs.map((t) => (t.path === path ? { ...t, buffer: content, dirty: true } : t)) }))
  },

  save: (fs, path) => {
    const tab = get().tabs.find((t) => t.path === path)
    if (!tab) return
    fs.write(path, tab.buffer)
    set((state) => ({ tabs: state.tabs.map((t) => (t.path === path ? { ...t, dirty: false } : t)) }))

    // Keep a running WebContainer's own filesystem in sync with edits, so
    // Run/Preview reflects saved changes without needing a full re-run.
    // Only when a container is actually up (`running`) — writing here
    // before Run has ever been pressed would otherwise silently trigger a
    // WebContainer boot just from saving a file.
    if (WebContainerService.isSupported && useRuntimeStore.getState().status === 'running') {
      WebContainerService.writeFile(path, tab.buffer).catch((err) => {
        console.warn(`Failed to sync "${path}" to the running preview:`, err)
      })
    }
  },

  saveActive: (fs) => {
    const path = get().activePath
    if (path) get().save(fs, path)
  },

  reset: () => set({ tabs: [], activePath: null, split: null, pendingReveal: null, closedStack: [] }),
}))
