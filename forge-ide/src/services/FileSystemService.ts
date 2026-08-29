import type { FileNode } from '@/types/project'
import { InvalidPathError, dirname, isReservedPath, normalizeProjectPath } from '@/lib/paths'
import { idbGet, idbSet } from '@/lib/idbStore'

export class FileNotFoundError extends Error {
  constructor(path: string) {
    super(`File not found: ${path}`)
    this.name = 'FileNotFoundError'
  }
}

export class PathConflictError extends Error {
  constructor(path: string) {
    super(`Path already exists: ${path}`)
    this.name = 'PathConflictError'
  }
}

type Listener = () => void

/**
 * In-memory, path-safe virtual file system for a single project.
 * Persists to IndexedDB (debounced) so a reload doesn't lose work — see
 * section 54 (local-first). All paths are normalized/validated before
 * touching the underlying map, so callers (UI, AI tools, import/export)
 * never need to re-validate.
 */
export class FileSystemService {
  private files = new Map<string, FileNode>()
  private listeners = new Set<Listener>()
  private saveTimer: ReturnType<typeof setTimeout> | null = null
  private readonly projectId: string

  constructor(projectId: string) {
    this.projectId = projectId
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private notify() {
    for (const fn of this.listeners) fn()
  }

  private scheduleSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => {
      void idbSet('projects', this.projectId, Array.from(this.files.values()))
    }, 400)
  }

  static async load(projectId: string): Promise<FileSystemService> {
    const fsService = new FileSystemService(projectId)
    const saved = await idbGet<FileNode[]>('projects', projectId)
    if (saved) {
      for (const node of saved) fsService.files.set(node.path, node)
    }
    return fsService
  }

  /**
   * Populates the file system (project creation, template application, ZIP
   * import). Persists immediately rather than on the usual debounce so a
   * `load()` performed right after — e.g. navigating straight into a newly
   * created project — always observes the seeded files.
   */
  seed(nodes: Array<{ path: string; content: string }>): Promise<void> {
    const now = new Date().toISOString()
    for (const { path, content } of nodes) {
      const normalized = normalizeProjectPath(path)
      this.ensureParentDirs(normalized, now)
      this.files.set(normalized, { path: normalized, kind: 'file', content, createdAt: now, updatedAt: now })
    }
    this.notify()
    if (this.saveTimer) clearTimeout(this.saveTimer)
    return idbSet('projects', this.projectId, Array.from(this.files.values()))
  }

  private assertWritable(normalized: string) {
    if (isReservedPath(normalized)) {
      throw new InvalidPathError(normalized, 'this path is reserved and cannot be modified directly')
    }
  }

  private ensureParentDirs(normalized: string, timestamp: string) {
    const parent = dirname(normalized)
    if (!parent) return
    const segments = parent.split('/')
    let current = ''
    for (const segment of segments) {
      current = current ? `${current}/${segment}` : segment
      if (!this.files.has(current)) {
        this.files.set(current, { path: current, kind: 'directory', createdAt: timestamp, updatedAt: timestamp })
      }
    }
  }

  list(): FileNode[] {
    return Array.from(this.files.values()).sort((a, b) => a.path.localeCompare(b.path))
  }

  exists(path: string): boolean {
    try {
      return this.files.has(normalizeProjectPath(path))
    } catch {
      return false
    }
  }

  read(path: string): string {
    const normalized = normalizeProjectPath(path)
    const node = this.files.get(normalized)
    if (!node || node.kind !== 'file') throw new FileNotFoundError(normalized)
    return node.content ?? ''
  }

  write(path: string, content: string): FileNode {
    const normalized = normalizeProjectPath(path)
    this.assertWritable(normalized)
    const now = new Date().toISOString()
    const existing = this.files.get(normalized)
    if (existing && existing.kind === 'directory') {
      throw new PathConflictError(normalized)
    }
    this.ensureParentDirs(normalized, now)
    const node: FileNode = {
      path: normalized,
      kind: 'file',
      content,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    this.files.set(normalized, node)
    this.notify()
    this.scheduleSave()
    return node
  }

  createDirectory(path: string): FileNode {
    const normalized = normalizeProjectPath(path)
    this.assertWritable(normalized)
    if (this.files.has(normalized)) throw new PathConflictError(normalized)
    const now = new Date().toISOString()
    this.ensureParentDirs(normalized, now)
    const node: FileNode = { path: normalized, kind: 'directory', createdAt: now, updatedAt: now }
    this.files.set(normalized, node)
    this.notify()
    this.scheduleSave()
    return node
  }

  delete(path: string): void {
    const normalized = normalizeProjectPath(path)
    this.assertWritable(normalized)
    const node = this.files.get(normalized)
    if (!node) throw new FileNotFoundError(normalized)
    if (node.kind === 'directory') {
      const prefix = `${normalized}/`
      for (const key of Array.from(this.files.keys())) {
        if (key === normalized || key.startsWith(prefix)) this.files.delete(key)
      }
    } else {
      this.files.delete(normalized)
    }
    this.notify()
    this.scheduleSave()
  }

  rename(fromPath: string, toPath: string): void {
    this.move(fromPath, toPath)
  }

  move(fromPath: string, toPath: string): void {
    const from = normalizeProjectPath(fromPath)
    const to = normalizeProjectPath(toPath)
    this.assertWritable(from)
    this.assertWritable(to)
    const node = this.files.get(from)
    if (!node) throw new FileNotFoundError(from)
    if (this.files.has(to)) throw new PathConflictError(to)

    const now = new Date().toISOString()
    if (node.kind === 'directory') {
      const prefix = `${from}/`
      const toMove = Array.from(this.files.entries()).filter(
        ([key]) => key === from || key.startsWith(prefix),
      )
      this.ensureParentDirs(to, now)
      for (const [key, value] of toMove) {
        const newKey = to + key.slice(from.length)
        this.files.delete(key)
        this.files.set(newKey, { ...value, path: newKey, updatedAt: now })
      }
    } else {
      this.ensureParentDirs(to, now)
      this.files.delete(from)
      this.files.set(to, { ...node, path: to, updatedAt: now })
    }
    this.notify()
    this.scheduleSave()
  }

  duplicate(path: string, toPath: string): void {
    const from = normalizeProjectPath(path)
    const to = normalizeProjectPath(toPath)
    this.assertWritable(to)
    const node = this.files.get(from)
    if (!node) throw new FileNotFoundError(from)
    if (this.files.has(to)) throw new PathConflictError(to)

    const now = new Date().toISOString()
    if (node.kind === 'directory') {
      const prefix = `${from}/`
      this.ensureParentDirs(to, now)
      this.files.set(to, { path: to, kind: 'directory', createdAt: now, updatedAt: now })
      for (const [key, value] of Array.from(this.files.entries())) {
        if (key.startsWith(prefix)) {
          const newKey = to + key.slice(from.length)
          this.files.set(newKey, { ...value, path: newKey, createdAt: now, updatedAt: now })
        }
      }
    } else {
      this.ensureParentDirs(to, now)
      this.files.set(to, { ...node, path: to, createdAt: now, updatedAt: now })
    }
    this.notify()
    this.scheduleSave()
  }

  /** Builds a WebContainer-compatible FileSystemTree from the current VFS. */
  toFileSystemTree(): Record<string, unknown> {
    const root: Record<string, unknown> = {}
    for (const node of this.list()) {
      if (node.kind === 'directory') continue
      const segments = node.path.split('/')
      let cursor = root
      for (let i = 0; i < segments.length - 1; i++) {
        const seg = segments[i]
        const existing = cursor[seg] as { directory?: Record<string, unknown> } | undefined
        if (!existing) {
          cursor[seg] = { directory: {} }
        }
        cursor = (cursor[seg] as { directory: Record<string, unknown> }).directory
      }
      cursor[segments[segments.length - 1]] = { file: { contents: node.content ?? '' } }
    }
    return root
  }
}
