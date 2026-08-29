import { useEffect, useRef } from 'react'
import Editor from '@monaco-editor/react'
import type { OnMount } from '@monaco-editor/react'
import { useEditorStore } from '@/stores/editorStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useWorkspace } from '@/features/workspace/WorkspaceContext'
import { languageForPath } from '@/lib/languageMap'
import { EmptyState } from '@/components/ui/misc'
import { FileCode } from 'lucide-react'

export function MonacoEditor() {
  const { fs } = useWorkspace()
  const { tabs, activePath, updateBuffer, save } = useEditorStore((s) => ({
    tabs: s.tabs,
    activePath: s.activePath,
    updateBuffer: s.updateBuffer,
    save: s.save,
  }))
  const editorSettings = useSettingsStore((s) => s.editor)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null)

  const activeTab = tabs.find((t) => t.path === activePath)

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      const path = useEditorStore.getState().activePath
      if (path) save(fs, path)
    })
  }

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
      <div className="flex h-full items-center justify-center bg-graphite-950">
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
      theme="vs-dark"
      options={{
        fontSize: editorSettings.fontSize,
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
