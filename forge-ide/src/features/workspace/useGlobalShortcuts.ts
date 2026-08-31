import { useEffect } from 'react'
import { useWorkspaceUiStore } from '@/stores/workspaceUiStore'
import { useEditorStore } from '@/stores/editorStore'
import type { FileSystemService } from '@/services/FileSystemService'

/**
 * The one place workspace-wide keyboard shortcuts are registered, so the
 * bindings and what they do can be read in a single spot instead of being
 * scattered across the components that happen to care about them.
 * shortcuts.ts documents exactly these bindings for KeyboardShortcutsPage —
 * keep the two in sync when adding or changing one. File-scoped bindings
 * (Monaco's own Ctrl/Cmd+S, its built-in find/go-to-line) stay registered
 * on the editor instance itself in MonacoEditor.tsx — they only make sense
 * with an editor focused, and Monaco's keybinding service already owns
 * that layer; duplicating them here would just create two sources of
 * truth for the same key.
 */
export function useGlobalShortcuts(fs: FileSystemService) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      const key = e.key.toLowerCase()
      const ui = useWorkspaceUiStore.getState()

      // Cmd/Ctrl+K: command palette. Cmd/Ctrl+P: quick open — this app's
      // "quick open" and "command palette" are the same surface (it lists
      // matching files ahead of actions the moment you type), so both
      // shortcuts point at it rather than maintaining two pickers.
      if (!e.shiftKey && (key === 'k' || key === 'p')) {
        e.preventDefault()
        ui.setCommandPaletteOpen(true)
        return
      }
      // Cmd/Ctrl+Shift+P: same palette, under its VS Code-familiar name.
      if (e.shiftKey && key === 'p') {
        e.preventDefault()
        ui.setCommandPaletteOpen(true)
        return
      }
      if (e.shiftKey && key === 'f') {
        e.preventDefault()
        ui.setLeftPanel('search')
        return
      }
      if (!e.shiftKey && key === 'b') {
        e.preventDefault()
        ui.toggleLeftPanel('explorer')
        return
      }
      if (!e.shiftKey && key === '`') {
        e.preventDefault()
        ui.toggleBottomPanel('terminal')
        return
      }
      if (e.shiftKey && key === 't') {
        e.preventDefault()
        useEditorStore.getState().reopenLastClosed(fs)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [fs])
}
