import { supabase } from '@/lib/supabaseClient'
import { FileSystemService } from '@/services/FileSystemService'
import type { Project } from '@/types/project'

interface RemoteFileRow {
  path: string
  kind: 'file' | 'directory'
  content: string | null
}

/**
 * Opens the file system for a project. Local projects load straight from
 * IndexedDB. Cloud projects are cached locally (so editing keeps working
 * offline — spec §54) and reconciled against Supabase's `project_files`
 * table on every change, debounced, so multiple devices/collaborators
 * converge without requiring the whole repo to round-trip on each keystroke.
 */
export async function openProjectFileSystem(project: Project): Promise<{ fs: FileSystemService; dispose: () => void }> {
  const fs = await FileSystemService.load(project.id)

  if (!supabase || project.ownerId === 'local') {
    return { fs, dispose: () => {} }
  }

  const { data, error } = await supabase
    .from('project_files')
    .select('path, kind, content')
    .eq('project_id', project.id)
  if (error) throw error

  const remoteSnapshot = new Map<string, RemoteFileRow>()
  if (data && data.length > 0) {
    fs.seed(data.filter((r) => r.kind === 'file').map((r) => ({ path: r.path, content: r.content ?? '' })))
    for (const row of data) remoteSnapshot.set(row.path, row)
  } else {
    // First open of a cloud project with no rows yet (e.g. created before
    // this sync existed) — push the locally cached/seeded state up.
    for (const node of fs.list()) {
      if (node.kind === 'file') remoteSnapshot.set(node.path, { path: node.path, kind: 'file', content: null })
    }
  }

  let syncTimer: ReturnType<typeof setTimeout> | null = null
  let disposed = false

  const reconcile = async () => {
    if (disposed || !supabase) return
    const current = fs.list()
    const currentPaths = new Set(current.map((n) => n.path))

    const upserts = current
      .filter((n) => n.kind === 'file')
      .filter((n) => {
        const prior = remoteSnapshot.get(n.path)
        return !prior || prior.content !== n.content
      })
      .map((n) => ({ project_id: project.id, path: n.path, kind: n.kind, content: n.content ?? '' }))

    const deletions = Array.from(remoteSnapshot.keys()).filter((p) => !currentPaths.has(p))

    if (upserts.length > 0) {
      const { error: upsertError } = await supabase.from('project_files').upsert(upserts, { onConflict: 'project_id,path' })
      if (!upsertError) {
        for (const u of upserts) remoteSnapshot.set(u.path, { path: u.path, kind: 'file', content: u.content })
      }
    }
    if (deletions.length > 0) {
      const { error: deleteError } = await supabase
        .from('project_files')
        .delete()
        .eq('project_id', project.id)
        .in('path', deletions)
      if (!deleteError) {
        for (const p of deletions) remoteSnapshot.delete(p)
      }
    }
  }

  const unsubscribe = fs.subscribe(() => {
    if (syncTimer) clearTimeout(syncTimer)
    syncTimer = setTimeout(reconcile, 800)
  })

  return {
    fs,
    dispose: () => {
      disposed = true
      unsubscribe()
      if (syncTimer) clearTimeout(syncTimer)
    },
  }
}
