import { useState } from 'react'
import { Link } from 'react-router-dom'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Copy, Download, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/misc'
import { Input } from '@/components/ui/Input'
import { menuContentClass, menuItemClass, menuItemDangerClass, menuSeparatorClass } from '@/components/ui/menu'
import { getTemplate } from '@/features/projects/templates'
import { templateIcon } from '@/features/projects/templateIcons'
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

  const Icon = templateIcon(template?.icon ?? 'file')

  return (
    // Lifts by 1px on hover: a small, physical response that makes the whole
    // grid feel like a set of objects rather than a list of rectangles.
    <div className="surface-card group relative flex flex-col rounded-card p-4 transition-[transform,border-color,background-color] duration-200 ease-out hover:-translate-y-px hover:border-hairline-strong hover:bg-surface-hover/40 motion-reduce:hover:translate-y-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-hover text-graphite-400 ring-1 ring-inset ring-hairline transition-colors duration-200 group-hover:text-ember-400">
            <Icon size={16} />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            {renaming ? (
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={submitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitRename()
                  if (e.key === 'Escape') {
                    setName(project.name)
                    setRenaming(false)
                  }
                }}
                className="h-8 px-2 text-sm"
              />
            ) : (
              <Link to={`/projects/${project.id}`} className="block rounded">
                {/* Covers the card so the whole surface is the click target,
                    while the menu button above it stays independently clickable. */}
                <span className="absolute inset-0 rounded-card" aria-hidden />
                <p className="truncate text-[0.9375rem] font-medium tracking-[-0.011em] text-graphite-100 transition-colors group-hover:text-white">
                  {project.name}
                </p>
              </Link>
            )}
          </div>
        </div>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              className="reveal-on-hover relative -m-1 ml-1 shrink-0 rounded-lg p-2 text-graphite-500 opacity-0 transition-[opacity,background-color,color] duration-150 hover:bg-surface-hover hover:text-graphite-100 group-hover:opacity-100 data-[state=open]:opacity-100"
              aria-label={`Actions for ${project.name}`}
            >
              <MoreHorizontal size={16} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" sideOffset={6} className={menuContentClass}>
              <DropdownMenu.Item onSelect={() => setRenaming(true)} className={menuItemClass}>
                <Pencil size={14} className="text-graphite-500" /> Rename
              </DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => onDuplicate(project.id)} className={menuItemClass}>
                <Copy size={14} className="text-graphite-500" /> Duplicate
              </DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => onExport(project.id)} className={menuItemClass}>
                <Download size={14} className="text-graphite-500" /> Export ZIP
              </DropdownMenu.Item>
              <DropdownMenu.Separator className={menuSeparatorClass} />
              <DropdownMenu.Item onSelect={() => onDelete(project.id)} className={menuItemDangerClass}>
                <Trash2 size={14} /> Delete
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {project.description && (
        <p className="mt-2 line-clamp-2 pl-12 text-[0.8125rem] leading-relaxed text-graphite-500">
          {project.description}
        </p>
      )}

      <div className="mt-5 flex items-center gap-2 pl-12 pt-0.5">
        {template && <Badge>{template.name}</Badge>}
        <span className="text-[0.75rem] text-graphite-600" data-numeric>
          {timeAgo(project.updatedAt)}
        </span>
      </div>
    </div>
  )
}
