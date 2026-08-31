import { useEffect, useState } from 'react'
import Editor from '@monaco-editor/react'
import { Play, Save, Trash2, Download, History as HistoryIcon, Bookmark } from 'lucide-react'
import { clsx } from 'clsx'
import { useWorkspace } from '@/features/workspace/WorkspaceContext'
import { SqlStudioService } from '@/services/SqlStudioService'
import type { SqlQueryResult, SqlHistoryEntry, SavedQuery } from '@/services/SqlStudioService'
import { ConfigNotice } from '@/components/ConfigNotice'
import { Button } from '@/components/ui/Button'
import { Spinner, EmptyState } from '@/components/ui/misc'
import { useResolvedTheme } from '@/app/useThemeEffect'
import { toast } from '@/stores/toastStore'

const DEFAULT_QUERY = 'select * from projects limit 20;'

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const columns = Object.keys(rows[0])
  const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  return [columns.join(','), ...rows.map((r) => columns.map((c) => escape(r[c])).join(','))].join('\n')
}

/**
 * A real query tool against the user's own Supabase Postgres database —
 * every query actually executes via run_readonly_query (migration 0007),
 * a SECURITY INVOKER function so results are bound by the caller's own
 * RLS/grants, not a service-role bypass. Read-only by construction: the
 * server rejects anything that isn't a single SELECT/WITH statement.
 * Local-mode projects have no database at all, so this shows a real
 * CONFIGURATION REQUIRED notice rather than a fake query box.
 */
export function SqlStudioPanel() {
  const { project } = useWorkspace()
  const resolvedTheme = useResolvedTheme()
  const [sql, setSql] = useState(DEFAULT_QUERY)
  const [result, setResult] = useState<SqlQueryResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [tab, setTab] = useState<'results' | 'history' | 'saved'>('results')
  const [history, setHistory] = useState<SqlHistoryEntry[]>([])
  const [saved, setSaved] = useState<SavedQuery[]>([])

  useEffect(() => {
    SqlStudioService.history(project.id).then(setHistory)
    SqlStudioService.savedQueries(project.id).then(setSaved)
  }, [project.id])

  if (!SqlStudioService.isAvailable) {
    return (
      <div className="p-3">
        <ConfigNotice>
          SQL Studio runs read-only queries against your project's Supabase Postgres database. There is no database in
          local mode — configure Supabase to use this.
        </ConfigNotice>
      </div>
    )
  }

  async function runQuery() {
    setRunning(true)
    setError(null)
    try {
      const res = await SqlStudioService.run(project.id, sql)
      setResult(res)
      setTab('results')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Query failed')
      setResult(null)
    } finally {
      setRunning(false)
      setHistory(await SqlStudioService.history(project.id))
    }
  }

  async function handleSave() {
    const name = prompt('Name this query')
    if (!name?.trim()) return
    await SqlStudioService.saveQuery(project.id, name.trim(), sql)
    setSaved(await SqlStudioService.savedQueries(project.id))
    toast.success('Query saved')
  }

  async function handleClearHistory() {
    await SqlStudioService.clearHistory(project.id)
    setHistory([])
  }

  async function handleDeleteSaved(id: string) {
    await SqlStudioService.deleteSavedQuery(project.id, id)
    setSaved(await SqlStudioService.savedQueries(project.id))
  }

  function handleExport() {
    if (!result || result.rows.length === 0) return
    const csv = toCsv(result.rows)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.name.replace(/\W+/g, '-')}-query-results.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="type-label text-graphite-600">SQL Studio</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={handleSave} aria-label="Save query" title="Save query">
            <Save size={14} />
          </Button>
          <Button variant="primary" size="sm" onClick={runQuery} loading={running}>
            <Play size={13} /> Run
          </Button>
        </div>
      </div>

      <div className="h-32 shrink-0 border-y border-hairline">
        <Editor
          language="sql"
          value={sql}
          onChange={(v) => setSql(v ?? '')}
          theme={resolvedTheme === 'light' ? 'forge-light' : 'forge-dark'}
          options={{ fontSize: 13, minimap: { enabled: false }, lineNumbers: 'off', padding: { top: 8 }, scrollBeyondLastLine: false }}
        />
      </div>

      <div className="flex gap-0.5 border-b border-hairline bg-surface-raised px-2 py-1.5">
        {(['results', 'history', 'saved'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={clsx(
              'rounded-[0.3125rem] px-2.5 py-1 text-[0.6875rem] font-medium capitalize',
              tab === t ? 'bg-surface-hover text-graphite-50' : 'text-graphite-500 hover:text-graphite-200',
            )}
          >
            {t}
          </button>
        ))}
        {tab === 'results' && result && result.rows.length > 0 && (
          <button onClick={handleExport} className="ml-auto flex items-center gap-1 text-[0.6875rem] text-graphite-500 hover:text-graphite-200">
            <Download size={12} /> Export CSV
          </button>
        )}
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-auto">
        {tab === 'results' &&
          (error ? (
            <div className="p-3 text-xs text-signal-red">{error}</div>
          ) : running ? (
            <div className="flex h-full items-center justify-center">
              <Spinner />
            </div>
          ) : !result ? (
            <EmptyState title="No query run yet" description="Write a SELECT query above and click Run." />
          ) : result.rows.length === 0 ? (
            <EmptyState title="No rows" description={`Query ran in ${result.durationMs.toFixed(0)}ms and returned no rows.`} />
          ) : (
            <>
              <div className="px-3 py-1.5 text-[0.6875rem] text-graphite-600">
                {result.rowCount} row{result.rowCount === 1 ? '' : 's'} · {result.durationMs.toFixed(0)}ms
              </div>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    {Object.keys(result.rows[0]).map((col) => (
                      <th key={col} className="sticky top-0 border-b border-hairline bg-surface-raised px-2.5 py-1.5 text-left font-medium text-graphite-400">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, i) => (
                    <tr key={i} className="hover:bg-surface-hover">
                      {Object.keys(result.rows[0]).map((col) => (
                        <td key={col} className="whitespace-nowrap border-b border-hairline px-2.5 py-1.5 text-graphite-300">
                          {row[col] === null ? <span className="text-graphite-600">null</span> : String(row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ))}

        {tab === 'history' &&
          (history.length === 0 ? (
            <EmptyState icon={HistoryIcon} title="No history yet" description="Queries you run will show up here." />
          ) : (
            <>
              <div className="flex justify-end px-3 py-1.5">
                <button onClick={handleClearHistory} className="flex items-center gap-1 text-[0.6875rem] text-graphite-500 hover:text-signal-red">
                  <Trash2 size={12} /> Clear
                </button>
              </div>
              {history.map((h) => (
                <button
                  key={h.id}
                  onClick={() => setSql(h.sql)}
                  className="block w-full border-b border-hairline px-3 py-2 text-left hover:bg-surface-hover"
                >
                  <pre className="truncate font-mono text-xs text-graphite-300">{h.sql}</pre>
                  <p className={clsx('mt-0.5 text-[0.6875rem]', h.error ? 'text-signal-red' : 'text-graphite-600')}>
                    {new Date(h.ranAt).toLocaleTimeString()} · {h.error ?? `${h.rowCount} rows`}
                  </p>
                </button>
              ))}
            </>
          ))}

        {tab === 'saved' &&
          (saved.length === 0 ? (
            <EmptyState icon={Bookmark} title="No saved queries" description="Save a query to reuse it later." />
          ) : (
            saved.map((q) => (
              <div key={q.id} className="group flex items-start justify-between gap-2 border-b border-hairline px-3 py-2 hover:bg-surface-hover">
                <button onClick={() => setSql(q.sql)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-xs font-medium text-graphite-200">{q.name}</p>
                  <pre className="mt-0.5 truncate font-mono text-[0.6875rem] text-graphite-500">{q.sql}</pre>
                </button>
                <button
                  onClick={() => handleDeleteSaved(q.id)}
                  className="shrink-0 rounded p-1 text-graphite-600 opacity-0 hover:bg-signal-red/12 hover:text-signal-red group-hover:opacity-100"
                  aria-label={`Delete ${q.name}`}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          ))}
      </div>
    </div>
  )
}
