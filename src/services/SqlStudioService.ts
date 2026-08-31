import { supabase } from '@/lib/supabaseClient'
import { idbGet, idbSet } from '@/lib/idbStore'

export interface SqlQueryResult {
  rows: Record<string, unknown>[]
  rowCount: number
  durationMs: number
}

export interface SavedQuery {
  id: string
  name: string
  sql: string
  createdAt: string
}

export interface SqlHistoryEntry {
  id: string
  sql: string
  ranAt: string
  rowCount: number | null
  error: string | null
}

const HISTORY_KEY = (projectId: string) => `sql-history:${projectId}`
const SAVED_KEY = (projectId: string) => `sql-saved:${projectId}`
const HISTORY_LIMIT = 50

/**
 * Real queries against the user's own Supabase Postgres database via
 * run_readonly_query (migration 0007) — never a mock result set. That RPC
 * is SECURITY INVOKER, so every query is still subject to the same RLS
 * policies and grants the calling user already has; this client only
 * adds a fast client-side rejection for obviously-unsafe input so the
 * user gets an immediate, specific error instead of a round trip for
 * something the server would reject anyway. The server-side checks in
 * the migration are the actual security boundary, not this one.
 */
function clientSidePrecheck(sql: string): string | null {
  const trimmed = sql.trim().replace(/;\s*$/, '')
  if (!trimmed) return 'Query is empty.'
  if (trimmed.includes(';')) return 'Only a single statement is allowed (remove the extra semicolon).'
  if (!/^(select|with)\b/i.test(trimmed)) return 'Only read-only SELECT (or WITH ... SELECT) queries are allowed.'
  return null
}

export const SqlStudioService = {
  isAvailable: Boolean(supabase),

  async run(projectId: string, sql: string): Promise<SqlQueryResult> {
    const precheckError = clientSidePrecheck(sql)
    if (precheckError) throw new Error(precheckError)
    if (!supabase) throw new Error('SQL Studio requires Supabase to be configured — there is no database in local mode.')

    const started = performance.now()
    const { data, error } = await supabase.rpc('run_readonly_query', { query: sql.trim(), row_limit: 500 })
    const durationMs = performance.now() - started

    await this.pushHistory(projectId, { sql, error: error?.message ?? null, rowCount: error ? null : (data?.length ?? 0) })
    if (error) throw new Error(error.message)

    const rows = (data ?? []) as Record<string, unknown>[]
    return { rows, rowCount: rows.length, durationMs }
  },

  async history(projectId: string): Promise<SqlHistoryEntry[]> {
    return (await idbGet<SqlHistoryEntry[]>('settings', HISTORY_KEY(projectId))) ?? []
  },

  async pushHistory(projectId: string, entry: { sql: string; rowCount: number | null; error: string | null }): Promise<void> {
    const existing = await this.history(projectId)
    const next: SqlHistoryEntry[] = [
      { id: crypto.randomUUID(), sql: entry.sql, ranAt: new Date().toISOString(), rowCount: entry.rowCount, error: entry.error },
      ...existing,
    ].slice(0, HISTORY_LIMIT)
    await idbSet('settings', HISTORY_KEY(projectId), next)
  },

  async clearHistory(projectId: string): Promise<void> {
    await idbSet('settings', HISTORY_KEY(projectId), [])
  },

  async savedQueries(projectId: string): Promise<SavedQuery[]> {
    return (await idbGet<SavedQuery[]>('settings', SAVED_KEY(projectId))) ?? []
  },

  async saveQuery(projectId: string, name: string, sql: string): Promise<void> {
    const existing = await this.savedQueries(projectId)
    const next = [{ id: crypto.randomUUID(), name, sql, createdAt: new Date().toISOString() }, ...existing]
    await idbSet('settings', SAVED_KEY(projectId), next)
  },

  async deleteSavedQuery(projectId: string, id: string): Promise<void> {
    const existing = await this.savedQueries(projectId)
    await idbSet('settings', SAVED_KEY(projectId), existing.filter((q) => q.id !== id))
  },
}
