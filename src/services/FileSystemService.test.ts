import { beforeEach, describe, expect, it } from 'vitest'
import { FileSystemService, FileNotFoundError, PathConflictError } from './FileSystemService'
import { InvalidPathError } from '@/lib/paths'

describe('FileSystemService', () => {
  let fs: FileSystemService

  beforeEach(() => {
    fs = new FileSystemService('test-project')
  })

  it('writes and reads a file, creating parent directories', () => {
    fs.write('src/components/Button.tsx', 'export const Button = () => null')
    expect(fs.read('src/components/Button.tsx')).toBe('export const Button = () => null')
    expect(fs.exists('src')).toBe(true)
    expect(fs.exists('src/components')).toBe(true)
  })

  it('throws FileNotFoundError for missing files', () => {
    expect(() => fs.read('nope.txt')).toThrow(FileNotFoundError)
  })

  it('rejects path traversal on every mutating operation', () => {
    expect(() => fs.write('../escape.txt', 'x')).toThrow(InvalidPathError)
    expect(() => fs.createDirectory('../../etc')).toThrow(InvalidPathError)
    fs.write('a.txt', 'a')
    expect(() => fs.move('a.txt', '../a.txt')).toThrow(InvalidPathError)
    expect(() => fs.delete('../a.txt')).toThrow(InvalidPathError)
  })

  it('protects the reserved .git directory from direct writes', () => {
    expect(() => fs.write('.git/config', 'x')).toThrow(InvalidPathError)
    expect(() => fs.delete('.git')).toThrow(InvalidPathError)
  })

  it('renames/moves files and directories, updating nested paths', () => {
    fs.write('src/a.txt', 'a')
    fs.write('src/nested/b.txt', 'b')
    fs.move('src', 'lib')
    expect(fs.exists('src')).toBe(false)
    expect(fs.read('lib/a.txt')).toBe('a')
    expect(fs.read('lib/nested/b.txt')).toBe('b')
  })

  it('refuses to move onto an existing path', () => {
    fs.write('a.txt', 'a')
    fs.write('b.txt', 'b')
    expect(() => fs.move('a.txt', 'b.txt')).toThrow(PathConflictError)
  })

  it('duplicates files and directories independently', () => {
    fs.write('src/a.txt', 'original')
    fs.duplicate('src/a.txt', 'src/a-copy.txt')
    fs.write('src/a.txt', 'changed')
    expect(fs.read('src/a-copy.txt')).toBe('original')
  })

  it('deletes directories recursively', () => {
    fs.write('dir/a.txt', 'a')
    fs.write('dir/b/c.txt', 'c')
    fs.delete('dir')
    expect(fs.exists('dir')).toBe(false)
    expect(fs.exists('dir/a.txt')).toBe(false)
    expect(fs.exists('dir/b/c.txt')).toBe(false)
  })

  it('builds a WebContainer-compatible file tree', () => {
    fs.write('src/index.ts', 'console.log(1)')
    fs.write('package.json', '{}')
    const tree = fs.toFileSystemTree() as Record<string, unknown>
    expect(tree.package).toBeUndefined()
    expect(tree['package.json']).toEqual({ file: { contents: '{}' } })
    const src = tree.src as { directory: Record<string, unknown> }
    expect(src.directory['index.ts']).toEqual({ file: { contents: 'console.log(1)' } })
  })

  it('notifies subscribers on mutation', () => {
    let calls = 0
    const unsubscribe = fs.subscribe(() => calls++)
    fs.write('a.txt', 'a')
    fs.delete('a.txt')
    unsubscribe()
    fs.write('b.txt', 'b')
    expect(calls).toBe(2)
  })
})
