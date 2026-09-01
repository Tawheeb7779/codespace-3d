import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Cloud, FolderPlus, HardDrive, Search, Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge, EmptyState, Spinner } from '@/components/ui/misc'
import { CreateProjectDialog } from '@/features/projects/CreateProjectDialog'
import { ProjectCard, timeAgo } from '@/features/projects/ProjectCard'
import { getTemplate } from '@/features/projects/templates'
import { templateIcon } from '@/features/projects/templateIcons'
import { ShareProjectDialog } from '@/features/projects/ShareProjectDialog'
import { ProjectService } from '@/services/ProjectService'
import { TeamService } from '@/services/TeamService'
import { exportProjectAsZip, importZipIntoProject } from '@/services/ProjectExport'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'
import type { Project } from '@/types/project'
import type { Team } from '@/types/team'
import { describeError } from '@/lib/describeError'

type SortKey = 'updated' | 'name'
type FilterKey = 'all' | 'personal' | 'shared'

export function DashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('updated')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])
  const [sharingProjectId, setSharingProjectId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function refresh() {
    setLoading(true)
    try {
      const list = await ProjectService.list(user?.id ?? null)
      setProjects(list)
    } catch (err) {
      toast.error('Failed to load projects', describeError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    if (TeamService.isAvailable) {
      TeamService.listForUser()
        .then(setTeams)
        .catch(() => {
          // Team badges/sharing are a secondary affordance here; the Teams
          // page itself surfaces a real load failure if there is one.
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const teamNameById = useMemo(() => new Map(teams.map((t) => [t.id, t.name])), [teams])
  const sharingProject = projects.find((p) => p.id === sharingProjectId) ?? null

  async function handleAttachToTeam(teamId: string) {
    if (!sharingProject) return
    const updated = await ProjectService.attachToTeam(sharingProject.id, teamId)
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    toast.success('Project shared with team')
  }

  async function handleDetachFromTeam() {
    if (!sharingProject) return
    const updated = await ProjectService.detachFromTeam(sharingProject.id)
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    toast.success('Project removed from team')
  }

  // The sidebar's "New Project" button lives outside this page (it's part
  // of the shared dashboard shell) and can be clicked from any page, so it
  // asks for the dialog via router state on the navigation to /dashboard —
  // delivered atomically with the navigation itself, so it can't be missed
  // regardless of whether this page was already mounted (a global "request"
  // counter incremented before this component mounts is invisible to a
  // useState initializer that captures the post-increment value as its own
  // start — that was the actual bug behind "Create Project" silently doing
  // nothing when triggered from outside the dashboard page).
  const location = useLocation()
  useEffect(() => {
    if ((location.state as { openCreateProject?: boolean } | null)?.openCreateProject) {
      setCreateOpen(true)
      navigate(location.pathname, { replace: true, state: {} })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  const visible = useMemo(() => {
    const filtered = projects.filter((p) => {
      if (!p.name.toLowerCase().includes(query.toLowerCase())) return false
      if (filter === 'shared') return p.teamId != null
      if (filter === 'personal') return p.teamId == null
      return true
    })
    return [...filtered].sort((a, b) =>
      sort === 'name' ? a.name.localeCompare(b.name) : b.updatedAt.localeCompare(a.updatedAt),
    )
  }, [projects, query, sort, filter])

  /*
   * "Recent" is only worth its screen space once there are enough projects
   * that scanning the full grid is a chore, and only when the user isn't
   * already narrowing the list themselves — showing a Recent strip above
   * filtered results would just repeat rows the filter already surfaced.
   */
  const showRecent = projects.length > 3 && query === '' && filter === 'all'
  const recent = useMemo(
    () => (showRecent ? [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4) : []),
    [projects, showRecent],
  )

  async function handleCreate(input: { name: string; templateId: string }) {
    try {
      const project = await ProjectService.create(input, user?.id ?? null)
      toast.success('Project created')
      navigate(`/projects/${project.id}`)
    } catch (err) {
      toast.error('Failed to create project', describeError(err))
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
      toast.error('Failed to duplicate project', describeError(err))
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
      toast.error('Import failed', describeError(err))
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="type-display text-graphite-50">Projects</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="type-body text-graphite-500">
              <span data-numeric>{projects.length}</span> project{projects.length === 1 ? '' : 's'}
            </p>
            <span className="text-graphite-700" aria-hidden>
              ·
            </span>
            {/* States the storage mode up front instead of leaving the user to
                infer it: local mode has real consequences (no sync, no teams). */}
            <Badge variant="info" className="gap-1">
              {ProjectService.isCloud ? <Cloud size={10} /> : <HardDrive size={10} />}
              {ProjectService.isCloud ? 'Cloud workspace' : 'Local workspace'}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2.5">
          <input ref={fileInputRef} type="file" accept=".zip" className="hidden" onChange={handleImport} />
          <Button variant="outline" size="lg" onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} /> Import
          </Button>
          <Button variant="primary" size="lg" onClick={() => setCreateOpen(true)}>
            <FolderPlus size={16} /> New Project
          </Button>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-graphite-500" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects…"
            className="pl-10"
            aria-label="Search projects"
          />
        </div>
        {TeamService.isAvailable && (
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterKey)}
            aria-label="Filter projects"
            className="h-11 rounded-control border border-hairline bg-surface-raised px-3.5 text-sm text-graphite-300 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.04)] outline-none transition-colors hover:border-hairline-strong hover:text-graphite-100 focus:ring-[3.5px] focus:ring-ember-500/20 sm:w-40"
          >
            <option value="all">All projects</option>
            <option value="personal">Personal</option>
            <option value="shared">Shared with team</option>
          </select>
        )}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="Sort projects"
          className="h-11 rounded-control border border-hairline bg-surface-raised px-3.5 text-sm text-graphite-300 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.04)] outline-none transition-colors hover:border-hairline-strong hover:text-graphite-100 focus:ring-[3.5px] focus:ring-ember-500/20 sm:w-44"
        >
          <option value="updated">Last modified</option>
          <option value="name">Name</option>
        </select>
      </div>

      {recent.length > 0 && (
        <section className="mt-8" aria-labelledby="recent-projects-heading">
          <div className="flex items-center gap-3">
            <h2 id="recent-projects-heading" className="type-label text-graphite-500">
              Recent
            </h2>
            <div className="hairline-fade flex-1" aria-hidden />
          </div>
          {/* Deliberately not the same card as the grid below. Recent and All
              overlap by definition, so rendering identical cards twice reads
              as a bug; this is a compact jump-back-in row instead — one line
              per project, tuned for "resume what I was doing". */}
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {recent.map((project) => {
              const t = getTemplate(project.templateId)
              const Icon = templateIcon(t?.icon ?? 'file')
              return (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="surface-panel group flex items-center gap-2.5 rounded-control px-3 py-2.5 transition-[border-color,background-color] duration-150 hover:border-ember-500/40 hover:bg-surface-hover/50"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-hover text-graphite-400 ring-1 ring-inset ring-hairline transition-colors group-hover:text-ember-400">
                    <Icon size={13} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.8125rem] font-medium text-graphite-100">{project.name}</span>
                    <span className="block text-[0.6875rem] text-graphite-600" data-numeric>
                      {timeAgo(project.updatedAt)}
                    </span>
                  </span>
                  <ArrowRight size={13} className="shrink-0 text-graphite-600 transition-colors group-hover:text-ember-400" />
                </Link>
              )
            })}
          </div>
        </section>
      )}

      <div className="mt-7">
        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size={22} />
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={FolderPlus}
            title={projects.length === 0 ? 'No projects yet' : 'No projects match your search'}
            description={
              projects.length === 0
                ? 'Create your first project to get started — pick a template and it opens straight in the editor.'
                : `Nothing matches “${query}”. Try a different search.`
            }
            action={
              projects.length === 0 ? (
                <Button variant="primary" size="lg" onClick={() => setCreateOpen(true)}>
                  <FolderPlus size={16} /> New Project
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            {recent.length > 0 && (
              <div className="mb-3 flex items-center gap-3">
                <h2 className="type-label text-graphite-500">All projects</h2>
                <div className="hairline-fade flex-1" aria-hidden />
              </div>
            )}
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visible.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                isOwner={TeamService.isAvailable && project.ownerId === user?.id}
                teamName={project.teamId ? teamNameById.get(project.teamId) : undefined}
                onRename={handleRename}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onExport={handleExport}
                onManageTeam={setSharingProjectId}
              />
              ))}
            </div>
          </>
        )}
      </div>

      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} onCreate={handleCreate} />
      {sharingProject && (
        <ShareProjectDialog
          open={sharingProjectId !== null}
          onOpenChange={(open) => !open && setSharingProjectId(null)}
          project={sharingProject}
          teams={teams}
          onAttach={handleAttachToTeam}
          onDetach={handleDetachFromTeam}
        />
      )}
    </div>
  )
}
