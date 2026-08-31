import { useEffect, useState } from 'react'
import { AlertTriangle, Files, GitCommit, ListChecks, Play } from 'lucide-react'
import { useWorkspace, useFileList } from '@/features/workspace/WorkspaceContext'
import { GitService } from '@/services/GitService'
import { TaskService } from '@/services/TaskService'
import { ActivityService } from '@/services/ActivityService'
import type { ActivityEntry, ActivityKind } from '@/services/ActivityService'
import { useDiagnosticsStore } from '@/stores/diagnosticsStore'
import { useRuntimeStore } from '@/stores/runtimeStore'
import { Spinner, EmptyState } from '@/components/ui/misc'

const ACTIVITY_LABEL: Record<ActivityKind, (m: Record<string, unknown>) => string> = {
  commit: (m) => `Committed "${m.message ?? ''}"${typeof m.filesChanged === 'number' ? ` (${m.filesChanged} file${m.filesChanged === 1 ? '' : 's'})` : ''}`,
  task_created: (m) => `Created task "${m.title ?? ''}"`,
  task_completed: (m) => `Completed task "${m.title ?? ''}"`,
  runtime_start: () => 'Started the project',
  runtime_error: (m) => `Runtime error${m.message ? `: ${m.message}` : ''}`,
  package_changed: (m) => `Package change: ${m.description ?? ''}`,
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Files; label: string; value: number | string }) {
  return (
    <div className="surface-card flex flex-col gap-1 rounded-card p-3">
      <div className="flex items-center gap-1.5 text-graphite-500">
        <Icon size={13} />
        <span className="text-[0.6875rem] font-medium uppercase tracking-[0.04em]">{label}</span>
      </div>
      <span className="type-title text-graphite-50" data-numeric>
        {value}
      </span>
    </div>
  )
}

/**
 * A real dashboard built from data this app actually has — never invented
 * numbers. Files/tasks/problems are computed live regardless of mode.
 * Commit count comes from the project's real isomorphic-git log. The
 * recent-activity feed is cloud-only (activities table, migration
 * 0001_init.sql — it already existed with full RLS but nothing wrote to
 * it before this feature): local-mode projects have no persisted event
 * history across sessions, so this shows a live snapshot there instead of
 * pretending to have a timeline it can't actually produce.
 */
export function AnalyticsPanel() {
  const { project, fs } = useWorkspace()
  const nodes = useFileList()
  const diagnosticsByPath = useDiagnosticsStore((s) => s.byPath)
  const runtimeErrorCount = useRuntimeStore((s) => s.logs.filter((l) => l.isError).length)

  const [commitCount, setCommitCount] = useState<number | null>(null)
  const [taskCounts, setTaskCounts] = useState<{ total: number; done: number } | null>(null)
  const [activity, setActivity] = useState<ActivityEntry[] | null>(null)

  useEffect(() => {
    let cancelled = false
    GitService.forProject(project.id, fs)
      .then((git) => git.log(1000))
      .then((log) => {
        if (!cancelled) setCommitCount(log.length)
      })
      .catch(() => {
        if (!cancelled) setCommitCount(0)
      })
    TaskService.list(project.id)
      .then((tasks) => {
        if (!cancelled) setTaskCounts({ total: tasks.length, done: tasks.filter((t) => t.status === 'done').length })
      })
      .catch(() => {
        if (!cancelled) setTaskCounts({ total: 0, done: 0 })
      })
    if (ActivityService.isAvailable) {
      ActivityService.recent(project.id).then((entries) => {
        if (!cancelled) setActivity(entries)
      })
    }
    return () => {
      cancelled = true
    }
  }, [project.id, fs])

  const fileCount = nodes.filter((n) => n.kind === 'file').length
  const problemCount = Object.values(diagnosticsByPath).flat().length + runtimeErrorCount

  return (
    <div className="scrollbar-thin flex h-full flex-col overflow-y-auto p-3">
      <span className="type-label text-graphite-600">
        {ActivityService.isAvailable ? 'Analytics' : 'Analytics — local snapshot'}
      </span>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <StatCard icon={Files} label="Files" value={fileCount} />
        <StatCard icon={GitCommit} label="Commits" value={commitCount ?? 0} />
        <StatCard icon={ListChecks} label="Tasks done" value={taskCounts ? `${taskCounts.done}/${taskCounts.total}` : '0/0'} />
        <StatCard icon={AlertTriangle} label="Open problems" value={problemCount} />
      </div>

      <div className="mt-4">
        <p className="type-label text-graphite-600">Recent activity</p>
        {!ActivityService.isAvailable ? (
          <div className="mt-2">
            <EmptyState
              icon={Play}
              title="No activity history in local mode"
              description="Local projects don't keep a history across sessions — the numbers above reflect this project right now. Configure Supabase to track activity over time."
            />
          </div>
        ) : activity === null ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : activity.length === 0 ? (
          <div className="mt-2">
            <EmptyState title="No activity yet" description="Commits, tasks, and runtime events will show up here." />
          </div>
        ) : (
          <div className="mt-2 space-y-0.5">
            {activity.map((entry) => (
              <div key={entry.id} className="rounded-lg px-2 py-1.5 text-xs hover:bg-surface-hover">
                <p className="text-graphite-300">{ACTIVITY_LABEL[entry.kind]?.(entry.metadata) ?? entry.kind}</p>
                <p className="mt-0.5 text-graphite-600">{new Date(entry.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
