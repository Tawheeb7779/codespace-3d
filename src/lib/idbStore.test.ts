import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * src/test/setup.ts globally mocks '@/lib/idbStore' with an in-memory map
 * for every other test file — appropriate for testing callers, but it would
 * hide the exact bug this file exists to guard against. That bug: a version
 * bump on indexedDB.open() (like the one that added the 'tasks' store)
 * blocks indefinitely — with no event at all — if another tab still holds a
 * connection to the previous version, and until openDb() grew an
 * `onblocked` handler, that left Create Project's local-mode write hanging
 * forever with zero console output. So this file un-mocks the module and
 * drives a hand-built fake `indexedDB` to exercise the real open logic.
 */
vi.unmock('@/lib/idbStore')

interface FakeRequest {
  onupgradeneeded: (() => void) | null
  onblocked: (() => void) | null
  onsuccess: (() => void) | null
  onerror: (() => void) | null
  result: unknown
  error: unknown
}

function makeFakeDb() {
  const stores = new Map<string, Map<string, unknown>>()
  return {
    objectStoreNames: { contains: (name: string) => stores.has(name) },
    createObjectStore: (name: string) => {
      stores.set(name, new Map())
    },
    onversionchange: null as (() => void) | null,
    close: vi.fn(),
    transaction: (name: string) => {
      const store = stores.get(name) ?? new Map()
      stores.set(name, store)
      const tx = {
        oncomplete: null as (() => void) | null,
        onerror: null as (() => void) | null,
        objectStore: () => ({
          get: (key: string) => {
            const req: { onsuccess: (() => void) | null; onerror: (() => void) | null; result: unknown } = {
              onsuccess: null,
              onerror: null,
              result: undefined,
            }
            queueMicrotask(() => {
              req.result = store.get(key)
              req.onsuccess?.()
            })
            return req
          },
          put: (value: unknown, key: string) => {
            store.set(key, value)
            queueMicrotask(() => tx.oncomplete?.())
          },
          delete: (key: string) => {
            store.delete(key)
            queueMicrotask(() => tx.oncomplete?.())
          },
          getAllKeys: () => {
            const req: { onsuccess: (() => void) | null; onerror: (() => void) | null; result: unknown } = {
              onsuccess: null,
              onerror: null,
              result: undefined,
            }
            queueMicrotask(() => {
              req.result = Array.from(store.keys())
              req.onsuccess?.()
            })
            return req
          },
        }),
      }
      return tx
    },
  }
}

/** behavior controls what the fake `indexedDB.open()` request does next tick. */
function installFakeIndexedDb(behavior: 'success' | 'blocked' | 'hang') {
  const open = vi.fn((): FakeRequest => {
    const req: FakeRequest = { onupgradeneeded: null, onblocked: null, onsuccess: null, onerror: null, result: null, error: null }
    queueMicrotask(() => {
      if (behavior === 'hang') return // never settles — the 5s timeout backstop must fire
      if (behavior === 'blocked') {
        req.onblocked?.()
        return
      }
      req.result = makeFakeDb()
      req.onupgradeneeded?.()
      req.onsuccess?.()
    })
    return req
  })
  vi.stubGlobal('indexedDB', { open })
  return open
}

describe('idbStore openDb() (real IndexedDB open logic)', () => {
  beforeEach(() => {
    vi.resetModules() // fresh module instance each test → dbPromise cache starts null
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('opens normally and round-trips a value', async () => {
    installFakeIndexedDb('success')
    const { idbSet, idbGet } = await import('@/lib/idbStore')
    await idbSet('settings', 'k', { hello: 'world' })
    await expect(idbGet('settings', 'k')).resolves.toEqual({ hello: 'world' })
  })

  it('rejects with an actionable error when blocked by a stale tab, then succeeds on retry once unblocked', async () => {
    const openBlocked = installFakeIndexedDb('blocked')
    const { idbGet } = await import('@/lib/idbStore')

    await expect(idbGet('settings', 'k')).rejects.toThrow(/locked by another open tab/i)
    expect(openBlocked).toHaveBeenCalledTimes(1)

    // Simulate the stale tab closing: a fresh open() now succeeds. The
    // rejected dbPromise must have been reset to null so this retry
    // actually re-opens instead of replaying the same rejection forever.
    installFakeIndexedDb('success')
    await expect(idbGet('settings', 'k')).resolves.toBeUndefined()
  })

  it('rejects with a timeout error if the open request never settles, and resets so a later retry can succeed', async () => {
    vi.useFakeTimers()
    installFakeIndexedDb('hang')
    const { idbGet } = await import('@/lib/idbStore')

    const pending = idbGet('settings', 'k')
    const assertion = expect(pending).rejects.toThrow(/timed out opening local storage/i)
    await vi.advanceTimersByTimeAsync(5000)
    await assertion

    vi.useRealTimers()
    installFakeIndexedDb('success')
    await expect(idbGet('settings', 'k')).resolves.toBeUndefined()
  })
})
