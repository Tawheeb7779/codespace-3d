import { supabase } from '@/lib/supabaseClient'
import { FileSystemService } from '@/services/FileSystemService'
import { useEditorStore } from '@/stores/editorStore'
import type { Project } from '@/types/project'

interface RemoteFileRow {
  path: string
  content: string | null
  // Both of these are absent on a `project_files` table that hasn't run
  // migration 0013 yet — that migration is exactly what adds `kind`
  // (derived from the legacy `is_folder` boolean) and `updated_at` to a
  // pre-existing table. Querying an explicit column list (the previous
  // `.select('path, kind, content, updated_at')`) makes PostgREST reject
  // the whole request with a schema-cache "column does not exist" error
  // the moment either is missing — which is exactly what silently blanked
  // "Could not open project" for a database still on that older shape.
  // select('*') below never has that failure mode; these two are read
  // defensively instead, falling back to the legacy columns.
  kind?: 'file' | 'directory' | null
  is_folder?: boolean | null
  updated_at?: string | null
  created_at?: string | null
}

function normalizedKind(row: RemoteFileRow): 'file' | 'directory' {
  if (row.kind === 'file' || row.kind === 'directory') return row.kind
  return row.is_folder ? 'directory' : 'file'
}

function normalizedUpdatedAt(row: RemoteFileRow): string {
  return row.updated_at ?? row.created_at ?? new Date(0).toISOString()
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
    .select('*')
    .eq('project_id', project.id)
  if (error) throw error

  const remoteSnapshot = new Map<string, RemoteFileRow>()
  if (data && data.length > 0) {
    // The local IndexedDB copy just loaded above may hold an edit that
    // hasn't finished its debounced upload to `project_files` yet (see
    // `reconcile` below — up to 800ms behind). Blindly seeding every
    // remote row here would silently discard that edit on a reload that
    // lands inside that window. Only let a remote row overwrite a file
    // that already exists locally when it is verifiably newer.
    const localByPath = new Map(fs.list().filter((n) => n.kind === 'file').map((n) => [n.path, n]))
    const toSeed: Array<{ path: string; content: string }> = []
    for (const row of data as RemoteFileRow[]) {
      remoteSnapshot.set(row.path, row)
      if (normalizedKind(row) !== 'file') continue
      const local = localByPath.get(row.path)
      if (!local || new Date(normalizedUpdatedAt(row)).getTime() > new Date(local.updatedAt).getTime()) {
        toSeed.push({ path: row.path, content: row.content ?? '' })
      }
    }
    if (toSeed.length > 0) await fs.seed(toSeed)
  } else {
    // First open of a cloud project with no rows yet (e.g. created before
    // this sync existed) — push the locally cached/seeded state up.
    for (const node of fs.list()) {
      if (node.kind === 'file') remoteSnapshot.set(node.path, { path: node.path, kind: 'file', content: null, updated_at: new Date(0).toISOString() })
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
        for (const u of upserts) remoteSnapshot.set(u.path, { path: u.path, kind: 'file', content: u.content, updated_at: new Date().toISOString() })
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
      // A pending debounced reconcile (up to 800ms out) must still run —
      // otherwise navigating away (or switching projects) shortly after an
      // edit cancels the pending timer outright and the edit never reaches
      // Supabase at all: it looks saved (durable in local IndexedDB) but
      // silently never syncs to the cloud.
      const hadPendingSync = syncTimer !== null
      if (syncTimer) {
        clearTimeout(syncTimer)
        syncTimer = null
      }
      if (hadPendingSync) void reconcile()
      disposed = true
      unsubscribe()
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
    .select('*')
    .eq('project_id', project.id)
  if (error) throw error

  const dirtyPaths = new Set(useEditorStore.getState().tabs.filter((t) => t.dirty).map((t) => t.path))
  let pulled = 0
  let updated = 0
  let skipped = 0

  for (const row of (data ?? []) as RemoteFileRow[]) {
    if (normalizedKind(row) !== 'file') continue
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
