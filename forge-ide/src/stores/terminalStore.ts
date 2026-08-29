import { create } from 'zustand'

interface TerminalState {
  buffer: string[]
  append: (chunk: string) => void
  read: (lastN?: number) => string
}

const MAX_LINES = 500

export const useTerminalStore = create<TerminalState>((set, get) => ({
  buffer: [],
  append: (chunk) => set((state) => ({ buffer: [...state.buffer, chunk].slice(-MAX_LINES) })),
  read: (lastN = 200) => get().buffer.slice(-lastN).join(''),
}))
