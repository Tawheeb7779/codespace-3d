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
import { useEditorStore } from '@/stores/editorStore'
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
      useRuntimeStore.getState().stop()
    }
  }, [projectId, user?.id])

  if (state === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-graphite-950">
        <Spinner size={22} />
      </div>
    )
  }

  if (state === 'not-found' || state === 'error') {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-graphite-950 px-4 text-center">
        <AlertTriangle size={28} className="text-signal-amber" />
        <p className="text-graphite-300">{state === 'not-found' ? "This project doesn't exist or you don't have access to it." : 'Failed to load this project.'}</p>
        <Link to="/dashboard">
          <Button variant="primary">Back to dashboard</Button>
        </Link>
      </div>
    )
  }

  return <WorkspaceContent project={state.project} fs={state.fs} />
}

function WorkspaceContent({ project, fs }: { project: Project; fs: FileSystemService }) {
  useSyncTabsWithFs(fs)
  const [changeTracker] = useState(() => createChangeTracker())

  useEffect(() => {
    useRuntimeStore.getState().boot(fs)
  }, [fs])

  return (
    <WorkspaceProvider value={{ project, fs, changeTracker }}>
      <div className="flex h-screen flex-col bg-graphite-950">
        <WorkspaceTopBar />
        <DesktopWorkspace />
        <MobileWorkspace />
      </div>
      <CommandPalette />
    </WorkspaceProvider>
  )
}
