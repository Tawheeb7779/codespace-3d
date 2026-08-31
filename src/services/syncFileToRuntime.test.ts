import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockWriteFile = vi.fn()
let isSupported = true

vi.mock('@/services/WebContainerService', () => ({
  WebContainerService: {
    get isSupported() {
      return isSupported
    },
    writeFile: (...args: unknown[]) => mockWriteFile(...args),
  },
}))

const { useRuntimeStore } = await import('@/stores/runtimeStore')
const { syncFileToRunningContainer } = await import('./syncFileToRuntime')

function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

describe('syncFileToRunningContainer', () => {
  beforeEach(() => {
    isSupported = true
    mockWriteFile.mockReset().mockResolvedValue(undefined)
    useRuntimeStore.setState({ status: 'running', previewReloadNonce: 0 })
  })

  it('writes to the container and bumps previewReloadNonce when the container is running', async () => {
    syncFileToRunningContainer('index.html', '<h1>hi</h1>')
    await flush()

    expect(mockWriteFile).toHaveBeenCalledWith('index.html', '<h1>hi</h1>')
    expect(useRuntimeStore.getState().previewReloadNonce).toBe(1)
  })

  it('does nothing when the container is not running (never triggers a boot)', async () => {
    useRuntimeStore.setState({ status: 'idle' })
    syncFileToRunningContainer('index.html', '<h1>hi</h1>')
    await flush()

    expect(mockWriteFile).not.toHaveBeenCalled()
    expect(useRuntimeStore.getState().previewReloadNonce).toBe(0)
  })

  it('does not bump the reload nonce when the write fails', async () => {
    mockWriteFile.mockRejectedValueOnce(new Error('nope'))
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    syncFileToRunningContainer('index.html', '<h1>hi</h1>')
    await flush()

    expect(useRuntimeStore.getState().previewReloadNonce).toBe(0)
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })
})
