import { create } from 'zustand'

let nextId = 1

interface TerminalTabsState {
  ids: number[]
  activeId: number
  addTerminal: () => void
  closeTerminal: (id: number) => void
  setActive: (id: number) => void
  reset: () => void
}

export const useTerminalTabsStore = create<TerminalTabsState>((set, get) => ({
  ids: [1],
  activeId: 1,

  addTerminal: () => {
    const id = ++nextId
    set((state) => ({ ids: [...state.ids, id], activeId: id }))
  },

  closeTerminal: (id) => {
    set((state) => {
      if (state.ids.length <= 1) return state
      const ids = state.ids.filter((i) => i !== id)
      const activeId = state.activeId === id ? ids[ids.length - 1] : state.activeId
      return { ids, activeId }
    })
  },

  setActive: (id) => {
    if (get().ids.includes(id)) set({ activeId: id })
  },

  reset: () => {
    nextId = 1
    set({ ids: [1], activeId: 1 })
  },
}))
