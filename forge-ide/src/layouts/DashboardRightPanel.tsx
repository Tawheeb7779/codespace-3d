import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import { Book, Boxes, Cloud, HardDrive, Settings, X } from 'lucide-react'
import { isSupabaseConfigured } from '@/lib/supabaseClient'
import { WebContainerService } from '@/services/WebContainerService'
import { useDashboardUiStore } from '@/stores/dashboardUiStore'

const EXIT_MS = 160

/**
 * The dashboard shell's optional right panel — genuine environment/runtime
 * status plus quick links, not a fabricated activity feed. Closed by
 * default and opened from the topbar; a simple fade/scale overlay rather
 * than a dragged drawer, since this is a glance-and-dismiss utility panel
 * rather than a primary navigation surface.
 *
 * Stays mounted through its own closing transition (same idea as
 * `SidebarDrawer`) so it slides back out symmetrically instead of just
 * vanishing — an asymmetric enter/exit is one of the things that makes an
 * interface feel unfinished.
 */
export function DashboardRightPanel() {
  const open = useDashboardUiStore((s) => s.rightPanelOpen)
  const setOpen = useDashboardUiStore((s) => s.setRightPanelOpen)
  const [mounted, setMounted] = useState(open)

  useEffect(() => {
    if (open) {
      setMounted(true)
      return
    }
    const timer = setTimeout(() => setMounted(false), EXIT_MS)
    return () => clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!mounted) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [mounted, setOpen])

  if (!mounted) return null

  return (
    <>
      <div
        className={clsx(
          'fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px]',
          open ? 'animate-fade-in' : 'animate-fade-out',
        )}
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <div
        className={clsx(
          'surface-overlay fixed bottom-3 right-3 top-3 z-50 flex w-full max-w-xs flex-col overflow-hidden rounded-2xl',
          open ? 'animate-panel-in-right' : 'animate-panel-out-right',
        )}
      >
        <div className="flex items-center justify-between border-b border-hairline px-4 py-3.5">
          <h2 className="text-[0.9375rem] font-semibold tracking-[-0.014em] text-graphite-50">Status</h2>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-graphite-500 transition-[background-color,color,transform] duration-150 ease-out hover:bg-surface-hover hover:text-graphite-100 active:scale-90 motion-reduce:active:scale-100"
          >
            <X size={15} />
          </button>
        </div>

        <div className="scrollbar-thin flex-1 space-y-6 overflow-y-auto p-4">
          <section className="space-y-2.5">
            <p className="type-label text-graphite-600">Environment</p>
            <div className="surface-card flex items-center gap-3 rounded-xl p-3">
              <span
                className={clsx(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ring-inset',
                  isSupabaseConfigured
                    ? 'bg-signal-green/12 text-signal-green ring-signal-green/20'
                    : 'bg-signal-amber/12 text-signal-amber ring-signal-amber/20',
                )}
              >
                {isSupabaseConfigured ? <Cloud size={15} /> : <HardDrive size={15} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.8125rem] font-medium text-graphite-100">
                  {isSupabaseConfigured ? 'Cloud sync' : 'Local mode'}
                </p>
                <p className="mt-0.5 text-xs leading-snug text-graphite-500">
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
              <span
                className={clsx(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ring-inset',
                  WebContainerService.isSupported
                    ? 'bg-signal-green/12 text-signal-green ring-signal-green/20'
                    : 'bg-signal-amber/12 text-signal-amber ring-signal-amber/20',
                )}
              >
                <Boxes size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.8125rem] font-medium text-graphite-100">
                  {WebContainerService.isSupported ? 'In-browser runtime ready' : 'Runtime unavailable'}
                </p>
                <p className="mt-0.5 text-xs leading-snug text-graphite-500">
                  {WebContainerService.isSupported
                    ? 'Terminal, dev servers, and preview run in this tab.'
                    : 'This context is not cross-origin isolated, so the terminal and preview cannot boot.'}
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-2.5">
            <p className="type-label text-graphite-600">Quick links</p>
            <div className="space-y-0.5">
              <Link
                to="/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.8125rem] text-graphite-300 transition-[background-color,color,transform] duration-150 ease-out hover:bg-surface-hover hover:text-graphite-100 active:scale-[0.97] motion-reduce:active:scale-100"
              >
                <Settings size={14} className="text-graphite-500" /> Settings
              </Link>
              <Link
                to="/docs"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.8125rem] text-graphite-300 transition-[background-color,color,transform] duration-150 ease-out hover:bg-surface-hover hover:text-graphite-100 active:scale-[0.97] motion-reduce:active:scale-100"
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
