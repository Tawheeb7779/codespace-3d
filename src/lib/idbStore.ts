/**
 * Minimal generic IndexedDB key/value store. Used for local-first
 * persistence of project file systems, settings, and AI conversation
 * history so work survives a reload without requiring a backend round trip.
 */

const DB_NAME = 'forge-ide'
const DB_VERSION = 2

/**
 * A version bump (like the one that added the 'tasks' store) triggers
 * `onupgradeneeded`, which the browser blocks — indefinitely, with no
 * event at all on this request — if any other tab still holds an open
 * connection to the previous version. Real-world example: a user leaves
 * an old Forge IDE tab open from before an update, then loads the new
 * code in a fresh tab. Without `onblocked`, that fresh tab's very first
 * IndexedDB call (e.g. Create Project's local-mode write) hangs forever
 * with no error and no console output — indistinguishable from "nothing
 * happens" to whoever's looking at it. Both `onblocked` and the timeout
 * below exist so this call always settles one way or the other.
 */
let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    const timeout = setTimeout(() => {
      dbPromise = null // let the next call try again instead of replaying this same timeout forever
      reject(
        new Error(
          'Timed out opening local storage. If another tab has this app open, close it and reload — a newer version can\'t upgrade the local database while an older tab still has it open.',
        ),
      )
    }, 5000)

    req.onupgradeneeded = () => {
      const db = req.result
      for (const store of ['projects', 'settings', 'ai-sessions', 'tasks']) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store)
        }
      }
    }
    req.onblocked = () => {
      clearTimeout(timeout)
      dbPromise = null
      reject(
        new Error(
          'Local storage is locked by another open tab of this app. Close any other Forge IDE tabs and reload this page.',
        ),
      )
    }
    req.onsuccess = () => {
      clearTimeout(timeout)
      // A later version bump elsewhere in the same tab (rare, but possible
      // across a hot-reload) can force-close this connection — drop the
      // cached promise so the next call reopens instead of reusing a dead one.
      req.result.onversionchange = () => {
        req.result.close()
        dbPromise = null
      }
      resolve(req.result)
    }
    req.onerror = () => {
      clearTimeout(timeout)
      dbPromise = null
      reject(req.error ?? new Error('Failed to open local storage.'))
    }
  })

  return dbPromise
}

export type StoreName = 'projects' | 'settings' | 'ai-sessions' | 'tasks'

export async function idbGet<T>(store: StoreName, key: string): Promise<T | undefined> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly')
    const req = tx.objectStore(store).get(key)
    req.onsuccess = () => resolve(req.result as T | undefined)
    req.onerror = () => reject(req.error)
  })
}

export async function idbSet<T>(store: StoreName, key: string, value: T): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    tx.objectStore(store).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function idbDelete(store: StoreName, key: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    tx.objectStore(store).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function idbKeys(store: StoreName): Promise<string[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly')
    const req = tx.objectStore(store).getAllKeys()
    req.onsuccess = () => resolve(req.result as string[])
    req.onerror = () => reject(req.error)
  })
}
