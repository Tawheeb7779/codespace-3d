import { describe, expect, it } from 'vitest'
import { detectFramework, detectPackageManager, detectRunConfig, STATIC_SERVER_PORT } from './RuntimeDetection'
import type { ProjectFilesLike } from './RuntimeDetection'

function makeFiles(entries: Record<string, string>): ProjectFilesLike {
  return {
    exists: (path) => path in entries,
    read: (path) => {
      if (!(path in entries)) throw new Error(`missing ${path}`)
      return entries[path]
    },
  }
}

describe('detectPackageManager', () => {
  it('detects pnpm from lockfile', () => {
    expect(detectPackageManager(makeFiles({ 'pnpm-lock.yaml': '' }))).toBe('pnpm')
  })

  it('detects yarn from lockfile', () => {
    expect(detectPackageManager(makeFiles({ 'yarn.lock': '' }))).toBe('yarn')
  })

  it('detects npm from lockfile', () => {
    expect(detectPackageManager(makeFiles({ 'package-lock.json': '' }))).toBe('npm')
  })

  it('prefers lockfile over packageManager field', () => {
    const files = makeFiles({
      'yarn.lock': '',
      'package.json': JSON.stringify({ packageManager: 'pnpm@8.0.0' }),
    })
    expect(detectPackageManager(files)).toBe('yarn')
  })

  it('falls back to packageManager field when no lockfile exists', () => {
    const files = makeFiles({ 'package.json': JSON.stringify({ packageManager: 'pnpm@8.0.0' }) })
    expect(detectPackageManager(files)).toBe('pnpm')
  })

  it('defaults to npm with nothing to go on', () => {
    expect(detectPackageManager(makeFiles({}))).toBe('npm')
  })
})

describe('detectRunConfig', () => {
  it('uses the "dev" script when present, never assuming npm run dev blindly for others', () => {
    const files = makeFiles({
      'package.json': JSON.stringify({ scripts: { dev: 'vite', build: 'vite build' } }),
      'yarn.lock': '',
    })
    const config = detectRunConfig(files)
    expect(config?.command).toEqual(['yarn', 'dev'])
  })

  it('detects Next.js via dependency even without an explicit dev script', () => {
    const files = makeFiles({
      'package.json': JSON.stringify({ dependencies: { next: '14.0.0' }, scripts: {} }),
    })
    const config = detectRunConfig(files)
    expect(config?.command).toEqual(['npm', 'run', 'dev'])
    expect(config?.reason).toMatch(/next/i)
  })

  it('falls back to "start" script for non-dev projects', () => {
    const files = makeFiles({
      'package.json': JSON.stringify({ scripts: { start: 'node server.js' } }),
    })
    expect(detectRunConfig(files)?.command).toEqual(['npm', 'run', 'start'])
  })

  it('treats a plain static HTML project as directly servable via a built-in static server, not npm-run', () => {
    const config = detectRunConfig(makeFiles({ 'index.html': '<html></html>' }))
    expect(config?.command[0]).toBe('node')
    expect(config?.command[1]).toBe('-e')
    // The inline script should be a real, non-empty server, not the old
    // empty-command placeholder — and should actually listen on the
    // documented static-server port so Preview can reach it.
    expect(config?.command[2]).toContain(`port = ${STATIC_SERVER_PORT}`)
    expect(config?.command[2]).toContain('createServer')
  })

  it('returns null when nothing runnable is detected', () => {
    const config = detectRunConfig(makeFiles({ 'package.json': JSON.stringify({ scripts: {} }) }))
    expect(config).toBeNull()
  })
})

describe('detectFramework', () => {
  it('identifies React from dependencies', () => {
    const files = makeFiles({ 'package.json': JSON.stringify({ dependencies: { react: '^19.0.0' } }) })
    expect(detectFramework(files)?.id).toBe('react')
  })

  it('returns null with no package.json', () => {
    expect(detectFramework(makeFiles({}))).toBeNull()
  })
})
