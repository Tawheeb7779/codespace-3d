import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderPlus, Search, Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState, Spinner } from '@/components/ui/misc'
import { CreateProjectDialog } from '@/features/projects/CreateProjectDialog'
import { ProjectCard } from '@/features/projects/ProjectCard'
import { ProjectService } from '@/services/ProjectService'
import { exportProjectAsZip, importZipIntoProject } from '@/services/ProjectExport'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'
import type { Project } from '@/types/project'

type SortKey = 'updated' | 'name'

export function DashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('updated')
  const [createOpen, setCreateOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function refresh() {
    setLoading(true)
    try {
      const list = await ProjectService.list(user?.id ?? null)
      setProjects(list)
    } catch (err) {
      toast.error('Failed to load projects', err instanceof Error ? err.message : undefined)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const visible = useMemo(() => {
    const filtered = projects.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    return [...filtered].sort((a, b) =>
      sort === 'name' ? a.name.localeCompare(b.name) : b.updatedAt.localeCompare(a.updatedAt),
    )
  }, [projects, query, sort])

  async function handleCreate(input: { name: string; templateId: string }) {
    try {
      const project = await ProjectService.create(input, user?.id ?? null)
      toast.success('Project created')
      navigate(`/projects/${project.id}`)
    } catch (err) {
      toast.error('Failed to create project', err instanceof Error ? err.message : undefined)
    }
  }

  async function handleRename(id: string, name: string) {
    await ProjectService.rename(id, name)
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)))
  }

  async function handleDuplicate(id: string) {
    try {
      await ProjectService.duplicate(id)
      toast.success('Project duplicated')
      refresh()
    } catch (err) {
      toast.error('Failed to duplicate project', err instanceof Error ? err.message : undefined)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this project? This cannot be undone.')) return
    await ProjectService.delete(id)
    setProjects((prev) => prev.filter((p) => p.id !== id))
    toast.success('Project deleted')
  }

  async function handleExport(id: string) {
    const project = projects.find((p) => p.id === id)
    if (!project) return
    const blob = await exportProjectAsZip(project)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.name.replace(/[^a-z0-9-_]+/gi, '-')}.zip`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const project = await ProjectService.create({ name: file.name.replace(/\.zip$/i, ''), templateId: 'blank' }, user?.id ?? null)
      const result = await importZipIntoProject(file, project.id)
      toast.success(`Imported ${result.imported} files`, result.skipped.length ? `${result.skipped.length} entries skipped as unsafe` : undefined)
      navigate(`/projects/${project.id}`)
    } catch (err) {
      toast.error('Import failed', err instanceof Error ? err.message : undefined)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-graphite-50">Projects</h1>
          <p className="mt-1 text-sm text-graphite-500">{projects.length} project{projects.length === 1 ? '' : 's'}</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept=".zip" className="hidden" onChange={handleImport} />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} /> Import
          </Button>
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <FolderPlus size={16} /> New Project
          </Button>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-graphite-500" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects…" className="pl-9" />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="h-9 rounded-lg border border-graphite-700 bg-graphite-900 px-3 text-sm text-graphite-300"
        >
          <option value="updated">Last modified</option>
          <option value="name">Name</option>
        </select>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size={22} />
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={FolderPlus}
            title={projects.length === 0 ? 'No projects yet' : 'No projects match your search'}
            description={projects.length === 0 ? 'Create your first project to get started.' : undefined}
            action={
              projects.length === 0 ? (
                <Button variant="primary" onClick={() => setCreateOpen(true)}>
                  <FolderPlus size={16} /> New Project
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onRename={handleRename}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onExport={handleExport}
              />
            ))}
          </div>
        )}
      </div>

      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} onCreate={handleCreate} />
    </div>
  )
}
