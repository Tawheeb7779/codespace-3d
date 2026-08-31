import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import '@/lib/monacoSetup'
import { AlertTriangle } from 'lucide-react'
import { Spinner } from '@/components/ui/misc'
import { Button } from '@/components/ui/Button'
import { ProjectService } from '@/services/ProjectService'
import { openProjectFileSystem } from '@/services/CloudProjectSync'
import type { FileSystemService } from '@/services/FileSystemService'
import type { Project } from '@/types/project'
import { WorkspaceProvider, createChangeTracker } from '@/features/workspace/WorkspaceContext'
import { WorkspaceTopBar } from '@/features/workspace/WorkspaceTopBar'
import { DesktopWorkspace } from '@/features/workspace/DesktopWorkspace'
import { MobileWorkspace } from '@/features/workspace/MobileWorkspace'
import { CommandPalette } from '@/features/command-palette/CommandPalette'
import { useSyncTabsWithFs } from '@/features/editor/useSyncTabsWithFs'
import { useGlobalShortcuts } from '@/features/workspace/useGlobalShortcuts'
import { useEditorStore } from '@/stores/editorStore'
import { useDiagnosticsStore } from '@/stores/diagnosticsStore'
import { useTerminalTabsStore } from '@/stores/terminalTabsStore'
import { useRuntimeStore } from '@/stores/runtimeStore'
import { useAuthStore } from '@/stores/authStore'

export function WorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>()
  const user = useAuthStore((s) => s.user)
  const [state, setState] = useState<{ project: Project; fs: FileSystemService } | 'loading' | 'not-found' | 'error'>('loading')

  useEffect(() => {
    if (!projectId) return
    let disposeSync: (() => void) | null = null
    let cancelled = false

    ProjectService.get(projectId)
      .then(async (project) => {
        if (!project) {
          if (!cancelled) setState('not-found')
          return
        }
        const { fs, dispose } = await openProjectFileSystem(project)
        disposeSync = dispose
        if (!cancelled) setState({ project, fs })
      })
      .catch(() => {
        if (!cancelled) setState('error')
      })

    return () => {
      cancelled = true
      disposeSync?.()
      useEditorStore.getState().reset()
      useDiagnosticsStore.getState().reset()
      useTerminalTabsStore.getState().reset()
      useRuntimeStore.getState().stop()
    }
  }, [projectId, user?.id])

  if (state === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-base">
        <Spinner size={22} />
      </div>
    )
  }

  if (state === 'not-found' || state === 'error') {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-surface-base px-5">
        <div className="surface-card w-full max-w-sm rounded-modal p-7 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-signal-amber/10 ring-1 ring-inset ring-signal-amber/20">
            <AlertTriangle size={24} className="text-signal-amber" />
          </div>
          <h1 className="type-title text-graphite-50">
            {state === 'not-found' ? 'Project not found' : 'Could not open project'}
          </h1>
          <p className="type-body mt-2.5 text-graphite-400">
            {state === 'not-found'
              ? "This project doesn't exist, or you don't have access to it."
              : 'Something went wrong while loading this project. Try again from the dashboard.'}
          </p>
          <Link to="/dashboard" className="mt-6 block">
            <Button variant="primary" size="lg" className="w-full">
              Back to dashboard
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return <WorkspaceContent project={state.project} fs={state.fs} />
}

function WorkspaceContent({ project, fs }: { project: Project; fs: FileSystemService }) {
  useSyncTabsWithFs(fs)
  useGlobalShortcuts(fs)
  const [changeTracker] = useState(() => createChangeTracker())

  useEffect(() => {
    useRuntimeStore.getState().boot(fs)
  }, [fs])

  return (
    <WorkspaceProvider value={{ project, fs, changeTracker }}>
      <div className="relative flex h-screen flex-col overflow-hidden bg-surface-base">
        {/* Same restrained ambient light as the dashboard shell, so moving
            between the two doesn't feel like entering a different product. */}
        <div className="ambient-glow" aria-hidden />
        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
          <WorkspaceTopBar />
          <DesktopWorkspace />
          <MobileWorkspace />
        </div>
      </div>
      <CommandPalette />
    </WorkspaceProvider>
  )
}
