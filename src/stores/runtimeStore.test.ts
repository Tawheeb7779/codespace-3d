import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FileSystemService } from '@/services/FileSystemService'

const mockOnServerReady = vi.fn()
const mockTeardown = vi.fn()
const mockMount = vi.fn()
const mockStart = vi.fn()
const mockStop = vi.fn()
const mockRun = vi.fn()

vi.mock('@/services/WebContainerService', () => ({
  WebContainerService: {
    isSupported: true,
    onServerReady: mockOnServerReady,
    teardown: mockTeardown,
    mount: mockMount,
    start: mockStart,
    stop: mockStop,
    run: mockRun,
  },
}))

const { useRuntimeStore } = await import('./runtimeStore')

function makeFs(exists: (path: string) => boolean = () => false): FileSystemService {
  return { exists, toFileSystemTree: () => ({}) } as unknown as FileSystemService
}

describe('runtimeStore', () => {
  beforeEach(async () => {
    mockOnServerReady.mockReset().mockImplementation(() => () => {})
    mockTeardown.mockReset().mockResolvedValue(undefined)
    mockMount.mockReset().mockResolvedValue(undefined)
    mockStart.mockReset().mockResolvedValue(undefined)
    mockStop.mockReset().mockResolvedValue(undefined)
    mockRun.mockReset().mockResolvedValue(0)
    // Also clears the module-level unsubscribeServerReady closure, so each
    // test starts from a genuinely clean slate rather than inheriting the
    // previous test's listener bookkeeping.
    await useRuntimeStore.getState().reset()
    mockTeardown.mockClear()
  })

  it('boot() registers a server-ready listener even when mount() fails, so a later successful Run can still populate previewUrl', async () => {
    let capturedListener: ((port: number, url: string) => void) | null = null
    mockOnServerReady.mockImplementation((listener: (port: number, url: string) => void) => {
      capturedListener = listener
      return () => {}
    })
    mockMount.mockRejectedValueOnce(new Error('boot timeout'))

    await useRuntimeStore.getState().boot(makeFs())

    expect(useRuntimeStore.getState().status).toBe('error')
    expect(capturedListener).not.toBeNull()

    // The container eventually comes up on a later Run and fires server-ready.
    capturedListener!(4173, 'https://example.com/')
    expect(useRuntimeStore.getState().previewUrl).toBe('https://example.com/')
  })

  it('reset() tears down the WebContainer instance and clears logs/errors/previewUrl so nothing leaks into the next project', async () => {
    useRuntimeStore.setState({
      status: 'running',
      previewUrl: 'https://old-project.example.com/',
      errorMessage: 'boom',
      logs: [{ id: '1', timestamp: 0, text: 'stale log line', isError: false }],
    })

    await useRuntimeStore.getState().reset()

    expect(mockTeardown).toHaveBeenCalledTimes(1)
    const state = useRuntimeStore.getState()
    expect(state.previewUrl).toBeNull()
    expect(state.errorMessage).toBeNull()
    expect(state.logs).toEqual([])
    expect(state.runConfig).toBeNull()
  })

  it('boot() unsubscribes the previous server-ready listener before registering a new one (no listener leak across project switches)', async () => {
    const unsubA = vi.fn()
    const unsubB = vi.fn()
    mockOnServerReady.mockImplementationOnce(() => unsubA).mockImplementationOnce(() => unsubB)

    await useRuntimeStore.getState().boot(makeFs())
    expect(unsubA).not.toHaveBeenCalled()

    await useRuntimeStore.getState().boot(makeFs())
    expect(unsubA).toHaveBeenCalledTimes(1)
    expect(unsubB).not.toHaveBeenCalled()
  })

  it('switching projects (reset then boot) does not leak the previous project\'s previewUrl into the new one', async () => {
    useRuntimeStore.setState({ previewUrl: 'https://project-a.example.com/' })

    await useRuntimeStore.getState().reset()
    expect(useRuntimeStore.getState().previewUrl).toBeNull()

    await useRuntimeStore.getState().boot(makeFs())
    expect(useRuntimeStore.getState().previewUrl).toBeNull()
  })

  it('bumpPreviewReload() increments previewReloadNonce so Preview can force the iframe to refetch', () => {
    const before = useRuntimeStore.getState().previewReloadNonce
    useRuntimeStore.getState().bumpPreviewReload()
    expect(useRuntimeStore.getState().previewReloadNonce).toBe(before + 1)
  })
})
