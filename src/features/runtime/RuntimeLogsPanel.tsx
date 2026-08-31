import { useEffect, useRef } from 'react'
import { Trash2 } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/misc'
import { useRuntimeStore } from '@/stores/runtimeStore'

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

/**
 * The full install/build/dev-server output stream — not just the error
 * lines Problems filters down to. Everything WebContainer's install and
 * run commands actually printed, in order, so "why did my install hang"
 * or "what did the dev server print on boot" has a real answer.
 */
export function RuntimeLogsPanel() {
  const { logs, clearLogs } = useRuntimeStore(useShallow((s) => ({ logs: s.logs, clearLogs: s.clearLogs })))
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [logs.length])

  if (logs.length === 0) {
    return <EmptyState title="No output yet" description="Output from installing, building, or running your project will show up here." />
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-hairline px-3 py-1.5">
        <span className="text-xs text-graphite-500">{logs.length} line{logs.length === 1 ? '' : 's'}</span>
        <Button variant="ghost" size="sm" onClick={clearLogs}>
          <Trash2 size={13} /> Clear
        </Button>
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto px-3 py-2 font-mono text-xs">
        {logs.map((entry) => (
          <div key={entry.id} className="flex gap-2 py-0.5">
            <span className="shrink-0 text-graphite-700">{formatTime(entry.timestamp)}</span>
            <pre className={`whitespace-pre-wrap break-words ${entry.isError ? 'text-signal-red' : 'text-graphite-300'}`}>{entry.text}</pre>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
