import type { FileSystemService } from '@/services/FileSystemService'

export type ChangeKind = 'created' | 'modified' | 'deleted' | 'renamed'

export interface FileChange {
  path: string
  kind: ChangeKind
  before: string | null
  after: string | null
  renamedFrom?: string
}

/**
 * Tracks the AI agent's file edits within a session so the UI can show a
 * reviewable diff and let the user revert individual files or everything —
 * spec §28 ("never silently overwrite important user changes"). The agent
 * loop applies edits immediately (so it can re-run and verify its own
 * work), and this is the undo log that makes that safe.
 */
export class ChangeTracker {
  private originals = new Map<string, string | null>() // null = file did not exist before
  private currentKind = new Map<string, ChangeKind>()

  private captureIfNew(fs: FileSystemService, path: string) {
    if (this.originals.has(path)) return
    this.originals.set(path, fs.exists(path) ? fs.read(path) : null)
  }

  recordWrite(fs: FileSystemService, path: string) {
    this.captureIfNew(fs, path)
    const original = this.originals.get(path)
    this.currentKind.set(path, original === null ? 'created' : 'modified')
  }

  recordDelete(fs: FileSystemService, path: string) {
    this.captureIfNew(fs, path)
    this.currentKind.set(path, 'deleted')
  }

  recordRename(fs: FileSystemService, from: string, to: string) {
    this.captureIfNew(fs, from)
    this.captureIfNew(fs, to)
    this.currentKind.set(from, 'deleted')
    this.currentKind.set(to, 'renamed')
  }

  getChanges(fs: FileSystemService): FileChange[] {
    const changes: FileChange[] = []
    for (const [path, kind] of this.currentKind) {
      const before = this.originals.get(path) ?? null
      const after = fs.exists(path) ? fs.read(path) : null
      changes.push({ path, kind, before, after })
    }
    return changes.sort((a, b) => a.path.localeCompare(b.path))
  }

  hasChanges(): boolean {
    return this.currentKind.size > 0
  }

  revertFile(fs: FileSystemService, path: string) {
    const original = this.originals.get(path)
    if (original === undefined) return
    if (original === null) {
      if (fs.exists(path)) fs.delete(path)
    } else {
      fs.write(path, original)
    }
    this.originals.delete(path)
    this.currentKind.delete(path)
  }

  revertAll(fs: FileSystemService) {
    for (const path of Array.from(this.currentKind.keys())) {
      this.revertFile(fs, path)
    }
  }

  acceptAll() {
    this.originals.clear()
    this.currentKind.clear()
  }
}
