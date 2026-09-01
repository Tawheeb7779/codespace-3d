import { describe, expect, it } from 'vitest'
import { InvalidPathError, basename, dirname, extname, normalizeProjectPath } from './paths'

describe('normalizeProjectPath', () => {
  it('accepts normal relative paths', () => {
    expect(normalizeProjectPath('src/App.tsx')).toBe('src/App.tsx')
    expect(normalizeProjectPath('a/b/c.txt')).toBe('a/b/c.txt')
  })

  it('strips leading/trailing/duplicate slashes', () => {
    expect(normalizeProjectPath('/src//App.tsx/')).toBe('src/App.tsx')
  })

  it('rejects parent directory traversal', () => {
    expect(() => normalizeProjectPath('../secret')).toThrow(InvalidPathError)
    expect(() => normalizeProjectPath('a/../../secret')).toThrow(InvalidPathError)
    expect(() => normalizeProjectPath('a/b/../../../etc/passwd')).toThrow(InvalidPathError)
  })

  it('rejects absolute paths', () => {
    expect(() => normalizeProjectPath('/etc/passwd')).not.toThrow() // becomes "etc/passwd" (relative)
    expect(normalizeProjectPath('/etc/passwd')).toBe('etc/passwd')
  })

  it('rejects windows drive/backslash paths', () => {
    expect(() => normalizeProjectPath('C:\\Windows\\System32')).toThrow(InvalidPathError)
    expect(() => normalizeProjectPath('a\\b')).toThrow(InvalidPathError)
  })

  it('rejects empty or root-only paths', () => {
    expect(() => normalizeProjectPath('')).toThrow(InvalidPathError)
    expect(() => normalizeProjectPath('.')).toThrow(InvalidPathError)
    expect(() => normalizeProjectPath('///')).toThrow(InvalidPathError)
  })

  it('rejects control characters (null-byte injection)', () => {
    expect(() => normalizeProjectPath('src/App.tsx\u0000.png')).toThrow(InvalidPathError)
  })

  it('rejects overly long paths and segments', () => {
    expect(() => normalizeProjectPath('a'.repeat(2000))).toThrow(InvalidPathError)
    expect(() => normalizeProjectPath(`${'a'.repeat(300)}/file.txt`)).toThrow(InvalidPathError)
  })
})

describe('path helpers', () => {
  it('dirname/basename/extname', () => {
    expect(dirname('src/components/Button.tsx')).toBe('src/components')
    expect(dirname('file.txt')).toBe('')
    expect(basename('src/components/Button.tsx')).toBe('Button.tsx')
    expect(extname('Button.tsx')).toBe('.tsx')
    expect(extname('README')).toBe('')
    expect(extname('.gitignore')).toBe('')
  })
})
