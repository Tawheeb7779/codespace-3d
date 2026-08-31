import { create } from 'zustand'
import { idbGet, idbSet } from '@/lib/idbStore'

export type AiProvider = 'openai' | 'anthropic' | 'gemini' | 'openai-compatible'

export interface EditorSettings {
  fontSize: number
  tabSize: number
  wordWrap: boolean
  minimap: boolean
  autosave: boolean
  autosaveDelayMs: number
}

export type Theme = 'dark' | 'light' | 'system'

export interface AiSettings {
  provider: AiProvider
  model: string
  baseUrl?: string
}

interface SettingsState {
  editor: EditorSettings
  theme: Theme
  ai: AiSettings
  loaded: boolean
  load: () => Promise<void>
  updateEditor: (patch: Partial<EditorSettings>) => void
  updateAi: (patch: Partial<AiSettings>) => void
  setTheme: (theme: Theme) => void
}

const DEFAULT_EDITOR: EditorSettings = {
  fontSize: 14,
  tabSize: 2,
  wordWrap: true,
  minimap: true,
  autosave: true,
  autosaveDelayMs: 800,
}

const DEFAULT_AI: AiSettings = {
  provider: 'anthropic',
  model: 'claude-sonnet-4-5',
}

const SETTINGS_KEY = 'user-settings'

interface PersistedSettings {
  editor: EditorSettings
  theme: Theme
  ai: AiSettings
}

async function persist(state: PersistedSettings) {
  await idbSet('settings', SETTINGS_KEY, state)
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  editor: DEFAULT_EDITOR,
  theme: 'dark',
  ai: DEFAULT_AI,
  loaded: false,

  load: async () => {
    const saved = await idbGet<PersistedSettings>('settings', SETTINGS_KEY)
    if (saved) {
      set({ editor: { ...DEFAULT_EDITOR, ...saved.editor }, theme: saved.theme ?? 'dark', ai: { ...DEFAULT_AI, ...saved.ai } })
    }
    set({ loaded: true })
  },

  updateEditor: (patch) => {
    const editor = { ...get().editor, ...patch }
    set({ editor })
    void persist({ editor, theme: get().theme, ai: get().ai })
  },

  updateAi: (patch) => {
    const ai = { ...get().ai, ...patch }
    set({ ai })
    void persist({ editor: get().editor, theme: get().theme, ai })
  },

  setTheme: (theme) => {
    set({ theme })
    void persist({ editor: get().editor, theme, ai: get().ai })
  },
}))
