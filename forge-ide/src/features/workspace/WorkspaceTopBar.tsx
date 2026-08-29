import { Link } from 'react-router-dom'
import { ArrowLeft, Command, Loader2, Monitor, Play, Settings, Square } from 'lucide-react'
import { clsx } from 'clsx'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/misc'
import { QuickActions } from '@/features/ai/QuickActions'
import { useWorkspace } from '@/features/workspace/WorkspaceContext'
import { useRuntimeStore } from '@/stores/runtimeStore'
import { useWorkspaceUiStore } from '@/stores/workspaceUiStore'
import { useAuthStore } from '@/stores/authStore'
import { useEditorStore } from '@/stores/editorStore'
import { usePresence } from '@/features/collaboration/usePresence'
import { PresenceAvatars } from '@/features/collaboration/PresenceAvatars'

const STATUS_VARIANT = {
  idle: 'default',
  unsupported: 'warning',
  installing: 'warning',
  starting: 'warning',
  running: 'success',
  stopped: 'default',
  error: 'danger',
} as const

export function WorkspaceTopBar() {
  const { project, fs } = useWorkspace()
  const status = useRuntimeStore((s) => s.status)
  const setCommandPaletteOpen = useWorkspaceUiStore((s) => s.setCommandPaletteOpen)
  const user = useAuthStore((s) => s.user)
  const activePath = useEditorStore((s) => s.activePath)
  const presentUsers = usePresence(project.id, user, activePath)

  const isBusy = status === 'installing' || status === 'starting'
  const isRunning = status === 'running' || isBusy

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-graphite-800 bg-graphite-900 px-3">
      <div className="flex min-w-0 items-center gap-3">
        <Link to="/dashboard" className="text-graphite-500 hover:text-graphite-200" aria-label="Back to dashboard">
          <ArrowLeft size={16} />
        </Link>
        <span className="truncate text-sm font-medium text-graphite-100">{project.name}</span>
        <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>
      </div>

      <div className="flex items-center gap-1.5">
        <PresenceAvatars users={presentUsers} />
        <QuickActions />

        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="hidden items-center gap-1.5 rounded-md border border-graphite-700 px-2.5 py-1.5 text-xs text-graphite-500 hover:text-graphite-300 sm:flex"
        >
          <Command size={12} /> K
        </button>

        {isRunning ? (
          <Button variant="outline" size="sm" onClick={() => useRuntimeStore.getState().stop()} disabled={isBusy}>
            {isBusy ? <Loader2 size={14} className="animate-spin" /> : <Square size={14} />} Stop
          </Button>
        ) : (
          <Button variant="primary" size="sm" onClick={() => useRuntimeStore.getState().run(fs)}>
            <Play size={14} /> Run
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => useWorkspaceUiStore.getState().setRightPanelOpen(!useWorkspaceUiStore.getState().rightPanelOpen)}
          aria-label="Toggle preview & AI panel"
          className={clsx('hidden md:inline-flex')}
        >
          <Monitor size={15} />
        </Button>

        <Link to="/settings">
          <Button variant="ghost" size="icon" aria-label="Settings">
            <Settings size={15} />
          </Button>
        </Link>
      </div>
    </header>
  )
}
