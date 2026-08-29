import { useEffect, useState } from 'react'
import { DiffEditor } from '@monaco-editor/react'
import { GitBranch, History, Plus, RefreshCw } from 'lucide-react'
import { clsx } from 'clsx'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { Spinner, EmptyState } from '@/components/ui/misc'
import { GitService } from '@/services/GitService'
import type { GitCommitInfo, GitFileStatus } from '@/services/GitService'
import { useWorkspace, useFileList } from '@/features/workspace/WorkspaceContext'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'
import { languageForPath } from '@/lib/languageMap'
import { useResolvedTheme } from '@/app/useThemeEffect'

const STATUS_LABEL: Record<GitFileStatus['status'], string> = {
  untracked: 'U',
  added: 'A',
  modified: 'M',
  deleted: 'D',
  unmodified: '',
}
const STATUS_COLOR: Record<GitFileStatus['status'], string> = {
  untracked: 'text-graphite-500',
  added: 'text-signal-green',
  modified: 'text-signal-amber',
  deleted: 'text-signal-red',
  unmodified: 'text-graphite-600',
}

export function GitPanel() {
  const { project, fs } = useWorkspace()
  const user = useAuthStore((s) => s.user)
  useFileList() // re-render on fs changes so status stays fresh

  const [git, setGit] = useState<GitService | null>(null)
  const [status, setStatus] = useState<GitFileStatus[]>([])
  const [log, setLog] = useState<GitCommitInfo[]>([])
  const [branch, setBranch] = useState<string>('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [diff, setDiff] = useState<{ head: string; workdir: string } | null>(null)
  const [view, setView] = useState<'changes' | 'history'>('changes')
  const resolvedTheme = useResolvedTheme()

  useEffect(() => {
    GitService.forProject(project.id, fs).then((service) => {
      setGit(service)
    })
  }, [project.id, fs])

  async function refresh(service = git) {
    if (!service) return
    setBusy(true)
    try {
      const [s, b, l] = await Promise.all([service.status(), service.currentBranch(), service.log()])
      setStatus(s)
      setBranch(b ?? 'main')
      setLog(l)
    } catch (err) {
      toast.error('Git error', err instanceof Error ? err.message : undefined)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (git) refresh(git)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [git])

  useEffect(() => {
    if (!git || !selected) {
      setDiff(null)
      return
    }
    git.diff(selected).then(setDiff)
  }, [git, selected])

  async function handleStageAll() {
    if (!git) return
    await git.stageAll()
    await refresh()
  }

  async function handleCommit() {
    if (!git || !message.trim()) return
    setBusy(true)
    try {
      await git.commit(message.trim(), { name: user?.displayName ?? 'Forge IDE User', email: user?.email ?? 'user@local' })
      setMessage('')
      toast.success('Commit created')
      await refresh()
    } catch (err) {
      toast.error('Commit failed', err instanceof Error ? err.message : undefined)
    } finally {
      setBusy(false)
    }
  }

  async function handleNewBranch() {
    if (!git) return
    const name = prompt('New branch name')
    if (!name) return
    await git.createBranch(name)
    await refresh()
  }

  if (!git) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    )
  }

  const staged = status.filter((s) => s.staged)
  const unstaged = status.filter((s) => !s.staged)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-graphite-800 px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs text-graphite-400">
          <GitBranch size={13} /> {branch}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={handleNewBranch} aria-label="New branch">
            <Plus size={13} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => refresh()} aria-label="Refresh">
            <RefreshCw size={13} className={busy ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      <div className="flex border-b border-graphite-800 text-xs">
        <button onClick={() => setView('changes')} className={clsx('flex-1 py-2', view === 'changes' ? 'border-b-2 border-ember-500 text-graphite-100' : 'text-graphite-500')}>
          Changes {status.length > 0 && `(${status.length})`}
        </button>
        <button onClick={() => setView('history')} className={clsx('flex-1 py-2', view === 'history' ? 'border-b-2 border-ember-500 text-graphite-100' : 'text-graphite-500')}>
          History
        </button>
      </div>

      {view === 'changes' ? (
        <>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {status.length === 0 ? (
              <EmptyState title="No changes" description="Your working tree is clean." />
            ) : (
              <>
                {staged.length > 0 && <SectionLabel label="Staged" />}
                {staged.map((s) => (
                  <FileRow key={s.path} file={s} selected={selected === s.path} onSelect={() => setSelected(s.path)} onToggle={() => git.unstage([s.path]).then(() => refresh())} />
                ))}
                {unstaged.length > 0 && <SectionLabel label="Changes" />}
                {unstaged.map((s) => (
                  <FileRow key={s.path} file={s} selected={selected === s.path} onSelect={() => setSelected(s.path)} onToggle={() => git.stage([s.path]).then(() => refresh())} />
                ))}
              </>
            )}
          </div>

          <div className="border-t border-graphite-800 p-3">
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Commit message" rows={2} />
            <div className="mt-2 flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={handleStageAll} disabled={unstaged.length === 0}>
                Stage all
              </Button>
              <Button variant="primary" size="sm" className="flex-1" onClick={handleCommit} disabled={!message.trim() || staged.length === 0 || busy}>
                Commit
              </Button>
            </div>
          </div>

          {selected && diff && (
            <div className="h-56 shrink-0 border-t border-graphite-800">
              <DiffEditor
                language={languageForPath(selected)}
                original={diff.head}
                modified={diff.workdir}
                theme={resolvedTheme === 'light' ? 'vs' : 'vs-dark'}
                options={{ readOnly: true, renderSideBySide: false, minimap: { enabled: false }, fontSize: 12 }}
              />
            </div>
          )}
        </>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {log.length === 0 ? (
            <EmptyState icon={History} title="No commits yet" description="Commit your changes to start a history." />
          ) : (
            log.map((commit) => (
              <div key={commit.oid} className="border-b border-graphite-900 px-3 py-2">
                <p className="text-sm text-graphite-200">{commit.message}</p>
                <p className="mt-1 text-xs text-graphite-500">
                  {commit.author} · {new Date(commit.timestamp).toLocaleString()} · {commit.oid.slice(0, 7)}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function SectionLabel({ label }: { label: string }) {
  return <p className="px-3 pt-2 text-[11px] font-medium uppercase tracking-wide text-graphite-600">{label}</p>
}

function FileRow({ file, selected, onSelect, onToggle }: { file: GitFileStatus; selected: boolean; onSelect: () => void; onToggle: () => void }) {
  return (
    <div className={clsx('flex items-center gap-2 px-3 py-1.5 text-sm', selected ? 'bg-graphite-800' : 'hover:bg-graphite-850')}>
      <button onClick={onSelect} className="min-w-0 flex-1 truncate text-left text-graphite-300">
        {file.path}
      </button>
      <span className={clsx('w-4 shrink-0 text-center text-xs font-medium', STATUS_COLOR[file.status])}>{STATUS_LABEL[file.status]}</span>
      <button onClick={onToggle} className="shrink-0 rounded px-1.5 py-0.5 text-xs text-graphite-500 hover:bg-graphite-700 hover:text-graphite-200">
        {file.staged ? '−' : '+'}
      </button>
    </div>
  )
}
