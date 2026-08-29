import { useState } from 'react'
import { Link } from 'react-router-dom'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Copy, Download, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/misc'
import { Input } from '@/components/ui/Input'
import { getTemplate } from '@/features/projects/templates'
import type { Project } from '@/types/project'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function ProjectCard({
  project,
  onRename,
  onDuplicate,
  onDelete,
  onExport,
}: {
  project: Project
  onRename: (id: string, name: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  onExport: (id: string) => void
}) {
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(project.name)
  const template = getTemplate(project.templateId)

  function submitRename() {
    setRenaming(false)
    if (name.trim() && name !== project.name) onRename(project.id, name.trim())
  }

  return (
    <div className="group relative rounded-xl border border-graphite-800 bg-graphite-900/50 p-4 transition-colors hover:border-graphite-700">
      <div className="flex items-start justify-between">
        {renaming ? (
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={submitRename}
            onKeyDown={(e) => e.key === 'Enter' && submitRename()}
            className="h-7 text-sm"
          />
        ) : (
          <Link to={`/projects/${project.id}`} className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-graphite-100 group-hover:text-white">{project.name}</p>
          </Link>
        )}

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              className="reveal-on-hover -m-1 ml-1 shrink-0 rounded-lg p-2 text-graphite-500 opacity-0 transition-opacity hover:bg-graphite-800 hover:text-graphite-200 group-hover:opacity-100 data-[state=open]:opacity-100"
              aria-label={`Actions for ${project.name}`}
            >
              <MoreVertical size={16} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              className="z-40 min-w-40 rounded-lg border border-graphite-800 bg-graphite-850 p-1 shadow-xl data-[state=open]:animate-fade-in"
            >
              <DropdownMenu.Item
                onSelect={() => setRenaming(true)}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-graphite-200 outline-none hover:bg-graphite-800"
              >
                <Pencil size={14} /> Rename
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={() => onDuplicate(project.id)}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-graphite-200 outline-none hover:bg-graphite-800"
              >
                <Copy size={14} /> Duplicate
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={() => onExport(project.id)}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-graphite-200 outline-none hover:bg-graphite-800"
              >
                <Download size={14} /> Export ZIP
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 h-px bg-graphite-800" />
              <DropdownMenu.Item
                onSelect={() => onDelete(project.id)}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-signal-red outline-none hover:bg-signal-red/10"
              >
                <Trash2 size={14} /> Delete
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {project.description && <p className="mt-1.5 truncate text-xs text-graphite-500">{project.description}</p>}

      <div className="mt-4 flex items-center gap-2">
        {template && <Badge>{template.name}</Badge>}
        <span className="text-xs text-graphite-600">Updated {timeAgo(project.updatedAt)}</span>
      </div>
    </div>
  )
}
