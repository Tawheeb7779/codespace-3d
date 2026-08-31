import { beforeEach, describe, expect, it, vi } from 'vitest'
import { idbSet } from '@/lib/idbStore'
import type { Project } from '@/types/project'

const mockSelectResult = vi.fn()

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => mockSelectResult(),
      }),
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
})
