import { useEffect } from 'react'
import type { FileSystemService } from '@/services/FileSystemService'
import { useEditorStore } from '@/stores/editorStore'
import { toast } from '@/stores/toastStore'

/**
 * Keeps open editor tabs in sync when something outside the editor (the AI
 * agent, a Git checkout) changes a file. A clean tab is refreshed silently;
 * a tab with unsaved edits is left alone and the user is warned instead —
 * we never silently overwrite in either direction (spec §28).
 */
export function useSyncTabsWithFs(fs: FileSystemService) {
  useEffect(() => {
    return fs.subscribe(() => {
      const { tabs } = useEditorStore.getState()
      for (const tab of tabs) {
        if (!fs.exists(tab.path)) continue // deletion handling is left to the explorer/tab UI
        const onDisk = fs.read(tab.path)
        if (onDisk === tab.buffer) continue

        if (tab.dirty) {
          toast.info('File changed outside the editor', `${tab.path} was modified while you had unsaved edits.`)
        } else {
          useEditorStore.setState((state) => ({
            tabs: state.tabs.map((t) => (t.path === tab.path ? { ...t, buffer: onDisk } : t)),
          }))
        }
      }
    })
  }, [fs])
}
