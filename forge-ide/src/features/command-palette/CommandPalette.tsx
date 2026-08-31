import { useEffect, useMemo, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import {
  File,
  FolderOpen,
  GitCommit,
  Hammer,
  History,
  Moon,
  Play,
  RotateCw,
  Save,
  Search,
  Sparkles,
  SunMedium,
  Square,
  Terminal as TerminalIcon,
  Trash2,
  X,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useWorkspace, useFileList } from '@/features/workspace/WorkspaceContext'
import { useWorkspaceUiStore } from '@/stores/workspaceUiStore'
import { useEditorStore } from '@/stores/editorStore'
import { useDiagnosticsStore } from '@/stores/diagnosticsStore'
import { useRuntimeStore } from '@/stores/runtimeStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { menuLabelClass } from '@/components/ui/menu'
import { toast } from '@/stores/toastStore'

interface Command {
  id: string
  label: string
  icon: typeof File
  run: () => void
}

/**
 * A real command menu — grouped results, one icon per row, keyboard hints —
 * rather than a plain filtered list. Files and actions are kept as two
 * labeled groups (like the sidebar's own nav/recent-projects split) so the
 * eye can tell "open this file" from "do this thing" at a glance without
 * reading every row.
 */
export function CommandPalette() {
  const open = useWorkspaceUiStore((s) => s.commandPaletteOpen)
  const setOpen = useWorkspaceUiStore((s) => s.setCommandPaletteOpen)
  const { fs } = useWorkspace()
  const files = useFileList().filter((n) => n.kind === 'file')
  const [query, setQuery] = useState('')
  const isRunning = useRuntimeStore((s) => s.status === 'running' || s.status === 'installing' || s.status === 'starting')

  // Opening this palette (Cmd/Ctrl+K, +P, +Shift+P) is registered once,
  // app-wide, in useGlobalShortcuts — not here, so there's a single place
  // that owns every keybinding instead of two. Radix's Dialog already
  // closes on Escape via onOpenChange below.

  useEffect(() => {
    if (open) setQuery('')
  }, [open])

  const [highlighted, setHighlighted] = useState(0)
  useEffect(() => {
    setHighlighted(0)
  }, [query, open])

  const commands: Command[] = useMemo(() => {
    // Action methods (editor.save, ui.setLeftPanel, ...) are stable
    // references that read live state internally, so capturing them here
    // once is fine. Data fields like activePath are NOT — a memoized
    // snapshot of `editor.activePath` stays frozen at whatever file was
    // active when this list was last recomputed, so every run() below
    // that needs "the current file" re-reads getState() fresh instead of
    // closing over the outer snapshot.
    const editor = useEditorStore.getState()
    const ui = useWorkspaceUiStore.getState()
    const runtime = useRuntimeStore.getState()
    const settings = useSettingsStore.getState()
    return [
      {
        id: 'save',
        label: 'Save File',
        icon: Save,
        run: () => {
          const path = useEditorStore.getState().activePath
          if (path) editor.save(fs, path)
        },
      },
      {
        id: 'close-tab',
        label: 'Close Tab',
        icon: X,
        run: () => {
          const path = useEditorStore.getState().activePath
          if (path) editor.close(path)
        },
      },
      { id: 'close-all', label: 'Close All Tabs', icon: X, run: () => editor.closeAll() },
      {
        id: 'close-others',
        label: 'Close Other Tabs',
        icon: X,
        run: () => {
          const path = useEditorStore.getState().activePath
          if (path) editor.closeOthers(path)
        },
      },
      { id: 'reopen-closed-tab', label: 'Reopen Closed Tab', icon: History, run: () => editor.reopenLastClosed(fs) },
      {
        id: 'delete-active-file',
        label: 'Delete Active File',
        icon: Trash2,
        run: () => {
          const path = useEditorStore.getState().activePath
          if (!path) {
            toast.error('No active file to delete')
            return
          }
          if (!confirm(`Delete "${path}"? This can't be undone.`)) return
          // fs.subscribe()'s tab-sync deliberately ignores deletions (see
          // useSyncTabsWithFs) and leaves closing the tab to the caller —
          // the same contract FileTree's own delete already follows.
          fs.delete(path)
          editor.close(path)
          useDiagnosticsStore.getState().clearPath(path)
          toast.success('File deleted', path)
        },
      },
      { id: 'search', label: 'Search Project', icon: Search, run: () => ui.setLeftPanel('search') },
      { id: 'toggle-terminal', label: 'Toggle Terminal', icon: TerminalIcon, run: () => ui.toggleBottomPanel('terminal') },
      { id: 'toggle-explorer', label: 'Toggle Explorer', icon: FolderOpen, run: () => ui.toggleLeftPanel('explorer') },
      {
        id: 'run',
        label: isRunning ? 'Stop Project' : 'Run Project',
        icon: isRunning ? Square : Play,
        run: () => (isRunning ? runtime.stop() : runtime.run(fs)),
      },
      { id: 'restart', label: 'Restart Project', icon: RotateCw, run: () => runtime.restart(fs) },
      { id: 'build', label: 'Build Project', icon: Hammer, run: () => runtime.run(fs) },
      { id: 'preview', label: 'Open Preview', icon: FolderOpen, run: () => ui.setRightPanelOpen(true) },
      { id: 'git', label: 'Git Commit', icon: GitCommit, run: () => ui.setLeftPanel('git') },
      { id: 'ai', label: 'Open AI Assistant', icon: Sparkles, run: () => ui.setRightPanelOpen(true) },
      { id: 'new-file', label: 'Create File', icon: File, run: () => ui.setLeftPanel('explorer') },
      { id: 'theme-dark', label: 'Theme: Dark', icon: Moon, run: () => settings.setTheme('dark') },
      { id: 'theme-light', label: 'Theme: Light', icon: SunMedium, run: () => settings.setTheme('light') },
      { id: 'theme-system', label: 'Theme: Match System', icon: SunMedium, run: () => settings.setTheme('system') },
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fs, isRunning])

  const filteredCommands = commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()))
  const filteredFiles = query ? files.filter((f) => f.path.toLowerCase().includes(query.toLowerCase())).slice(0, 8) : []

  // One flat, ordered list (files first, then actions) so arrow keys and
  // Enter operate on exactly what's visible, in the order it's drawn.
  const flatItems = [
    ...filteredFiles.map((f) => ({ key: f.path, run: () => useEditorStore.getState().open(fs, f.path) })),
    ...filteredCommands.map((c) => ({ key: c.id, run: c.run })),
  ]

  function runCommand(fn: () => void) {
    fn()
    setOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (flatItems.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((i) => (i + 1) % flatItems.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((i) => (i - 1 + flatItems.length) % flatItems.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = flatItems[highlighted] ?? flatItems[0]
      if (item) runCommand(item.run)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
        <Dialog.Content className="surface-overlay fixed left-1/2 top-[18vh] z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl data-[state=closed]:animate-scale-out data-[state=open]:animate-scale-in">
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <div className="flex items-center gap-2.5 border-b border-hairline px-4 py-3.5">
            <Search size={16} className="shrink-0 text-graphite-500" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a command or search files…"
              className="min-w-0 flex-1 bg-transparent text-[0.9375rem] text-graphite-100 outline-none placeholder:text-graphite-500"
            />
            <kbd className="shrink-0 rounded-md bg-surface-sunken px-1.5 py-1 text-[10px] font-medium text-graphite-500 ring-1 ring-inset ring-hairline">
              Esc
            </kbd>
          </div>

          <div className="scrollbar-thin max-h-96 overflow-y-auto p-1.5">
            {filteredFiles.length > 0 && (
              <>
                <p className={clsx(menuLabelClass, 'pt-2')}>Files</p>
                {filteredFiles.map((f, i) => (
                  <button
                    key={f.path}
                    onClick={() => runCommand(() => useEditorStore.getState().open(fs, f.path))}
                    onMouseEnter={() => setHighlighted(i)}
                    className={clsx(
                      'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[0.8125rem] text-graphite-300 transition-colors duration-100 hover:bg-surface-hover hover:text-graphite-50',
                      highlighted === i && 'bg-surface-hover text-graphite-50',
                    )}
                  >
                    <File size={14} className="shrink-0 text-graphite-500" />
                    <span className="truncate">{f.path}</span>
                  </button>
                ))}
              </>
            )}

            {filteredCommands.length > 0 && (
              <>
                <p className={clsx(menuLabelClass, filteredFiles.length > 0 && 'mt-1')}>Actions</p>
                {filteredCommands.map((c, i) => {
                  const flatIndex = filteredFiles.length + i
                  return (
                    <button
                      key={c.id}
                      onClick={() => runCommand(c.run)}
                      onMouseEnter={() => setHighlighted(flatIndex)}
                      className={clsx(
                        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[0.8125rem] text-graphite-300 transition-colors duration-100 hover:bg-surface-hover hover:text-graphite-50',
                        highlighted === flatIndex && 'bg-surface-hover text-graphite-50',
                      )}
                    >
                      <c.icon size={14} className="shrink-0 text-graphite-500" />
                      {c.label}
                    </button>
                  )
                })}
              </>
            )}

            {filteredCommands.length === 0 && filteredFiles.length === 0 && (
              <p className="px-2.5 py-8 text-center text-[0.8125rem] text-graphite-600">No matches for “{query}”</p>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
