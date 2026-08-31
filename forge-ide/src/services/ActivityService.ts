import { supabase } from '@/lib/supabaseClient'

export type ActivityKind = 'commit' | 'task_created' | 'task_completed' | 'runtime_start' | 'runtime_error' | 'package_changed'

export interface ActivityEntry {
  id: string
  kind: ActivityKind
  metadata: Record<string, unknown>
  createdAt: string
}

/**
 * Logs real project events into the `activities` table (migration
 * 0001_init.sql — it already existed with full RLS but nothing in the app
 * ever wrote to it). Cloud-only: local-mode projects have no persisted
 * history across sessions, so `log` is a deliberate no-op there rather
 * than a fake local log that would silently vanish and could never
 * honestly support "activity over time" — AnalyticsPanel shows a live
 * snapshot for local mode instead of pretending to have history.
 */
export const ActivityService = {
  isAvailable: Boolean(supabase),

  async log(projectId: string, actorId: string | null, kind: ActivityKind, metadata: Record<string, unknown> = {}): Promise<void> {
    if (!supabase || !actorId) return
    // Best-effort: a failed activity write should never block the real
    // action (a commit, a task update) that triggered it.
    await supabase.from('activities').insert({ project_id: projectId, actor_id: actorId, kind, metadata }).then(
      () => {},
      () => {},
    )
  },

  async recent(projectId: string, limit = 30): Promise<ActivityEntry[]> {
    if (!supabase) return []
    const { data, error } = await supabase
      .from('activities')
      .select('id, kind, metadata, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data ?? []).map((row) => ({
      id: row.id,
      kind: row.kind as ActivityKind,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      createdAt: row.created_at,
    }))
  },
}
