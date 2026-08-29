import { useParams } from 'react-router-dom'

export function WorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>()
  return (
    <div className="flex h-screen items-center justify-center bg-graphite-950 text-graphite-500">
      Workspace for project {projectId} — coming up next.
    </div>
  )
}
