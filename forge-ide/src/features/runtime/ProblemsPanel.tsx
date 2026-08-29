import { Bot, Trash2 } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/misc'
import { useRuntimeStore } from '@/stores/runtimeStore'
import { useWorkspaceUiStore } from '@/stores/workspaceUiStore'

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function ProblemsPanel() {
  const { logs, clearLogs } = useRuntimeStore(useShallow((s) => ({ logs: s.logs, clearLogs: s.clearLogs })))
  const requestAiAction = useWorkspaceUiStore((s) => s.requestAiAction)
  const errors = logs.filter((l) => l.isError)

  if (errors.length === 0) {
    return <EmptyState title="No problems" description="Runtime errors from installing, building, or running your project will show up here." />
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-hairline px-3 py-1.5">
        <span className="text-xs text-graphite-500">{errors.length} problem{errors.length === 1 ? '' : 's'}</span>
        <Button variant="ghost" size="sm" onClick={clearLogs}>
          <Trash2 size={13} /> Clear
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {errors.map((entry) => (
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
  )
}
