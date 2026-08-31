import { useEffect, useRef } from 'react'
import Editor from '@monaco-editor/react'
import type { OnMount } from '@monaco-editor/react'
import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from '@/stores/editorStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useWorkspace } from '@/features/workspace/WorkspaceContext'
import { useResolvedTheme } from '@/app/useThemeEffect'
import { languageForPath } from '@/lib/languageMap'
import { EmptyState } from '@/components/ui/misc'
import { FileCode } from 'lucide-react'

export function MonacoEditor() {
  const { fs } = useWorkspace()
  const { tabs, activePath, updateBuffer, save, pendingReveal } = useEditorStore(
    useShallow((s) => ({
      tabs: s.tabs,
      activePath: s.activePath,
      updateBuffer: s.updateBuffer,
      save: s.save,
      pendingReveal: s.pendingReveal,
    })),
  )
  const editorSettings = useSettingsStore((s) => s.editor)
  const resolvedTheme = useResolvedTheme()
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null)

  const activeTab = tabs.find((t) => t.path === activePath)

  function revealIfPending() {
    const editor = editorRef.current
    const reveal = useEditorStore.getState().pendingReveal
    if (!editor || !reveal || reveal.path !== activeTab?.path) return
    editor.revealLineInCenter(reveal.line)
    editor.setPosition({ lineNumber: reveal.line, column: 1 })
    editor.focus()
    useEditorStore.getState().clearPendingReveal()
  }

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      const path = useEditorStore.getState().activePath
      if (path) save(fs, path)
    })
    // A fresh mount happens whenever the active file changes (the `key`
    // below), so a reveal request that opened this file needs to run here
    // too, not just from the effect — the effect's deps won't change if
    // the same reveal object was already current before Monaco finished
    // loading this instance.
    revealIfPending()
  }

  // Covers the case where the target file is already open and active
  // (no remount, since `key={activeTab.path}` doesn't change) — e.g.
  // clicking a different search hit inside the file already on screen.
  useEffect(() => {
    revealIfPending()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingReveal])

  function handleChange(value: string | undefined) {
    if (!activePath) return
    updateBuffer(activePath, value ?? '')
    if (editorSettings.autosave) {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => save(fs, activePath), editorSettings.autosaveDelayMs)
    }
  }

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
  }, [])

  if (!activeTab) {
    return (
      <div className="flex h-full items-center justify-center bg-surface-base">
        <EmptyState icon={FileCode} title="No file open" description="Select a file from the explorer to start editing." />
      </div>
    )
  }

  return (
    <Editor
      key={activeTab.path}
      path={activeTab.path}
      language={languageForPath(activeTab.path)}
      value={activeTab.buffer}
      onChange={handleChange}
      onMount={handleMount}
      theme={resolvedTheme === 'light' ? 'forge-light' : 'forge-dark'}
      options={{
        fontSize: editorSettings.fontSize,
        fontFamily: '"JetBrains Mono Variable", ui-monospace, "SF Mono", Menlo, monospace',
        tabSize: editorSettings.tabSize,
        wordWrap: editorSettings.wordWrap ? 'on' : 'off',
        minimap: { enabled: editorSettings.minimap },
        automaticLayout: true,
        smoothScrolling: true,
        cursorSmoothCaretAnimation: 'on',
        padding: { top: 12 },
      }}
    />
  )
}
