import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useShallow } from 'zustand/react/shallow'
import { clsx } from 'clsx'
import { Flame, LogOut, Settings, User } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'
import { Badge } from '@/components/ui/misc'
import { menuContentClass, menuItemClass, menuSeparatorClass } from '@/components/ui/menu'

const NAV = [
  { to: '/dashboard', label: 'Projects' },
  { to: '/teams', label: 'Teams' },
]

export function DashboardLayout() {
  const { user, status, signOut } = useAuthStore(
    useShallow((s) => ({ user: s.user, status: s.status, signOut: s.signOut })),
  )
  const navigate = useNavigate()

  async function handleSignOut() {
    try {
      await signOut()
    } catch (err) {
      toast.error('Sign out failed', err instanceof Error ? err.message : undefined)
      return
    }
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-surface-base">
      {/* The header sits on a translucent, blurred surface with only a
          hairline under it — enough to separate it from content that
          scrolls beneath without drawing a hard rule across the page. */}
      <header className="sticky top-0 z-30 border-b border-hairline bg-surface-base/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-7">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 rounded-lg text-[0.9375rem] font-semibold tracking-[-0.014em] text-graphite-50 transition-opacity hover:opacity-70"
            >
              <Flame size={18} className="text-ember-500" />
              Forge IDE
            </Link>

            <nav className="hidden items-center gap-1 sm:flex">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    clsx(
                      'rounded-lg px-2.5 py-1.5 text-[0.8125rem] font-medium transition-colors duration-150',
                      isActive
                        ? 'bg-surface-hover text-graphite-50'
                        : 'text-graphite-400 hover:bg-surface-raised hover:text-graphite-100',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {status === 'local' && <Badge variant="warning">Local mode</Badge>}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-hover text-graphite-300 ring-1 ring-inset ring-hairline transition-colors duration-150 hover:bg-surface-overlay hover:text-graphite-50"
                  aria-label="Account menu"
                >
                  <User size={15} />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content align="end" sideOffset={8} className={menuContentClass}>
                  {user && (
                    <>
                      <div className="px-2.5 py-1.5">
                        <p className="truncate text-[0.8125rem] font-medium text-graphite-50">{user.displayName}</p>
                        {user.email && <p className="truncate text-xs text-graphite-500">{user.email}</p>}
                      </div>
                      <DropdownMenu.Separator className={menuSeparatorClass} />
                    </>
                  )}
                  <DropdownMenu.Item asChild className={menuItemClass}>
                    <Link to="/settings">
                      <Settings size={14} className="text-graphite-500" /> Settings
                    </Link>
                  </DropdownMenu.Item>
                  {status === 'authenticated' && (
                    <DropdownMenu.Item onSelect={handleSignOut} className={menuItemClass}>
                      <LogOut size={14} className="text-graphite-500" /> Sign out
                    </DropdownMenu.Item>
                  )}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  )
}
