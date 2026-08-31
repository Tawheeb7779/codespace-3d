import { create } from 'zustand'

export type ToastVariant = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  title: string
  description?: string
  variant: ToastVariant
  createdAt: number
  /** True for the brief window between a dismiss and the toast actually
   *  leaving the array — lets the Toaster play an exit animation instead of
   *  the toast just vanishing (see `dismiss`). */
  dismissing?: boolean
}

// Notifications shown in the topbar bell are this same real toast stream,
// kept around after the toast itself auto-dismisses — never a fabricated
// activity feed.
const HISTORY_LIMIT = 30
const EXIT_MS = 200

interface ToastState {
  toasts: Toast[]
  history: Toast[]
  unreadCount: number
  push: (toast: Omit<Toast, 'id' | 'createdAt'>) => void
  dismiss: (id: string) => void
  markAllRead: () => void
}

export const useToastStore = create<ToastState>((set, get) => ({
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
    setTimeout(() => get().dismiss(id), 5000)
  },
  dismiss: (id) => {
    // Two-phase removal: mark it dismissing so the Toaster can animate it
    // out symmetrically with how it animated in, then actually drop it
    // from the array once that animation has had time to play.
    set((state) => ({
      toasts: state.toasts.map((t) => (t.id === id ? { ...t, dismissing: true } : t)),
    }))
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }, EXIT_MS)
  },
  markAllRead: () => set({ unreadCount: 0 }),
}))

export const toast = {
  success: (title: string, description?: string) => useToastStore.getState().push({ title, description, variant: 'success' }),
  error: (title: string, description?: string) => useToastStore.getState().push({ title, description, variant: 'error' }),
  info: (title: string, description?: string) => useToastStore.getState().push({ title, description, variant: 'info' }),
}
