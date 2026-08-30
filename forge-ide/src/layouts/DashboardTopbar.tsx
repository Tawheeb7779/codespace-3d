import { useLocation } from 'react-router-dom'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { clsx } from 'clsx'
import { Bell, Menu, PanelRight } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useToastStore } from '@/stores/toastStore'
import { useDashboardUiStore } from '@/stores/dashboardUiStore'
import { menuContentClass, menuLabelClass } from '@/components/ui/menu'

const TITLES: Record<string, string> = {
  '/dashboard': 'Projects',
  '/teams': 'Teams',
  '/settings': 'Settings',
}

/**
 * Thin, contextual bar above the routed content — a page title plus the
 * two things that don't belong in the sidebar: a real notification history
 * (the same toasts the app already shows, kept around rather than lost) and
 * the toggle for the optional status panel.
 */
export function DashboardTopbar() {
  const location = useLocation()
  const title = TITLES[location.pathname] ?? 'Forge IDE'
  const { history, unreadCount, markAllRead } = useToastStore(
    useShallow((s) => ({ history: s.history, unreadCount: s.unreadCount, markAllRead: s.markAllRead })),
  )
  const { toggleSidebar, toggleRightPanel } = useDashboardUiStore(
    useShallow((s) => ({ toggleSidebar: s.toggleSidebar, toggleRightPanel: s.toggleRightPanel })),
  )

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-hairline bg-surface-base/80 px-4 backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          aria-label="Toggle navigation"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-graphite-400 transition-colors duration-150 hover:bg-surface-hover hover:text-graphite-100 lg:hidden"
        >
          <Menu size={17} />
        </button>
        <h1 className="type-heading text-graphite-50">{title}</h1>
      </div>

      <div className="flex items-center gap-1.5">
        <DropdownMenu.Root onOpenChange={(open) => open && markAllRead()}>
          <DropdownMenu.Trigger asChild>
            <button
              aria-label="Notifications"
              className="relative flex h-8 w-8 items-center justify-center rounded-lg text-graphite-400 transition-colors duration-150 hover:bg-surface-hover hover:text-graphite-100"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-ember-500" aria-hidden />
              )}
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={8}
              className={clsx(menuContentClass, 'w-80 max-w-[calc(100vw-2rem)] p-0')}
            >
              <p className={clsx(menuLabelClass, 'px-3 pb-1.5 pt-2.5')}>Notifications</p>
              <div className="scrollbar-thin max-h-80 overflow-y-auto">
                {history.length === 0 ? (
                  <p className="px-3 py-6 text-center text-[0.8125rem] text-graphite-600">Nothing yet</p>
                ) : (
                  history.map((item) => (
                    <div key={item.id} className="border-t border-hairline px-3 py-2.5 first:border-t-0">
                      <p
                        className={clsx(
                          'text-[0.8125rem] font-medium',
                          item.variant === 'error' ? 'text-signal-red' : 'text-graphite-100',
                        )}
                      >
                        {item.title}
                      </p>
                      {item.description && <p className="mt-0.5 text-xs text-graphite-500">{item.description}</p>}
                    </div>
                  ))
                )}
              </div>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        <button
          onClick={toggleRightPanel}
          aria-label="Toggle status panel"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-graphite-400 transition-colors duration-150 hover:bg-surface-hover hover:text-graphite-100"
        >
          <PanelRight size={16} />
        </button>
      </div>
    </header>
  )
}
