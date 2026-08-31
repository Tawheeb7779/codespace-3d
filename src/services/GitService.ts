import * as git from 'isomorphic-git'
import { GitFsAdapter } from '@/services/GitFsAdapter'
import type { FileSystemService } from '@/services/FileSystemService'

const DIR = '/'
const GITDIR = '/.git'

export type FileGitStatus = 'unmodified' | 'modified' | 'added' | 'deleted' | 'untracked'

export interface GitFileStatus {
  path: string
  status: FileGitStatus
  staged: boolean
}

export interface GitCommitInfo {
  oid: string
  message: string
  author: string
  timestamp: number
}

/**
 * Real Git over the project's virtual file system via isomorphic-git —
 * no server, no simulated results (spec §22). One instance per open
 * project; construct with `GitService.forProject(...)`.
 */
export class GitService {
  private readonly adapter: GitFsAdapter

  private constructor(adapter: GitFsAdapter) {
    this.adapter = adapter
  }

  static async forProject(projectId: string, fs: FileSystemService): Promise<GitService> {
    const adapter = new GitFsAdapter(projectId, fs)
    const service = new GitService(adapter)
    await service.ensureInitialized()
    return service
  }

  private async ensureInitialized() {
    try {
      await git.resolveRef({ fs: this.adapter, dir: DIR, gitdir: GITDIR, ref: 'HEAD' })
    } catch {
      await git.init({ fs: this.adapter, dir: DIR, gitdir: GITDIR, defaultBranch: 'main' })
    }
  }

  async status(): Promise<GitFileStatus[]> {
    const matrix = await git.statusMatrix({ fs: this.adapter, dir: DIR, gitdir: GITDIR })
    const results: GitFileStatus[] = []
    for (const [filepath, head, workdir, stage] of matrix) {
      if (head === 1 && workdir === 1 && stage === 1) continue // unmodified, unchanged
      let status: FileGitStatus = 'modified'
      if (head === 0 && workdir === 2 && stage === 0) status = 'untracked'
      else if (head === 0 && stage > 0) status = 'added'
      else if (head === 1 && workdir === 0) status = 'deleted'
      else if (head === 1 && workdir === 2) status = 'modified'
      results.push({ path: filepath, status, staged: head !== stage })
    }
    return results
  }

  async stage(paths: string[]): Promise<void> {
    for (const filepath of paths) {
      await git.add({ fs: this.adapter, dir: DIR, gitdir: GITDIR, filepath })
    }
  }

  async unstage(paths: string[]): Promise<void> {
    for (const filepath of paths) {
      await git.resetIndex({ fs: this.adapter, dir: DIR, gitdir: GITDIR, filepath })
    }
  }

  async stageAll(): Promise<void> {
    const status = await this.status()
    await this.stage(status.filter((s) => s.status !== 'deleted').map((s) => s.path))
    for (const s of status.filter((s) => s.status === 'deleted')) {
      await git.remove({ fs: this.adapter, dir: DIR, gitdir: GITDIR, filepath: s.path })
    }
  }

  async commit(message: string, author: { name: string; email: string }): Promise<string> {
    return git.commit({ fs: this.adapter, dir: DIR, gitdir: GITDIR, message, author, committer: author })
  }

  async log(depth = 50): Promise<GitCommitInfo[]> {
    try {
      const commits = await git.log({ fs: this.adapter, dir: DIR, gitdir: GITDIR, depth })
      return commits.map((c) => ({
        oid: c.oid,
        message: c.commit.message,
        author: c.commit.author.name,
        timestamp: c.commit.author.timestamp * 1000,
      }))
    } catch {
      return []
    }
  }

  async listBranches(): Promise<string[]> {
    return git.listBranches({ fs: this.adapter, dir: DIR, gitdir: GITDIR })
  }

  async currentBranch(): Promise<string | undefined> {
    return (await git.currentBranch({ fs: this.adapter, dir: DIR, gitdir: GITDIR })) ?? undefined
  }

  async createBranch(name: string): Promise<void> {
    await git.branch({ fs: this.adapter, dir: DIR, gitdir: GITDIR, ref: name, checkout: true })
  }

  async switchBranch(name: string): Promise<void> {
    await git.checkout({ fs: this.adapter, dir: DIR, gitdir: GITDIR, ref: name })
  }

  async diff(filepath: string): Promise<{ head: string; workdir: string }> {
    let head = ''
    try {
      const oid = await git.resolveRef({ fs: this.adapter, dir: DIR, gitdir: GITDIR, ref: 'HEAD' })
      const { blob } = await git.readBlob({ fs: this.adapter, dir: DIR, gitdir: GITDIR, oid, filepath })
      head = new TextDecoder().decode(blob)
    } catch {
      head = ''
    }
    let workdir = ''
    try {
      const raw = await this.adapter.promises.readFile(`/${filepath}`, { encoding: 'utf8' })
      workdir = typeof raw === 'string' ? raw : new TextDecoder().decode(raw)
    } catch {
      workdir = ''
    }
    return { head, workdir }
  }
}
