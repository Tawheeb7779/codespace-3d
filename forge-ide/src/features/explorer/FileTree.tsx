import { useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ChevronDown, ChevronRight, Copy, FilePlus, FolderPlus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { clsx } from 'clsx'
import { buildTree } from '@/features/explorer/buildTree'
import type { TreeNode } from '@/features/explorer/buildTree'
import { FileIcon } from '@/lib/fileIcon'
import { useFileList, useWorkspace } from '@/features/workspace/WorkspaceContext'
import { useEditorStore } from '@/stores/editorStore'
import { useDiagnosticsStore } from '@/stores/diagnosticsStore'
import { useWorkspaceUiStore } from '@/stores/workspaceUiStore'
import { toast } from '@/stores/toastStore'
import { InvalidPathError } from '@/lib/paths'
import { menuContentClass, menuItemClass, menuItemDangerClass, menuSeparatorClass } from '@/components/ui/menu'

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
      useDiagnosticsStore.getState().clearPath(node.path)
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
    useDiagnosticsStore.getState().clearPath(node.path)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 py-2.5">
        <span className="type-label text-graphite-600">Explorer</span>
        <div className="flex gap-0.5">
          <button
            className="rounded-md p-1.5 text-graphite-500 transition-colors duration-150 hover:bg-surface-hover hover:text-graphite-100"
            onClick={() => createFile('')}
            aria-label="New file"
          >
            <FilePlus size={14} />
          </button>
          <button
            className="rounded-md p-1.5 text-graphite-500 transition-colors duration-150 hover:bg-surface-hover hover:text-graphite-100"
            onClick={() => createFolder('')}
            aria-label="New folder"
          >
            <FolderPlus size={14} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin px-1.5 pb-2">
        {tree.map((node) => (
          <Node
            key={node.path}
            node={node}
            depth={0}
            expanded={expanded}
            onToggle={toggle}
            onOpen={(path) => {
              openTab(fs, path)
              // On tablet the explorer is a drawer over the editor, so
              // picking a file should reveal what was just opened.
              useWorkspaceUiStore.getState().dismissOverlayPanels()
            }}
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
          'group flex w-full items-center gap-1.5 rounded-md py-[5px] pr-1 text-[0.8125rem] transition-colors duration-100',
          activePath === node.path
            ? 'bg-surface-hover text-graphite-50'
            : 'text-graphite-300 hover:bg-surface-raised',
        )}
        style={{ paddingLeft: depth * 12 + 8 }}
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
              className="reveal-on-hover shrink-0 rounded-md p-1 text-graphite-500 opacity-0 transition-[opacity,background-color,color] duration-150 hover:bg-surface-overlay hover:text-graphite-100 group-hover:opacity-100 data-[state=open]:opacity-100"
              aria-label={`Actions for ${node.name}`}
            >
              <MoreHorizontal size={13} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
          <DropdownMenu.Content sideOffset={4} className={menuContentClass}>
            {isDir && (
              <>
                <DropdownMenu.Item onSelect={() => onCreateFile(node.path)} className={menuItemClass}>
                  <FilePlus size={14} /> New file
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => onCreateFolder(node.path)} className={menuItemClass}>
                  <FolderPlus size={14} /> New folder
                </DropdownMenu.Item>
                <DropdownMenu.Separator className={menuSeparatorClass} />
              </>
            )}
            <DropdownMenu.Item onSelect={() => onRename(node)} className={menuItemClass}>
              <Pencil size={14} /> Rename
            </DropdownMenu.Item>
            <DropdownMenu.Item onSelect={() => onDuplicate(node)} className={menuItemClass}>
              <Copy size={14} /> Duplicate
            </DropdownMenu.Item>
            <DropdownMenu.Item onSelect={() => onDelete(node)} className={menuItemDangerClass}>
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
