import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Book, Boxes, Cloud, HardDrive, Settings, X } from 'lucide-react'
import { isSupabaseConfigured } from '@/lib/supabaseClient'
import { WebContainerService } from '@/services/WebContainerService'
import { useDashboardUiStore } from '@/stores/dashboardUiStore'

/**
 * The dashboard shell's optional right panel — genuine environment/runtime
 * status plus quick links, not a fabricated activity feed. Closed by
 * default and opened from the topbar; a simple fade/scale overlay rather
 * than a dragged drawer, since this is a glance-and-dismiss utility panel
 * rather than a primary navigation surface.
 */
export function DashboardRightPanel() {
  const open = useDashboardUiStore((s) => s.rightPanelOpen)
  const setOpen = useDashboardUiStore((s) => s.setRightPanelOpen)

  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, setOpen])

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]" onClick={() => setOpen(false)} aria-hidden />
      <div className="surface-overlay animate-slide-up fixed bottom-3 right-3 top-3 z-50 flex w-full max-w-xs flex-col overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-hairline px-4 py-3.5">
          <h2 className="type-heading text-graphite-50">Status</h2>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-graphite-500 transition-colors duration-150 hover:bg-surface-hover hover:text-graphite-100"
          >
            <X size={15} />
          </button>
        </div>

        <div className="scrollbar-thin flex-1 space-y-5 overflow-y-auto p-4">
          <section className="space-y-2.5">
            <p className="type-label text-graphite-600">Environment</p>
            <div className="surface-card flex items-center gap-3 rounded-xl p-3">
              {isSupabaseConfigured ? (
                <Cloud size={16} className="shrink-0 text-signal-green" />
              ) : (
                <HardDrive size={16} className="shrink-0 text-signal-amber" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[0.8125rem] font-medium text-graphite-100">
                  {isSupabaseConfigured ? 'Cloud sync' : 'Local mode'}
                </p>
                <p className="text-xs text-graphite-500">
                  {isSupabaseConfigured
                    ? 'Projects sync to Supabase and are available across devices.'
                    : 'Projects are stored only in this browser.'}
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-2.5">
            <p className="type-label text-graphite-600">Runtime</p>
            <div className="surface-card flex items-center gap-3 rounded-xl p-3">
              <Boxes
                size={16}
                className={WebContainerService.isSupported ? 'shrink-0 text-signal-green' : 'shrink-0 text-signal-amber'}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[0.8125rem] font-medium text-graphite-100">
                  {WebContainerService.isSupported ? 'In-browser runtime ready' : 'Runtime unavailable'}
                </p>
                <p className="text-xs text-graphite-500">
                  {WebContainerService.isSupported
                    ? 'Terminal, dev servers, and preview run in this tab.'
                    : 'This context is not cross-origin isolated, so the terminal and preview cannot boot.'}
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-2.5">
            <p className="type-label text-graphite-600">Quick links</p>
            <div className="space-y-1">
              <Link
                to="/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.8125rem] text-graphite-300 transition-colors duration-150 hover:bg-surface-hover hover:text-graphite-100"
              >
                <Settings size={14} className="text-graphite-500" /> Settings
              </Link>
              <Link
                to="/docs"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.8125rem] text-graphite-300 transition-colors duration-150 hover:bg-surface-hover hover:text-graphite-100"
              >
                <Book size={14} className="text-graphite-500" /> Documentation
              </Link>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
