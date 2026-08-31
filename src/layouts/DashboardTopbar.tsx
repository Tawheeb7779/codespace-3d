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

const ICON_BUTTON = clsx(
  'flex h-8 w-8 items-center justify-center rounded-lg text-graphite-400',
  'transition-[background-color,color,transform] duration-150 ease-out',
  'hover:bg-surface-hover hover:text-graphite-100',
  'active:scale-90 motion-reduce:active:scale-100',
)

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
    <header className="surface-shell sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-hairline px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button onClick={toggleSidebar} aria-label="Toggle navigation" className={clsx(ICON_BUTTON, 'lg:hidden')}>
          <Menu size={17} />
        </button>
        <h1 className="text-[0.9375rem] font-semibold tracking-[-0.014em] text-graphite-50">{title}</h1>
      </div>

      {/* Grouped in one recessed toolbar surface rather than two loose
          icons — a small structural echo of the reference's paired
          controls, without adding anything new to the information
          architecture. */}
      <div className="flex items-center gap-0.5 rounded-xl bg-surface-sunken/60 p-1 ring-1 ring-inset ring-hairline">
        <DropdownMenu.Root onOpenChange={(open) => open && markAllRead()}>
          <DropdownMenu.Trigger asChild>
            <button aria-label="Notifications" className={clsx(ICON_BUTTON, 'relative')}>
              <Bell size={16} />
              {unreadCount > 0 && (
                <span
                  className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-ember-500 shadow-[0_0_0_2px_var(--color-surface-sunken)]"
                  aria-hidden
                />
              )}
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={10}
              className={clsx(menuContentClass, 'w-80 max-w-[calc(100vw-2rem)] p-0')}
            >
              <p className={clsx(menuLabelClass, 'px-3.5 pb-2 pt-3')}>Notifications</p>
              <div className="scrollbar-thin max-h-80 overflow-y-auto pb-1">
                {history.length === 0 ? (
                  <p className="px-3.5 py-7 text-center text-[0.8125rem] text-graphite-600">Nothing yet</p>
                ) : (
                  history.map((item) => (
                    <div
                      key={item.id}
                      className="mx-1 flex gap-2.5 rounded-lg px-2.5 py-2.5 transition-colors duration-150 hover:bg-surface-hover"
                    >
                      <span
                        className={clsx(
                          'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                          item.variant === 'error' && 'bg-signal-red',
                          item.variant === 'success' && 'bg-signal-green',
                          item.variant === 'info' && 'bg-graphite-500',
                        )}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[0.8125rem] font-medium leading-snug text-graphite-100">{item.title}</p>
                        {item.description && (
                          <p className="mt-0.5 text-xs leading-snug text-graphite-500">{item.description}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        <button onClick={toggleRightPanel} aria-label="Toggle status panel" className={ICON_BUTTON}>
          <PanelRight size={16} />
        </button>
      </div>
    </header>
  )
}
