import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { Flame, Folder, LayoutGrid, LogOut, Plus, Search, Settings, Users } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useAuthStore } from '@/stores/authStore'
import { useDashboardUiStore } from '@/stores/dashboardUiStore'
import { toast } from '@/stores/toastStore'
import { Badge } from '@/components/ui/misc'
import { ProjectService } from '@/services/ProjectService'
import type { Project } from '@/types/project'

const NAV = [
  { to: '/dashboard', label: 'Projects', icon: LayoutGrid },
  { to: '/teams', label: 'Teams', icon: Users },
]

/**
 * The dashboard's persistent nav: brand, primary action, real recent-projects
 * list, section nav, and account — rendered both as a static column on wide
 * screens and inside the same physics-driven drawer the IDE workspace uses
 * on narrower ones (see `DashboardLayout`), so it only exists once.
 */
export function DashboardSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, status, signOut } = useAuthStore(
    useShallow((s) => ({ user: s.user, status: s.status, signOut: s.signOut })),
  )
  const requestCreateProject = useDashboardUiStore((s) => s.requestCreateProject)
  const navigate = useNavigate()
  const [recent, setRecent] = useState<Project[]>([])
  const [filter, setFilter] = useState('')

  useEffect(() => {
    let cancelled = false
    ProjectService.list(user?.id ?? null)
      .then((list) => {
        if (cancelled) return
        setRecent([...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6))
      })
      .catch(() => {
        // The dashboard page itself surfaces load failures; this list is a
        // secondary convenience and fails quietly rather than doubling up.
      })
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const visibleRecent = filter
    ? recent.filter((p) => p.name.toLowerCase().includes(filter.toLowerCase()))
    : recent

  async function handleSignOut() {
    try {
      await signOut()
    } catch (err) {
      toast.error('Sign out failed', err instanceof Error ? err.message : undefined)
      return
    }
    navigate('/')
  }

  function handleNewProject() {
    requestCreateProject()
    navigate('/dashboard')
    onNavigate?.()
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-4">
        <Link
          to="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-2 text-[0.9375rem] font-semibold tracking-[-0.014em] text-graphite-50"
        >
          <Flame size={18} className="text-ember-500" />
          Forge IDE
        </Link>
        {status === 'local' && <Badge variant="warning">Local</Badge>}
      </div>

      <div className="px-3 pt-4">
        <button
          onClick={handleNewProject}
          className={clsx(
            'flex w-full items-center justify-center gap-2 rounded-control bg-ember-500 px-3.5 py-2.5',
            'text-sm font-medium text-white',
            'shadow-[inset_0_1px_0_0_rgb(255_255_255/0.18),0_1px_2px_rgb(0_0_0/0.3)]',
            'transition-[background-color,transform] duration-150 hover:bg-ember-400 active:scale-[0.975] motion-reduce:active:scale-100',
          )}
        >
          <Plus size={16} /> New Project
        </button>
      </div>

      <div className="px-3 pt-3">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-graphite-500" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search projects…"
            aria-label="Search recent projects"
            className="h-9 w-full rounded-control border border-hairline bg-surface-sunken pl-8 pr-3 text-[0.8125rem] text-graphite-200 outline-none transition-colors placeholder:text-graphite-600 focus:border-hairline-strong focus:ring-[3px] focus:ring-ember-500/20"
          />
        </div>
      </div>

      <nav className="mt-4 flex flex-col gap-0.5 px-3">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.8125rem] font-medium transition-colors duration-150',
                isActive
                  ? 'bg-surface-hover text-graphite-50'
                  : 'text-graphite-400 hover:bg-surface-raised hover:text-graphite-100',
              )
            }
          >
            <item.icon size={15} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mx-3 my-4 h-px bg-hairline" />

      <div className="flex min-h-0 flex-1 flex-col px-3">
        <p className="type-label px-2 text-graphite-600">Recent projects</p>
        <div className="scrollbar-thin mt-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto pb-2">
          {visibleRecent.length === 0 ? (
            <p className="px-2 py-3 text-[0.8125rem] text-graphite-600">
              {recent.length === 0 ? 'No projects yet' : 'No matches'}
            </p>
          ) : (
            visibleRecent.map((project) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                onClick={onNavigate}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.8125rem] text-graphite-300 transition-colors duration-150 hover:bg-surface-raised hover:text-graphite-100"
              >
                <Folder size={14} className="shrink-0 text-graphite-500" />
                <span className="truncate">{project.name}</span>
              </Link>
            ))
          )}
        </div>
      </div>

      <div className="mx-3 h-px bg-hairline" />

      <div className="flex items-center gap-2.5 px-4 py-3.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-hover text-[0.8125rem] font-medium text-graphite-300 ring-1 ring-inset ring-hairline">
          {(user?.displayName ?? '?').slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.8125rem] font-medium text-graphite-100">{user?.displayName ?? 'Guest'}</p>
          {user?.email && <p className="truncate text-[0.6875rem] text-graphite-600">{user.email}</p>}
        </div>
        <Link
          to="/settings"
          onClick={onNavigate}
          aria-label="Settings"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-graphite-500 transition-colors duration-150 hover:bg-surface-hover hover:text-graphite-100"
        >
          <Settings size={14} />
        </Link>
        {status === 'authenticated' && (
          <button
            onClick={handleSignOut}
            aria-label="Sign out"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-graphite-500 transition-colors duration-150 hover:bg-surface-hover hover:text-graphite-100"
          >
            <LogOut size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
