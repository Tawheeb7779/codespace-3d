import { Buffer } from 'buffer'

/**
 * isomorphic-git uses Node's `Buffer` internally (for hashing/base64).
 * Vite doesn't polyfill Node globals in the browser, so it's provided
 * explicitly here — imported once before any Git operation runs.
 */
if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = Buffer
}
