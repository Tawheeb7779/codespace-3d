import '@/lib/bufferPolyfill'
import type { FileSystemService } from '@/services/FileSystemService'
import { idbGet, idbSet } from '@/lib/idbStore'

interface GitObjectEntry {
  isDir: boolean
  content?: Uint8Array
  mtimeMs: number
}

type Encoding = { encoding?: string } | string | undefined

function toBytes(content: string): Uint8Array {
  return new TextEncoder().encode(content)
}

function fromBytes(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes)
}

function wantsUtf8(options: Encoding): boolean {
  if (typeof options === 'string') return options === 'utf8'
  return options?.encoding === 'utf8'
}

/**
 * Implements isomorphic-git's PromiseFsClient interface over a project's
 * FileSystemService, so every project gets a real, working `.git` history
 * without a server round trip (spec §22).
 *
 * `.git/**` internals live in a private, separately-persisted object store
 * (never exposed through the user-facing VFS API, which deliberately
 * refuses to touch `.git` — see FileSystemService.assertWritable). Every
 * other path is the project's real working tree, delegated straight to
 * FileSystemService so Git sees exactly what the editor/AI see.
 */
export class GitFsAdapter {
  private objects = new Map<string, GitObjectEntry>()
  private loaded: Promise<void>
  private saveTimer: ReturnType<typeof setTimeout> | null = null
  private readonly projectId: string
  private readonly workingTree: FileSystemService

  /**
   * isomorphic-git detects a promise-based fs client via
   * `Object.getOwnPropertyDescriptor(fs, 'promises')` — an own, enumerable
   * property, NOT a prototype accessor. A `get promises()` class getter
   * fails that check silently and isomorphic-git falls back to treating
   * this whole instance as a callback-fs, crashing on `fs.readFile.bind`.
   * So `promises` is built once and assigned directly in the constructor.
   */
  readonly promises: ReturnType<GitFsAdapter['buildPromises']>

  constructor(projectId: string, workingTree: FileSystemService) {
    this.projectId = projectId
    this.workingTree = workingTree
    this.loaded = this.load()
    this.promises = this.buildPromises()
  }

  private storageKey() {
    return `${this.projectId}:git-objects`
  }

  private async load() {
    const saved = await idbGet<Array<[string, { isDir: boolean; content?: number[]; mtimeMs: number }]>>(
      'projects',
      this.storageKey(),
    )
    if (saved) {
      for (const [path, entry] of saved) {
        this.objects.set(path, { ...entry, content: entry.content ? new Uint8Array(entry.content) : undefined })
      }
    }
  }

  private scheduleSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => {
      const serializable = Array.from(this.objects.entries()).map(([path, entry]) => [
        path,
        { ...entry, content: entry.content ? Array.from(entry.content) : undefined },
      ])
      void idbSet('projects', this.storageKey(), serializable)
    }, 300)
  }

  private normalize(filepath: string): string {
    return filepath.replace(/^\/+/, '').replace(/\/+$/, '') || '.'
  }

  private isGitPath(path: string): boolean {
    return path === '.git' || path.startsWith('.git/')
  }

  private async ensureLoaded() {
    await this.loaded
  }

  private buildPromises() {
    return {
      readFile: async (filepath: string, options?: Encoding): Promise<Uint8Array | string> => {
        await this.ensureLoaded()
        const path = this.normalize(filepath)
        if (this.isGitPath(path)) {
          const entry = this.objects.get(path)
          if (!entry || entry.isDir || !entry.content) throw enoent(filepath)
          return wantsUtf8(options) ? fromBytes(entry.content) : entry.content
        }
        if (!this.workingTree.exists(path)) throw enoent(filepath)
        const content = this.workingTree.read(path)
        return wantsUtf8(options) ? content : toBytes(content)
      },

      writeFile: async (filepath: string, data: Uint8Array | string, options?: Encoding): Promise<void> => {
        await this.ensureLoaded()
        const path = this.normalize(filepath)
        const bytes = typeof data === 'string' ? toBytes(data) : data
        if (this.isGitPath(path)) {
          this.objects.set(path, { isDir: false, content: bytes, mtimeMs: Date.now() })
          this.scheduleSave()
          return
        }
        this.workingTree.write(path, typeof data === 'string' ? data : fromBytes(bytes))
        void options
      },

      unlink: async (filepath: string): Promise<void> => {
        await this.ensureLoaded()
        const path = this.normalize(filepath)
        if (this.isGitPath(path)) {
          this.objects.delete(path)
          this.scheduleSave()
          return
        }
        if (this.workingTree.exists(path)) this.workingTree.delete(path)
      },

      readdir: async (filepath: string): Promise<string[]> => {
        await this.ensureLoaded()
        const path = this.normalize(filepath)
        if (this.isGitPath(path) || path === '.git') {
          const prefix = path === '.' ? '' : `${path}/`
          const names = new Set<string>()
          for (const key of this.objects.keys()) {
            if (!key.startsWith(prefix)) continue
            const rest = key.slice(prefix.length)
            names.add(rest.split('/')[0])
          }
          return Array.from(names)
        }
        const prefix = path === '.' ? '' : `${path}/`
        const names = new Set<string>()
        for (const node of this.workingTree.list()) {
          if (path !== '.' && !node.path.startsWith(prefix)) continue
          const rest = path === '.' ? node.path : node.path.slice(prefix.length)
          const top = rest.split('/')[0]
          if (top) names.add(top)
        }
        return Array.from(names)
      },

      mkdir: async (filepath: string): Promise<void> => {
        await this.ensureLoaded()
        const path = this.normalize(filepath)
        if (this.isGitPath(path)) {
          if (!this.objects.has(path)) this.objects.set(path, { isDir: true, mtimeMs: Date.now() })
          this.scheduleSave()
          return
        }
        if (!this.workingTree.exists(path)) this.workingTree.createDirectory(path)
      },

      rmdir: async (filepath: string): Promise<void> => {
        await this.ensureLoaded()
        const path = this.normalize(filepath)
        if (this.isGitPath(path)) {
          this.objects.delete(path)
          this.scheduleSave()
          return
        }
        if (this.workingTree.exists(path)) this.workingTree.delete(path)
      },

      stat: async (filepath: string) => this.statImpl(filepath, true),
      lstat: async (filepath: string) => this.statImpl(filepath, false),

      // The project VFS has no symlinks; isomorphic-git only calls these
      // when it encounters one, which never happens here. They just need
      // to exist as functions — isomorphic-git unconditionally binds every
      // entry in its fs-client method list, symlinks included.
      readlink: async (filepath: string): Promise<string> => {
        throw enoent(filepath)
      },
      symlink: async (): Promise<void> => {
        throw new Error('Symlinks are not supported in the project file system.')
      },
    }
  }

  private async statImpl(filepath: string, _followSymlink: boolean) {
    await this.ensureLoaded()
    const path = this.normalize(filepath)
    void _followSymlink

    if (path === '.' || path === '') return makeStat(true, 0, Date.now())

    if (this.isGitPath(path)) {
      const entry = this.objects.get(path)
      if (!entry) {
        // Might be an implicit directory (has children but no explicit entry).
        const prefix = `${path}/`
        const hasChildren = Array.from(this.objects.keys()).some((k) => k.startsWith(prefix))
        if (hasChildren) return makeStat(true, 0, Date.now())
        throw enoent(filepath)
      }
      return makeStat(entry.isDir, entry.content?.byteLength ?? 0, entry.mtimeMs)
    }

    if (this.workingTree.exists(path)) {
      const node = this.workingTree.list().find((n) => n.path === path)!
      return makeStat(node.kind === 'directory', node.content?.length ?? 0, new Date(node.updatedAt).getTime())
    }
    throw enoent(filepath)
  }
}

function makeStat(isDir: boolean, size: number, mtimeMs: number) {
  return {
    isFile: () => !isDir,
    isDirectory: () => isDir,
    isSymbolicLink: () => false,
    size,
    mtimeMs,
    ctimeMs: mtimeMs,
    mode: isDir ? 0o040000 : 0o100644,
    uid: 1,
    gid: 1,
    dev: 1,
    ino: 1,
  }
}

function enoent(filepath: string): NodeJS.ErrnoException {
  const err = new Error(`ENOENT: no such file or directory, '${filepath}'`) as NodeJS.ErrnoException
  err.code = 'ENOENT'
  return err
}
