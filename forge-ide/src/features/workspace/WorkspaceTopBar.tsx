import { Link } from 'react-router-dom'
import { ArrowLeft, Command, Loader2, Monitor, Play, Settings, Square } from 'lucide-react'
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
    // Same translucent, blurred chrome as the dashboard's topbar/sidebar
    // (surface-shell) rather than a flat opaque bar — the two shells sit
    // above the same ambient-glow wash, so their flush headers should
    // pick it up the same way instead of one bleeding it through and the
    // other blocking it.
    <header className="surface-shell flex h-12 shrink-0 items-center justify-between gap-3 border-b border-hairline px-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <Link
          to="/dashboard"
          className="-m-1.5 rounded-lg p-1.5 text-graphite-500 transition-colors duration-150 hover:bg-surface-hover hover:text-graphite-100"
          aria-label="Back to dashboard"
        >
          <ArrowLeft size={16} />
        </Link>
        <span className="truncate text-[0.8125rem] font-medium tracking-[-0.008em] text-graphite-50">
          {project.name}
        </span>
        <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>
      </div>

      <div className="flex items-center gap-1.5">
        <PresenceAvatars users={presentUsers} />
        <QuickActions />

        {/* Reads as a keyboard hint rather than a button: recessed fill,
            no border, monospaced key cap. */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="hidden items-center gap-1.5 rounded-lg bg-surface-sunken px-2.5 py-1.5 text-[0.6875rem] font-medium text-graphite-500 ring-1 ring-inset ring-hairline transition-colors duration-150 hover:text-graphite-200 hover:ring-hairline-strong sm:flex"
          aria-label="Open command palette"
        >
          <Command size={12} />
          <span className="font-mono">K</span>
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

        <div className="hidden md:block">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => useWorkspaceUiStore.getState().setRightPanelOpen(!useWorkspaceUiStore.getState().rightPanelOpen)}
            aria-label="Toggle preview & AI panel"
          >
            <Monitor size={15} />
          </Button>
        </div>

        <Link to="/settings">
          <Button variant="ghost" size="icon" aria-label="Settings">
            <Settings size={15} />
          </Button>
        </Link>
      </div>
    </header>
  )
}
