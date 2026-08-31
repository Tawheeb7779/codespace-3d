import { describe, expect, it } from 'vitest'
import { buildTree } from './buildTree'
import type { FileNode } from '@/types/project'

function node(path: string, kind: 'file' | 'directory' = 'file'): FileNode {
  return { path, kind, content: kind === 'file' ? '' : undefined, createdAt: '', updatedAt: '' }
}

describe('buildTree', () => {
  it('nests files under their directories', () => {
    const tree = buildTree([node('src/a.txt'), node('src/nested/b.txt'), node('package.json')])
    const src = tree.find((n) => n.name === 'src')!
    expect(src.kind).toBe('directory')
    expect(src.children.map((c) => c.name)).toEqual(['nested', 'a.txt'])
    const nested = src.children.find((c) => c.name === 'nested')!
    expect(nested.children[0].path).toBe('src/nested/b.txt')
  })

  it('sorts directories before files, alphabetically within each group', () => {
    const tree = buildTree([node('z.txt'), node('a.txt'), node('lib', 'directory'), node('lib/x.txt')])
    expect(tree.map((n) => n.name)).toEqual(['lib', 'a.txt', 'z.txt'])
  })
})
