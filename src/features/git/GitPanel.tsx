import { useEffect, useState } from 'react'
import { DiffEditor } from '@monaco-editor/react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, ChevronDown, GitBranch, History, Plus, RefreshCw } from 'lucide-react'
import { clsx } from 'clsx'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { Spinner, EmptyState } from '@/components/ui/misc'
import { menuContentClass, menuItemClass } from '@/components/ui/menu'
import { GitService } from '@/services/GitService'
import type { GitCommitInfo, GitFileStatus } from '@/services/GitService'
import { useWorkspace, useFileList } from '@/features/workspace/WorkspaceContext'
import { useAuthStore } from '@/stores/authStore'
import { ActivityService } from '@/services/ActivityService'
import { toast } from '@/stores/toastStore'
import { languageForPath } from '@/lib/languageMap'
import { useResolvedTheme } from '@/app/useThemeEffect'
import { describeError } from '@/lib/describeError'

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
  const [branches, setBranches] = useState<string[]>([])
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
      const [s, b, l, br] = await Promise.all([service.status(), service.currentBranch(), service.log(), service.listBranches()])
      setStatus(s)
      setBranch(b ?? 'main')
      setLog(l)
      setBranches(br)
    } catch (err) {
      toast.error('Git error', describeError(err))
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
      const filesChanged = staged.length
      await git.commit(message.trim(), { name: user?.displayName ?? 'Forge IDE User', email: user?.email ?? 'user@local' })
      void ActivityService.log(project.id, user?.id ?? null, 'commit', { message: message.trim(), filesChanged })
      setMessage('')
      toast.success('Commit created')
      await refresh()
    } catch (err) {
      toast.error('Commit failed', describeError(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleNewBranch() {
    if (!git) return
    const name = prompt('New branch name')
    if (!name) return
    try {
      await git.createBranch(name)
      await refresh()
    } catch (err) {
      toast.error('Could not create branch', describeError(err))
    }
  }

  async function handleSwitchBranch(name: string) {
    if (!git || name === branch) return
    setBusy(true)
    try {
      await git.switchBranch(name)
      toast.success(`Switched to ${name}`)
      await refresh()
    } catch (err) {
      toast.error('Could not switch branch', err instanceof Error ? err.message : 'This usually means uncommitted changes conflict with that branch.')
    } finally {
      setBusy(false)
    }
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
      <div className="flex items-center justify-between border-b border-hairline px-3 py-2">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium text-graphite-400 hover:bg-surface-hover hover:text-graphite-200">
              <GitBranch size={13} /> {branch}
              {branches.length > 1 && <ChevronDown size={12} />}
            </button>
          </DropdownMenu.Trigger>
          {branches.length > 1 && (
            <DropdownMenu.Portal>
              <DropdownMenu.Content className={menuContentClass} align="start" sideOffset={4}>
                {branches.map((b) => (
                  <DropdownMenu.Item key={b} className={menuItemClass} onSelect={() => handleSwitchBranch(b)}>
                    <Check size={14} className={b === branch ? 'opacity-100' : 'opacity-0'} />
                    {b}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          )}
        </DropdownMenu.Root>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={handleNewBranch} aria-label="New branch">
            <Plus size={13} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => refresh()} aria-label="Refresh">
            <RefreshCw size={13} className={busy ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {/* Same filled-pill segmented control as the bottom panel's
          terminal/problems switch — one "switch between two views" idiom
          across the workspace instead of an underline here and a pill
          there. */}
      <div className="border-b border-hairline px-3 py-2">
        <div className="inline-flex gap-0.5 rounded-lg bg-surface-sunken p-0.5">
          {(['changes', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setView(tab)}
              aria-pressed={view === tab}
              className={clsx(
                'rounded-[0.3125rem] px-2.5 py-1 text-[0.6875rem] font-medium capitalize tracking-[0.01em]',
                'transition-colors duration-150',
                view === tab
                  ? 'bg-surface-hover text-graphite-50 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.06)]'
                  : 'text-graphite-500 hover:text-graphite-200',
              )}
            >
              {tab === 'changes' ? 'Changes' : 'History'}
              {tab === 'changes' && status.length > 0 && (
                <span className="ml-1 text-ember-400" data-numeric>
                  {status.length}
                </span>
              )}
            </button>
          ))}
        </div>
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

          <div className="border-t border-hairline p-3">
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
            <div className="h-56 shrink-0 border-t border-hairline">
              <DiffEditor
                language={languageForPath(selected)}
                original={diff.head}
                modified={diff.workdir}
                theme={resolvedTheme === 'light' ? 'forge-light' : 'forge-dark'}
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
              <div key={commit.oid} className="border-b border-hairline px-3 py-2">
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
  return <p className="type-label px-3 pt-2.5 text-graphite-600">{label}</p>
}

function FileRow({ file, selected, onSelect, onToggle }: { file: GitFileStatus; selected: boolean; onSelect: () => void; onToggle: () => void }) {
  return (
    <div
      className={clsx(
        'group flex items-center gap-2 px-3 py-1.5 text-sm transition-colors duration-150',
        selected ? 'bg-surface-hover' : 'hover:bg-surface-raised',
      )}
    >
      <button onClick={onSelect} className="min-w-0 flex-1 truncate text-left text-graphite-300">
        {file.path}
      </button>
      <span className={clsx('w-4 shrink-0 text-center text-xs font-semibold', STATUS_COLOR[file.status])}>{STATUS_LABEL[file.status]}</span>
      <button
        onClick={onToggle}
        className="shrink-0 rounded px-1.5 py-0.5 text-xs text-graphite-500 transition-[background-color,color,transform] duration-150 hover:bg-surface-overlay hover:text-graphite-200 active:scale-90 motion-reduce:active:scale-100"
      >
        {file.staged ? '−' : '+'}
      </button>
    </div>
  )
}
