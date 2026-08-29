import { useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ChevronDown, ChevronRight, Copy, FilePlus, FolderPlus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { clsx } from 'clsx'
import { buildTree } from '@/features/explorer/buildTree'
import type { TreeNode } from '@/features/explorer/buildTree'
import { FileIcon } from '@/lib/fileIcon'
import { useFileList, useWorkspace } from '@/features/workspace/WorkspaceContext'
import { useEditorStore } from '@/stores/editorStore'
import { toast } from '@/stores/toastStore'
import { InvalidPathError } from '@/lib/paths'

export function FileTree() {
  const { fs } = useWorkspace()
  const nodes = useFileList()
  const openTab = useEditorStore((s) => s.open)
  const tree = buildTree(nodes)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggle(path: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(path) ? next.delete(path) : next.add(path)
      return next
    })
  }

  function createFile(parentPath: string) {
    const name = prompt('File name')
    if (!name) return
    const path = parentPath ? `${parentPath}/${name}` : name
    try {
      fs.write(path, '')
      openTab(fs, path)
      setExpanded((prev) => new Set(prev).add(parentPath))
    } catch (err) {
      toast.error('Could not create file', err instanceof InvalidPathError ? err.message : undefined)
    }
  }

  function createFolder(parentPath: string) {
    const name = prompt('Folder name')
    if (!name) return
    const path = parentPath ? `${parentPath}/${name}` : name
    try {
      fs.createDirectory(path)
      setExpanded((prev) => new Set(prev).add(parentPath).add(path))
    } catch (err) {
      toast.error('Could not create folder', err instanceof InvalidPathError ? err.message : undefined)
    }
  }

  function rename(node: TreeNode) {
    const name = prompt('New name', node.name)
    if (!name || name === node.name) return
    const parent = node.path.split('/').slice(0, -1).join('/')
    const to = parent ? `${parent}/${name}` : name
    try {
      fs.rename(node.path, to)
      useEditorStore.getState().close(node.path)
    } catch (err) {
      toast.error('Could not rename', err instanceof Error ? err.message : undefined)
    }
  }

  function duplicate(node: TreeNode) {
    const to = `${node.path}-copy`
    try {
      fs.duplicate(node.path, to)
    } catch (err) {
      toast.error('Could not duplicate', err instanceof Error ? err.message : undefined)
    }
  }

  function remove(node: TreeNode) {
    if (!confirm(`Delete "${node.path}"?`)) return
    fs.delete(node.path)
    useEditorStore.getState().close(node.path)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wide text-graphite-500">Explorer</span>
        <div className="flex gap-0.5">
          <button className="rounded p-1 text-graphite-500 hover:bg-graphite-800 hover:text-graphite-200" onClick={() => createFile('')} aria-label="New file">
            <FilePlus size={14} />
          </button>
          <button className="rounded p-1 text-graphite-500 hover:bg-graphite-800 hover:text-graphite-200" onClick={() => createFolder('')} aria-label="New folder">
            <FolderPlus size={14} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin px-1 pb-2">
        {tree.map((node) => (
          <Node
            key={node.path}
            node={node}
            depth={0}
            expanded={expanded}
            onToggle={toggle}
            onOpen={(path) => openTab(fs, path)}
            onCreateFile={createFile}
            onCreateFolder={createFolder}
            onRename={rename}
            onDuplicate={duplicate}
            onDelete={remove}
          />
        ))}
      </div>
    </div>
  )
}

function Node({
  node,
  depth,
  expanded,
  onToggle,
  onOpen,
  onCreateFile,
  onCreateFolder,
  onRename,
  onDuplicate,
  onDelete,
}: {
  node: TreeNode
  depth: number
  expanded: Set<string>
  onToggle: (path: string) => void
  onOpen: (path: string) => void
  onCreateFile: (parent: string) => void
  onCreateFolder: (parent: string) => void
  onRename: (node: TreeNode) => void
  onDuplicate: (node: TreeNode) => void
  onDelete: (node: TreeNode) => void
}) {
  const activePath = useEditorStore((s) => s.activePath)
  const isDir = node.kind === 'directory'
  const isOpen = expanded.has(node.path)

  return (
    <div>
      <div
        className={clsx(
          'group flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-sm',
          activePath === node.path ? 'bg-graphite-800 text-graphite-50' : 'text-graphite-300 hover:bg-graphite-850',
        )}
        style={{ paddingLeft: depth * 14 + 6 }}
      >
        <button
          onClick={() => (isDir ? onToggle(node.path) : onOpen(node.path))}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          {isDir ? (
            isOpen ? <ChevronDown size={13} className="shrink-0 text-graphite-500" /> : <ChevronRight size={13} className="shrink-0 text-graphite-500" />
          ) : (
            <FileIcon path={node.path} />
          )}
          <span className="truncate">{node.name}</span>
        </button>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              className="shrink-0 rounded p-0.5 opacity-0 hover:bg-graphite-700 group-hover:opacity-100 data-[state=open]:opacity-100"
              aria-label={`Actions for ${node.name}`}
            >
              <MoreHorizontal size={13} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
          <DropdownMenu.Content className="z-40 min-w-40 rounded-lg border border-graphite-800 bg-graphite-850 p-1 shadow-xl">
            {isDir && (
              <>
                <DropdownMenu.Item onSelect={() => onCreateFile(node.path)} className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-graphite-200 outline-none hover:bg-graphite-800">
                  <FilePlus size={14} /> New file
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => onCreateFolder(node.path)} className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-graphite-200 outline-none hover:bg-graphite-800">
                  <FolderPlus size={14} /> New folder
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px bg-graphite-800" />
              </>
            )}
            <DropdownMenu.Item onSelect={() => onRename(node)} className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-graphite-200 outline-none hover:bg-graphite-800">
              <Pencil size={14} /> Rename
            </DropdownMenu.Item>
            <DropdownMenu.Item onSelect={() => onDuplicate(node)} className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-graphite-200 outline-none hover:bg-graphite-800">
              <Copy size={14} /> Duplicate
            </DropdownMenu.Item>
            <DropdownMenu.Item onSelect={() => onDelete(node)} className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-signal-red outline-none hover:bg-signal-red/10">
              <Trash2 size={14} /> Delete
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {isDir && isOpen && (
        <div>
          {node.children.map((child) => (
            <Node
              key={child.path}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              onOpen={onOpen}
              onCreateFile={onCreateFile}
              onCreateFolder={onCreateFolder}
              onRename={onRename}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
