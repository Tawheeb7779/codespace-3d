import { supabase } from '@/lib/supabaseClient'
import { FileSystemService } from '@/services/FileSystemService'
import { useEditorStore } from '@/stores/editorStore'
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

export interface RefreshResult {
  /** Local mode has nothing external to pull from — there's only ever
   *  this one copy of the files. */
  local: boolean
  pulled: number
  updated: number
  /** Files where the remote copy differs but a tab has unsaved local
   *  edits — never silently overwritten. */
  skipped: number
}

/**
 * Explorer's "Refresh" — pulls whatever changed in Supabase's
 * `project_files` since this workspace was opened (another device, a
 * collaborator, an edit made elsewhere) into the local, editable copy.
 * There's no realtime subscription for this (spec keeps sync push-based
 * and debounced, see openProjectFileSystem above), so without a manual
 * refresh a long-lived session would never see anyone else's changes.
 * Never overwrites a file with unsaved local edits — those are skipped
 * and reported, not silently clobbered.
 */
export async function refreshFromCloud(project: Project, fs: FileSystemService): Promise<RefreshResult> {
  if (!supabase || project.ownerId === 'local') {
    return { local: true, pulled: 0, updated: 0, skipped: 0 }
  }

  const { data, error } = await supabase
    .from('project_files')
    .select('path, kind, content')
    .eq('project_id', project.id)
  if (error) throw error

  const dirtyPaths = new Set(useEditorStore.getState().tabs.filter((t) => t.dirty).map((t) => t.path))
  let pulled = 0
  let updated = 0
  let skipped = 0

  for (const row of data ?? []) {
    if (row.kind !== 'file') continue
    const remoteContent = row.content ?? ''
    const existsLocally = fs.exists(row.path)
    if (!existsLocally) {
      fs.write(row.path, remoteContent)
      pulled++
      continue
    }
    if (fs.read(row.path) === remoteContent) continue
    if (dirtyPaths.has(row.path)) {
      skipped++
      continue
    }
    fs.write(row.path, remoteContent)
    updated++
  }

  return { local: false, pulled, updated, skipped }
}
