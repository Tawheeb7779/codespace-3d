import { AlertTriangle, Bot, CircleX, Info, Trash2 } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { clsx } from 'clsx'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/misc'
import { useRuntimeStore } from '@/stores/runtimeStore'
import { useWorkspaceUiStore } from '@/stores/workspaceUiStore'
import { useDiagnosticsStore } from '@/stores/diagnosticsStore'
import type { DiagnosticSeverity } from '@/stores/diagnosticsStore'
import { useEditorStore } from '@/stores/editorStore'
import { useWorkspace } from '@/features/workspace/WorkspaceContext'

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const SEVERITY_ICON: Record<DiagnosticSeverity, typeof CircleX> = {
  error: CircleX,
  warning: AlertTriangle,
  info: Info,
  hint: Info,
}
const SEVERITY_COLOR: Record<DiagnosticSeverity, string> = {
  error: 'text-signal-red',
  warning: 'text-signal-amber',
  info: 'text-signal-blue',
  hint: 'text-graphite-500',
}

export function ProblemsPanel() {
  const { logs, clearLogs } = useRuntimeStore(useShallow((s) => ({ logs: s.logs, clearLogs: s.clearLogs })))
  const requestAiAction = useWorkspaceUiStore((s) => s.requestAiAction)
  const runtimeErrors = logs.filter((l) => l.isError)
  const byPath = useDiagnosticsStore((s) => s.byPath)
  const { fs } = useWorkspace()
  const openAtLine = useEditorStore((s) => s.openAtLine)

  const diagnostics = Object.values(byPath)
    .flat()
    .filter((d) => fs.exists(d.path))
    .sort((a, b) => (a.severity === b.severity ? a.path.localeCompare(b.path) || a.line - b.line : a.severity === 'error' ? -1 : 1))

  if (runtimeErrors.length === 0 && diagnostics.length === 0) {
    return (
      <EmptyState
        title="No problems"
        description="Runtime errors from running your project, and TypeScript/JavaScript errors in files you have open, show up here."
      />
    )
  }

  return (
    <div className="scrollbar-thin flex h-full flex-col overflow-y-auto">
      {diagnostics.length > 0 && (
        <div>
          <div className="flex items-center justify-between border-b border-hairline px-3 py-1.5">
            <span className="type-label text-graphite-600">
              Code — {diagnostics.length} issue{diagnostics.length === 1 ? '' : 's'} in opened files
            </span>
          </div>
          {diagnostics.map((d) => {
            const Icon = SEVERITY_ICON[d.severity]
            return (
              <button
                key={`${d.path}:${d.line}:${d.column}:${d.message}`}
                onClick={() => openAtLine(fs, d.path, d.line, d.column)}
                className="flex w-full items-start gap-2 border-b border-hairline px-3 py-2 text-left text-xs hover:bg-surface-hover"
              >
                <Icon size={13} className={clsx('mt-0.5 shrink-0', SEVERITY_COLOR[d.severity])} />
                <div className="min-w-0 flex-1">
                  <p className="text-graphite-200">{d.message}</p>
                  <p className="mt-0.5 text-graphite-600">
                    {d.path}:{d.line}:{d.column}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {runtimeErrors.length > 0 && (
        <div>
          <div className="flex items-center justify-between border-b border-hairline px-3 py-1.5">
            <span className="type-label text-graphite-600">
              Runtime — {runtimeErrors.length} error{runtimeErrors.length === 1 ? '' : 's'}
            </span>
            <Button variant="ghost" size="sm" onClick={clearLogs}>
              <Trash2 size={13} /> Clear
            </Button>
          </div>
          <div>
            {runtimeErrors.map((entry) => (
              <div key={entry.id} className="group flex items-start justify-between gap-2 border-b border-hairline px-3 py-2 text-xs">
                <div className="min-w-0 flex-1">
                  <p className="text-graphite-600">{formatTime(entry.timestamp)}</p>
                  <pre className="mt-0.5 whitespace-pre-wrap break-words text-signal-red">{entry.text}</pre>
                </div>
                <button
                  onClick={() => requestAiAction(`This runtime error occurred:\n\n${entry.text}\n\nDiagnose and fix it.`)}
                  className="reveal-on-hover shrink-0 rounded p-1.5 text-graphite-500 opacity-0 transition-opacity hover:bg-surface-hover hover:text-ember-400 group-hover:opacity-100"
                  aria-label="Send to AI"
                  title="Send to AI"
                >
                  <Bot size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
