import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// jsdom has no IndexedDB implementation. FileSystemService's persistence
// layer is exercised through its own in-memory API in tests, so the
// IndexedDB-backed store is swapped for a plain in-memory map.
vi.mock('@/lib/idbStore', () => {
  const memory = new Map<string, unknown>()
  const key = (store: string, k: string) => `${store}:${k}`
  return {
    idbGet: vi.fn(async (store: string, k: string) => memory.get(key(store, k))),
    idbSet: vi.fn(async (store: string, k: string, v: unknown) => {
      memory.set(key(store, k), v)
    }),
    idbDelete: vi.fn(async (store: string, k: string) => {
      memory.delete(key(store, k))
    }),
    idbKeys: vi.fn(async (store: string) =>
      Array.from(memory.keys())
        .filter((k) => k.startsWith(`${store}:`))
        .map((k) => k.slice(store.length + 1)),
    ),
  }
})
