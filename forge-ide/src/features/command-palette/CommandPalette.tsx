import { useEffect, useMemo, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { File, Search } from 'lucide-react'
import { useWorkspace, useFileList } from '@/features/workspace/WorkspaceContext'
import { useWorkspaceUiStore } from '@/stores/workspaceUiStore'
import { useEditorStore } from '@/stores/editorStore'
import { useRuntimeStore } from '@/stores/runtimeStore'

interface Command {
  id: string
  label: string
  run: () => void
}

export function CommandPalette() {
  const open = useWorkspaceUiStore((s) => s.commandPaletteOpen)
  const setOpen = useWorkspaceUiStore((s) => s.setCommandPaletteOpen)
  const { fs } = useWorkspace()
  const files = useFileList().filter((n) => n.kind === 'file')
  const [query, setQuery] = useState('')

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setOpen])

  useEffect(() => {
    if (open) setQuery('')
  }, [open])

  const commands: Command[] = useMemo(() => {
    const editor = useEditorStore.getState()
    const ui = useWorkspaceUiStore.getState()
    const runtime = useRuntimeStore.getState()
    return [
      { id: 'save', label: 'Save File', run: () => editor.activePath && editor.save(fs, editor.activePath) },
      { id: 'close-tab', label: 'Close Tab', run: () => editor.activePath && editor.close(editor.activePath) },
      { id: 'close-all', label: 'Close All Tabs', run: () => editor.closeAll() },
      { id: 'search', label: 'Search Project', run: () => ui.setLeftPanel('search') },
      { id: 'toggle-terminal', label: 'Toggle Terminal', run: () => ui.toggleBottomPanel('terminal') },
      { id: 'toggle-explorer', label: 'Toggle Explorer', run: () => ui.toggleLeftPanel('explorer') },
      { id: 'run', label: 'Run Project', run: () => runtime.run(fs) },
      { id: 'stop', label: 'Stop Project', run: () => runtime.stop() },
      { id: 'build', label: 'Build Project', run: () => runtime.run(fs) },
      { id: 'preview', label: 'Open Preview', run: () => ui.setRightPanelOpen(true) },
      { id: 'git', label: 'Git Commit', run: () => ui.setLeftPanel('git') },
      { id: 'ai', label: 'Open AI Assistant', run: () => ui.setRightPanelOpen(true) },
      { id: 'new-file', label: 'Create File', run: () => ui.setLeftPanel('explorer') },
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fs])

  const filteredCommands = commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()))
  const filteredFiles = query ? files.filter((f) => f.path.toLowerCase().includes(query.toLowerCase())).slice(0, 8) : []

  function runCommand(fn: () => void) {
    fn()
    setOpen(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-24 z-50 w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-xl border border-graphite-800 bg-graphite-900 shadow-2xl">
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <div className="flex items-center gap-2 border-b border-graphite-800 px-3 py-2.5">
            <Search size={15} className="text-graphite-500" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a command or search files…"
              className="flex-1 bg-transparent text-sm text-graphite-100 outline-none placeholder:text-graphite-500"
            />
            <kbd className="rounded bg-graphite-800 px-1.5 py-0.5 text-[10px] text-graphite-500">Esc</kbd>
          </div>
          <div className="max-h-80 overflow-y-auto scrollbar-thin p-1.5">
            {filteredFiles.map((f) => (
              <button
                key={f.path}
                onClick={() => runCommand(() => useEditorStore.getState().open(fs, f.path))}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-graphite-300 hover:bg-graphite-800"
              >
                <File size={14} className="text-graphite-500" /> {f.path}
              </button>
            ))}
            {filteredCommands.map((c) => (
              <button
                key={c.id}
                onClick={() => runCommand(c.run)}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-graphite-300 hover:bg-graphite-800"
              >
                {c.label}
              </button>
            ))}
            {filteredCommands.length === 0 && filteredFiles.length === 0 && (
              <p className="px-2.5 py-6 text-center text-sm text-graphite-600">No matches</p>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
