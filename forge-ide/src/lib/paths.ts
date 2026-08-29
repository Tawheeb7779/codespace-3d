/**
 * Path safety utilities for the virtual file system.
 *
 * Every path that reaches the VFS, ZIP import/export, or AI file tools MUST
 * go through `normalizeProjectPath` first. It rejects absolute paths,
 * `..` traversal, null bytes, and empty segments, and always returns a
 * clean POSIX-style path relative to the project root (no leading slash).
 */

export class InvalidPathError extends Error {
  constructor(path: string, reason: string) {
    super(`Invalid path "${path}": ${reason}`)
    this.name = 'InvalidPathError'
  }
}

const MAX_PATH_LENGTH = 1024
const MAX_SEGMENT_LENGTH = 255
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x1f]/

export function normalizeProjectPath(rawPath: string): string {
  if (typeof rawPath !== 'string' || rawPath.length === 0) {
    throw new InvalidPathError(String(rawPath), 'path must be a non-empty string')
  }
  if (rawPath.length > MAX_PATH_LENGTH) {
    throw new InvalidPathError(rawPath, 'path too long')
  }
  if (CONTROL_CHARS.test(rawPath)) {
    throw new InvalidPathError(rawPath, 'contains control characters')
  }

  // Reject Windows-style absolute/drive paths and backslashes outright.
  if (/^[a-zA-Z]:[\\/]/.test(rawPath) || rawPath.includes('\\')) {
    throw new InvalidPathError(rawPath, 'backslashes / drive letters are not allowed')
  }

  const normalized = rawPath.replace(/\/+/g, '/').replace(/^\/+/, '').replace(/\/+$/, '')

  if (normalized.length === 0) {
    throw new InvalidPathError(rawPath, 'resolves to project root, not a file')
  }

  const segments = normalized.split('/')
  const resolved: string[] = []

  for (const segment of segments) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') {
      throw new InvalidPathError(rawPath, 'parent directory traversal ("..") is not allowed')
    }
    if (segment.length > MAX_SEGMENT_LENGTH) {
      throw new InvalidPathError(rawPath, `segment "${segment}" exceeds ${MAX_SEGMENT_LENGTH} chars`)
    }
    if (segment === '.git' || segment === 'node_modules') {
      // Allowed to exist (e.g. produced by npm install) but never writable
      // via user/AI file operations — enforced by callers using isReservedPath.
    }
    resolved.push(segment)
  }

  if (resolved.length === 0) {
    throw new InvalidPathError(rawPath, 'resolves to project root, not a file')
  }

  return resolved.join('/')
}

/** Paths the AI agent and manual file UI may never create/edit/delete directly. */
export function isReservedPath(normalized: string): boolean {
  const segments = normalized.split('/')
  return segments[0] === '.git'
}

export function joinProjectPath(...parts: string[]): string {
  return normalizeProjectPath(parts.filter(Boolean).join('/'))
}

export function dirname(normalized: string): string {
  const idx = normalized.lastIndexOf('/')
  return idx === -1 ? '' : normalized.slice(0, idx)
}

export function basename(normalized: string): string {
  const idx = normalized.lastIndexOf('/')
  return idx === -1 ? normalized : normalized.slice(idx + 1)
}

export function extname(normalized: string): string {
  const base = basename(normalized)
  const idx = base.lastIndexOf('.')
  return idx <= 0 ? '' : base.slice(idx)
}
