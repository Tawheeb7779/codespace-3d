import { Outlet } from 'react-router-dom'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useDashboardUiStore } from '@/stores/dashboardUiStore'
import { SidebarDrawer } from '@/features/workspace/SidebarDrawer'
import { DashboardSidebar } from '@/layouts/DashboardSidebar'
import { DashboardTopbar } from '@/layouts/DashboardTopbar'
import { DashboardRightPanel } from '@/layouts/DashboardRightPanel'

const SIDEBAR_WIDTH = 272

/**
 * App shell for Dashboard/Teams/Settings: a persistent nav sidebar next to
 * the routed content, replacing the previous flat top-nav-only header.
 * Below the `lg` breakpoint the sidebar becomes the same physics-driven
 * overlay drawer the IDE workspace uses (`SidebarDrawer`), so there is one
 * drawer implementation in the app, not two.
 */
export function DashboardLayout() {
  const isOverlay = useMediaQuery('(max-width: 1023px)')
  const sidebarOpen = useDashboardUiStore((s) => s.sidebarOpen)
  const setSidebarOpen = useDashboardUiStore((s) => s.setSidebarOpen)

  return (
    <div className="flex h-screen overflow-hidden bg-surface-base">
      {isOverlay ? (
        <SidebarDrawer
          open={sidebarOpen}
          width={SIDEBAR_WIDTH}
          onClose={() => setSidebarOpen(false)}
          className="surface-card fixed bottom-3 left-3 top-3 z-50 w-[17rem] overflow-hidden rounded-2xl shadow-2xl shadow-black/40"
        >
          <DashboardSidebar onNavigate={() => setSidebarOpen(false)} />
        </SidebarDrawer>
      ) : (
        <div className="w-64 shrink-0 overflow-hidden border-r border-hairline bg-surface-raised/60">
          <DashboardSidebar />
        </div>
      )}

      {isOverlay && sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardTopbar />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <DashboardRightPanel />
    </div>
  )
}
