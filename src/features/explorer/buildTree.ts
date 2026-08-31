import type { FileNode } from '@/types/project'

export interface TreeNode {
  name: string
  path: string
  kind: 'file' | 'directory'
  children: TreeNode[]
}

export function buildTree(nodes: FileNode[]): TreeNode[] {
  const root: TreeNode = { name: '', path: '', kind: 'directory', children: [] }
  const byPath = new Map<string, TreeNode>([['', root]])

  const sorted = [...nodes].sort((a, b) => a.path.localeCompare(b.path))

  for (const node of sorted) {
    const segments = node.path.split('/')
    let parentPath = ''
    for (let i = 0; i < segments.length; i++) {
      const path = segments.slice(0, i + 1).join('/')
      if (byPath.has(path)) {
        parentPath = path
        continue
      }
      const isLeaf = i === segments.length - 1
      const treeNode: TreeNode = {
        name: segments[i],
        path,
        kind: isLeaf ? node.kind : 'directory',
        children: [],
      }
      byPath.set(path, treeNode)
      byPath.get(parentPath)!.children.push(treeNode)
      parentPath = path
    }
  }

  const sortChildren = (n: TreeNode) => {
    n.children.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    n.children.forEach(sortChildren)
  }
  sortChildren(root)

  return root.children
}
