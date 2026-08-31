import { createContext, useContext, useEffect, useState } from 'react'
import type { FileSystemService } from '@/services/FileSystemService'
import { ChangeTracker } from '@/features/ai/ChangeTracker'
import type { Project } from '@/types/project'

interface WorkspaceValue {
  project: Project
  fs: FileSystemService
  changeTracker: ChangeTracker
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null)

export function WorkspaceProvider({ value, children }: { value: WorkspaceValue; children: React.ReactNode }) {
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace(): WorkspaceValue {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used within a WorkspaceProvider')
  return ctx
}

export function createChangeTracker() {
  return new ChangeTracker()
}

/** Re-renders the caller whenever the project's file system changes. */
export function useFileList() {
  const { fs } = useWorkspace()
  const [, setTick] = useState(0)
  useEffect(() => fs.subscribe(() => setTick((t) => t + 1)), [fs])
  return fs.list()
}
