import { create } from 'zustand'

export type ToastVariant = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  title: string
  description?: string
  variant: ToastVariant
  createdAt: number
}

// Notifications shown in the topbar bell are this same real toast stream,
// kept around after the toast itself auto-dismisses — never a fabricated
// activity feed.
const HISTORY_LIMIT = 30

interface ToastState {
  toasts: Toast[]
  history: Toast[]
  unreadCount: number
  push: (toast: Omit<Toast, 'id' | 'createdAt'>) => void
  dismiss: (id: string) => void
  markAllRead: () => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  history: [],
  unreadCount: 0,
  push: (toast) => {
    const id = crypto.randomUUID()
    const entry: Toast = { ...toast, id, createdAt: Date.now() }
    set((state) => ({
      toasts: [...state.toasts, entry],
      history: [entry, ...state.history].slice(0, HISTORY_LIMIT),
      unreadCount: state.unreadCount + 1,
    }))
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }, 5000)
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  markAllRead: () => set({ unreadCount: 0 }),
}))

export const toast = {
  success: (title: string, description?: string) => useToastStore.getState().push({ title, description, variant: 'success' }),
  error: (title: string, description?: string) => useToastStore.getState().push({ title, description, variant: 'error' }),
  info: (title: string, description?: string) => useToastStore.getState().push({ title, description, variant: 'info' }),
}
