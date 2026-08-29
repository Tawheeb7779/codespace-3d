import { describe, expect, it } from 'vitest'
import { DEFAULT_POST_AUTH_PATH, safeRedirectPath } from './redirect'

describe('safeRedirectPath', () => {
  it('allows ordinary in-app paths', () => {
    expect(safeRedirectPath('/dashboard')).toBe('/dashboard')
    expect(safeRedirectPath('/projects/abc-123')).toBe('/projects/abc-123')
    expect(safeRedirectPath('/settings?tab=ai')).toBe('/settings?tab=ai')
  })

  it('falls back to the dashboard when nothing is requested', () => {
    expect(safeRedirectPath(null)).toBe(DEFAULT_POST_AUTH_PATH)
    expect(safeRedirectPath(undefined)).toBe(DEFAULT_POST_AUTH_PATH)
    expect(safeRedirectPath('')).toBe(DEFAULT_POST_AUTH_PATH)
  })

  it('rejects absolute URLs to other origins (open redirect)', () => {
    expect(safeRedirectPath('https://evil.com')).toBe(DEFAULT_POST_AUTH_PATH)
    expect(safeRedirectPath('http://evil.com/steal')).toBe(DEFAULT_POST_AUTH_PATH)
    expect(safeRedirectPath('javascript:alert(1)')).toBe(DEFAULT_POST_AUTH_PATH)
  })

  it('rejects protocol-relative and backslash-smuggled targets', () => {
    expect(safeRedirectPath('//evil.com')).toBe(DEFAULT_POST_AUTH_PATH)
    expect(safeRedirectPath('/\\evil.com')).toBe(DEFAULT_POST_AUTH_PATH)
  })

  it('rejects control characters and whitespace smuggling', () => {
    expect(safeRedirectPath('/dash\nboard')).toBe(DEFAULT_POST_AUTH_PATH)
    expect(safeRedirectPath('/ /evil.com')).toBe(DEFAULT_POST_AUTH_PATH)
    expect(safeRedirectPath('\t//evil.com')).toBe(DEFAULT_POST_AUTH_PATH)
  })
})
