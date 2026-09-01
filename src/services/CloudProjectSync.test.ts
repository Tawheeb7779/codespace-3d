import { beforeEach, describe, expect, it, vi } from 'vitest'
import { idbSet } from '@/lib/idbStore'
import type { Project } from '@/types/project'

const mockSelectResult = vi.fn()
const mockUpsert = vi.fn()
const mockSelectArg = vi.fn()

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: () => ({
      select: (columns: string) => {
        mockSelectArg(columns)
        return { eq: () => mockSelectResult() }
      },
      upsert: (...args: unknown[]) => mockUpsert(...args),
      delete: () => ({ eq: () => ({ in: () => Promise.resolve({ error: null }) }) }),
    }),
  },
}))

const { openProjectFileSystem } = await import('./CloudProjectSync')

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj-1',
    name: 'Test',
    description: null,
    templateId: 'react',
    ownerId: 'user-1',
    teamId: null,
    visibility: 'private',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('openProjectFileSystem', () => {
  beforeEach(() => {
    mockSelectResult.mockReset()
    mockUpsert.mockReset().mockResolvedValue({ error: null })
    mockSelectArg.mockReset()
  })

  it('queries project_files with select(\'*\') rather than an explicit column list, so a table missing kind/updated_at (pre-0013) never gets a schema-cache "column does not exist" error', async () => {
    mockSelectResult.mockResolvedValue({ data: [], error: null })
    await openProjectFileSystem(makeProject({ id: 'proj-select-shape' }))
    expect(mockSelectArg).toHaveBeenCalledWith('*')
  })

  it('never lets a stale remote row overwrite a newer local edit that has not finished syncing yet', async () => {
    const newLocalTime = '2024-06-01T00:00:12.000Z'
    const oldRemoteTime = '2024-06-01T00:00:00.000Z'
    await idbSet('projects', 'proj-1', [
      { path: 'index.html', kind: 'file', content: 'LOCAL NEWER', createdAt: oldRemoteTime, updatedAt: newLocalTime },
    ])
    mockSelectResult.mockResolvedValue({
      data: [{ path: 'index.html', kind: 'file', content: 'REMOTE STALE', updated_at: oldRemoteTime }],
      error: null,
    })

    const { fs } = await openProjectFileSystem(makeProject({ id: 'proj-1' }))
    expect(fs.read('index.html')).toBe('LOCAL NEWER')
  })

  it('applies the remote copy when it is verifiably newer than the local cache', async () => {
    const oldLocalTime = '2024-06-01T00:00:00.000Z'
    const newRemoteTime = '2024-06-01T00:00:12.000Z'
    await idbSet('projects', 'proj-1', [
      { path: 'index.html', kind: 'file', content: 'LOCAL STALE', createdAt: oldLocalTime, updatedAt: oldLocalTime },
    ])
    mockSelectResult.mockResolvedValue({
      data: [{ path: 'index.html', kind: 'file', content: 'REMOTE NEWER', updated_at: newRemoteTime }],
      error: null,
    })

    const { fs } = await openProjectFileSystem(makeProject({ id: 'proj-1' }))
    expect(fs.read('index.html')).toBe('REMOTE NEWER')
  })

  it('seeds a file that only exists remotely (never opened locally before)', async () => {
    mockSelectResult.mockResolvedValue({
      data: [{ path: 'style.css', kind: 'file', content: 'body{}', updated_at: '2024-06-01T00:00:00.000Z' }],
      error: null,
    })
    const { fs } = await openProjectFileSystem(makeProject({ id: 'proj-2' }))
    expect(fs.read('style.css')).toBe('body{}')
  })

  it('opens successfully against a project_files table that has not run migration 0013 yet (legacy is_folder/created_at, no kind/updated_at columns) — regression test for the real "Could not open project" bug', async () => {
    // This is exactly the shape PostgREST returns for a table that
    // predates 0013: no `kind`, no `updated_at`. The previous code queried
    // an explicit `.select('path, kind, content, updated_at')`, which
    // PostgREST rejects outright with a schema-cache "column does not
    // exist" error the moment a requested column is missing — that error
    // propagated out of openProjectFileSystem(), and WorkspacePage.tsx's
    // catch-all turned it into the generic "Could not open project"
    // failure with no indication of the real cause.
    mockSelectResult.mockResolvedValue({
      data: [
        { path: 'index.html', content: '<h1>Legacy</h1>', is_folder: false, created_at: '2024-01-01T00:00:00.000Z' },
        { path: 'src', content: null, is_folder: true, created_at: '2024-01-01T00:00:00.000Z' },
      ],
      error: null,
    })

    const { fs } = await openProjectFileSystem(makeProject({ id: 'proj-legacy' }))

    expect(fs.read('index.html')).toBe('<h1>Legacy</h1>')
    // The directory row is correctly recognized via is_folder and never
    // mistaken for a file (which would have tried to seed `null` as its
    // content) — it just isn't materialized on its own since nothing
    // exists under it.
    expect(fs.exists('src')).toBe(false)
  })

  it('flushes a pending debounced cloud sync on dispose instead of dropping it (navigating away right after a save)', async () => {
    mockSelectResult.mockResolvedValue({ data: [], error: null })

    const { fs, dispose } = await openProjectFileSystem(makeProject({ id: 'proj-3' }))
    fs.write('index.html', '<h1>edited</h1>')

    // The debounced reconcile is scheduled 800ms out — dispose() (e.g. the
    // user navigating back to the dashboard) happens well before that would
    // ever fire on its own.
    expect(mockUpsert).not.toHaveBeenCalled()
    dispose()

    // Let the flushed reconcile's own async upsert call actually run.
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ project_id: 'proj-3', path: 'index.html', content: '<h1>edited</h1>' })]),
      { onConflict: 'project_id,path' },
    )
  })
})
