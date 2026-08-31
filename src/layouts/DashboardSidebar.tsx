import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { BookOpen, Flame, Folder, Keyboard, LayoutGrid, LogOut, Plus, Search, Settings, Users } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'
import { Badge } from '@/components/ui/misc'
import { ProjectService } from '@/services/ProjectService'
import type { Project } from '@/types/project'

// Grouped by the areas of the app they belong to (spec §2: Workspace /
// Collaboration / System) rather than one flat list. Development, AI, and
// Data are per-project concerns — they live inside a project's own
// workspace (LeftRail, bottom panel, right panel), not here; duplicating
// them as outer nav links with nothing behind them until a project is
// open would be exactly the "empty section" the spec rules out.
const NAV_SECTIONS: Array<{ label: string; items: Array<{ to: string; label: string; icon: typeof LayoutGrid }> }> = [
  {
    label: 'Workspace',
    items: [{ to: '/dashboard', label: 'Projects', icon: LayoutGrid }],
  },
  {
    label: 'Collaboration',
    items: [{ to: '/teams', label: 'Teams', icon: Users }],
  },
  {
    label: 'System',
    items: [
      { to: '/settings', label: 'Settings', icon: Settings },
      { to: '/shortcuts', label: 'Keyboard Shortcuts', icon: Keyboard },
      { to: '/docs', label: 'Documentation', icon: BookOpen },
    ],
  },
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
    // Carried as navigation state rather than a global "request" counter:
    // a counter incremented before DashboardPage mounts (triggering this
    // from any page other than the dashboard itself) is invisible to a
    // `useState(count)` initializer that captures the already-incremented
    // value as its own starting point — the dialog would silently never
    // open. Router state arrives together with the navigation itself, so
    // it can't be missed regardless of whether DashboardPage was already
    // mounted.
    navigate('/dashboard', { state: { openCreateProject: true } })
    onNavigate?.()
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pb-1 pt-5">
        <Link to="/dashboard" onClick={onNavigate} className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ember-500/12 ring-1 ring-inset ring-ember-500/20">
            <Flame size={15} className="text-ember-400" />
          </span>
          <span className="text-[0.9375rem] font-semibold tracking-[-0.016em] text-graphite-50">Forge IDE</span>
        </Link>
        {status === 'local' && <Badge variant="warning">Local</Badge>}
      </div>

      <div className="px-3 pt-4">
        <button
          onClick={handleNewProject}
          className={clsx(
            'flex w-full items-center justify-center gap-2 rounded-full bg-ember-500 px-4 py-2.5',
            'text-[0.8125rem] font-semibold text-white',
            'shadow-[inset_0_1px_0_0_rgb(255_255_255/0.2),0_1px_2px_rgb(0_0_0/0.3),0_8px_20px_-8px_rgb(246_84_15/0.55)]',
            'transition-[background-color,transform,box-shadow] duration-150 ease-out',
            'hover:bg-ember-400 active:scale-[0.975] motion-reduce:active:scale-100',
          )}
        >
          <Plus size={15} /> New Project
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

      <nav className="mt-5 flex flex-col gap-4 px-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="type-label px-2.5 text-graphite-600">{section.label}</p>
            <div className="mt-1.5 flex flex-col gap-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-2.5 rounded-lg px-2.5 py-[0.4375rem] text-[0.8125rem] font-medium',
                      'transition-[background-color,color,transform] duration-150 ease-out',
                      'active:scale-[0.97] motion-reduce:active:scale-100',
                      isActive
                        ? 'nav-pill-active text-graphite-50'
                        : 'text-graphite-400 hover:bg-surface-raised hover:text-graphite-100',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon size={15} className={isActive ? 'text-ember-400' : ''} />
                      {item.label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="hairline-fade mx-3 my-5" />

      <div className="flex min-h-0 flex-1 flex-col px-3">
        <p className="type-label px-2.5 text-graphite-600">Recent projects</p>
        <div className="scrollbar-thin mt-2.5 min-h-0 flex-1 space-y-0.5 overflow-y-auto pb-2">
          {visibleRecent.length === 0 ? (
            <p className="px-2.5 py-3 text-[0.8125rem] text-graphite-600">
              {recent.length === 0 ? 'No projects yet' : 'No matches'}
            </p>
          ) : (
            visibleRecent.map((project) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                onClick={onNavigate}
                className={clsx(
                  'flex items-center gap-2.5 rounded-lg px-2.5 py-[0.4375rem] text-[0.8125rem] text-graphite-300',
                  'transition-[background-color,color,transform] duration-150 ease-out',
                  'hover:bg-surface-raised hover:text-graphite-100',
                  'active:scale-[0.97] motion-reduce:active:scale-100',
                )}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/[0.04] text-graphite-500">
                  <Folder size={11} />
                </span>
                <span className="truncate">{project.name}</span>
              </Link>
            ))
          )}
        </div>
      </div>

      <div className="hairline-fade mx-3" />

      <div className="flex items-center gap-2.5 px-3 py-3.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-hover text-[0.8125rem] font-semibold text-graphite-200 ring-1 ring-inset ring-hairline-strong">
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
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-graphite-500 transition-[background-color,color,transform] duration-150 ease-out hover:bg-surface-hover hover:text-graphite-100 active:scale-90 motion-reduce:active:scale-100"
        >
          <Settings size={14} />
        </Link>
        {status === 'authenticated' && (
          <button
            onClick={handleSignOut}
            aria-label="Sign out"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-graphite-500 transition-[background-color,color,transform] duration-150 ease-out hover:bg-surface-hover hover:text-graphite-100 active:scale-90 motion-reduce:active:scale-100"
          >
            <LogOut size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
