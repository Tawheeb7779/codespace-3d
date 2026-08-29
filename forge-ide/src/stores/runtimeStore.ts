import { create } from 'zustand'
import { WebContainerService } from '@/services/WebContainerService'
import { detectRunConfig, detectPackageManager, installCommand } from '@/services/RuntimeDetection'
import type { FileSystemService } from '@/services/FileSystemService'
import type { RunConfig } from '@/services/RuntimeDetection'

export type RuntimeStatus = 'idle' | 'unsupported' | 'installing' | 'starting' | 'running' | 'stopped' | 'error'

export interface RuntimeLogEntry {
  id: string
  timestamp: number
  text: string
  isError: boolean
}

interface RuntimeState {
  status: RuntimeStatus
  logs: RuntimeLogEntry[]
  previewUrl: string | null
  runConfig: RunConfig | null
  errorMessage: string | null
  boot: (fs: FileSystemService) => Promise<void>
  run: (fs: FileSystemService) => Promise<void>
  stop: () => Promise<void>
  restart: (fs: FileSystemService) => Promise<void>
  clearLogs: () => void
}

const ERROR_PATTERN = /(error|exception|failed|enoent|cannot find module)/i

function appendLog(get: () => RuntimeState, set: (partial: Partial<RuntimeState>) => void, text: string) {
  const entry: RuntimeLogEntry = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    text,
    isError: ERROR_PATTERN.test(text),
  }
  const logs = [...get().logs, entry].slice(-2000)
  set({ logs })
}

export const useRuntimeStore = create<RuntimeState>((set, get) => ({
  status: WebContainerService.isSupported ? 'idle' : 'unsupported',
  logs: [],
  previewUrl: null,
  runConfig: null,
  errorMessage: null,

  boot: async (fs) => {
    if (!WebContainerService.isSupported) {
      set({ status: 'unsupported' })
      return
    }
    try {
      await WebContainerService.mount(fs.toFileSystemTree())
      WebContainerService.onServerReady((_port, url) => set({ previewUrl: url }))
    } catch (err) {
      set({ status: 'error', errorMessage: err instanceof Error ? err.message : 'Failed to boot runtime' })
    }
  },

  run: async (fs) => {
    if (!WebContainerService.isSupported) {
      set({ status: 'unsupported' })
      return
    }
    set({ status: 'installing', errorMessage: null, previewUrl: null })
    const runConfig = detectRunConfig(fs)
    set({ runConfig })

    try {
      await WebContainerService.mount(fs.toFileSystemTree())

      if (fs.exists('package.json')) {
        const manager = detectPackageManager(fs)
        appendLog(get, set, `$ ${installCommand(manager).join(' ')}`)
        const exitCode = await WebContainerService.run(installCommand(manager), (chunk) => appendLog(get, set, chunk))
        if (exitCode !== 0) {
          set({ status: 'error', errorMessage: `Dependency install failed (exit code ${exitCode}).` })
          return
        }
      }

      if (!runConfig || runConfig.command.length === 0) {
        set({ status: 'stopped' })
        return
      }

      set({ status: 'starting' })
      appendLog(get, set, `$ ${runConfig.command.join(' ')}`)
      await WebContainerService.start(runConfig.command, (chunk) => appendLog(get, set, chunk))
      set({ status: 'running' })
    } catch (err) {
      set({ status: 'error', errorMessage: err instanceof Error ? err.message : 'Failed to run project' })
    }
  },

  stop: async () => {
    await WebContainerService.stop()
    set({ status: 'stopped', previewUrl: null })
  },

  restart: async (fs) => {
    await get().stop()
    await get().run(fs)
  },

  clearLogs: () => set({ logs: [] }),
}))
