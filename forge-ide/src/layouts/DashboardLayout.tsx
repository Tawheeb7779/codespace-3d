import { Link, Outlet, useNavigate } from 'react-router-dom'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useShallow } from 'zustand/react/shallow'
import { Flame, LogOut, Settings, User } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'
import { Badge } from '@/components/ui/misc'

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
    <div className="min-h-screen bg-graphite-950">
      <header className="sticky top-0 z-30 border-b border-graphite-800 bg-graphite-950/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="flex items-center gap-2 text-sm font-semibold text-graphite-100">
              <Flame size={18} className="text-ember-500" /> Forge IDE
            </Link>
            <nav className="hidden gap-4 sm:flex">
              <Link to="/dashboard" className="text-sm text-graphite-400 hover:text-graphite-100">
                Projects
              </Link>
              <Link to="/teams" className="text-sm text-graphite-400 hover:text-graphite-100">
                Teams
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {status === 'local' && <Badge variant="warning">Local mode</Badge>}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="flex h-8 w-8 items-center justify-center rounded-full bg-graphite-800 text-graphite-300 hover:bg-graphite-700">
                  <User size={16} />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content align="end" className="z-40 min-w-48 rounded-lg border border-graphite-800 bg-graphite-850 p-1 shadow-xl">
                  {user && (
                    <div className="border-b border-graphite-800 px-2.5 py-2">
                      <p className="truncate text-sm font-medium text-graphite-100">{user.displayName}</p>
                      {user.email && <p className="truncate text-xs text-graphite-500">{user.email}</p>}
                    </div>
                  )}
                  <DropdownMenu.Item asChild>
                    <Link to="/settings" className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-graphite-200 outline-none hover:bg-graphite-800">
                      <Settings size={14} /> Settings
                    </Link>
                  </DropdownMenu.Item>
                  {status === 'authenticated' && (
                    <DropdownMenu.Item
                      onSelect={handleSignOut}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-graphite-200 outline-none hover:bg-graphite-800"
                    >
                      <LogOut size={14} /> Sign out
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
