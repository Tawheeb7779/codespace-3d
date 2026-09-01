import { useEffect, useRef, useState } from 'react'
import { nav, site, SECTION_IDS } from '@/content/site'
import { useActiveSection, useEscape, useScrollLock } from '@/lib/motion'
import { cx } from '@/components/ui'

export function Nav() {
  const [open, setOpen] = useState(false)
  const [lifted, setLifted] = useState(false)
  const active = useActiveSection(SECTION_IDS)
  const panelRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)

  useScrollLock(open)
  useEscape(open, () => setOpen(false))

  // The bar is transparent over the hero and solid once the page moves, so
  // the hero reads as full-bleed rather than as content under a header.
  useEffect(() => {
    const onScroll = () => setLifted(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Returning focus to the toggle keeps keyboard users where they were.
  useEffect(() => {
    if (open) {
      panelRef.current?.querySelector<HTMLAnchorElement>('a')?.focus()
    } else if (document.activeElement && panelRef.current?.contains(document.activeElement)) {
      toggleRef.current?.focus()
    }
  }, [open])

  return (
    <>
      <a
        href="#work"
        className="annotation fixed top-3 left-3 z-[60] -translate-y-24 bg-[color:var(--color-brass)] px-5 py-3 text-[color:var(--color-nocturne)] transition-transform focus-visible:translate-y-0"
      >
        Skip to content
      </a>

      <header
        className={cx(
          'fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-700 ease-[var(--ease-settle)]',
          lifted && !open
            ? 'border-b border-[color:var(--color-rule-light)] bg-[color:var(--color-ink)]/88 backdrop-blur-md'
            : 'border-b border-transparent',
        )}
      >
        <div className="u-shell u-gutter flex h-[4.75rem] items-center justify-between gap-8">
          <a
            href="#top"
            className="wordmark relative z-10 text-[1.05rem] text-[color:var(--color-vellum-strong)]"
            aria-label={`${site.name} — home`}
          >
            {site.name}
          </a>

          <nav aria-label="Primary" className="hidden items-center gap-9 lg:flex">
            {nav.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                aria-current={active === item.id ? 'true' : undefined}
                className="annotation group relative py-2 text-[color:var(--color-vellum-strong)]/70 transition-colors duration-400 hover:text-[color:var(--color-vellum-strong)]"
              >
                {item.label}
                <span
                  aria-hidden
                  className={cx(
                    'absolute -bottom-0.5 left-0 h-px bg-[color:var(--color-brass-bright)] transition-all duration-500 ease-[var(--ease-drape)]',
                    active === item.id ? 'w-full opacity-100' : 'w-0 opacity-0 group-hover:w-full group-hover:opacity-60',
                  )}
                />
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="#contact"
              className="annotation hidden border border-[color:var(--color-brass)]/55 px-6 py-3.5 text-[color:var(--color-brass-bright)] transition-colors duration-500 hover:border-[color:var(--color-brass)] hover:bg-[color:var(--color-brass)] hover:text-[color:var(--color-nocturne)] sm:inline-block"
            >
              Start your event
            </a>

            <button
              ref={toggleRef}
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="menu-panel"
              className="relative z-10 -mr-2 flex h-11 w-11 items-center justify-center lg:hidden"
            >
              <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
              <span aria-hidden className="flex w-6 flex-col gap-[7px]">
                <span
                  className={cx(
                    'h-px w-full bg-[color:var(--color-vellum-strong)] transition-transform duration-500 ease-[var(--ease-drape)]',
                    open && 'translate-y-1 rotate-45',
                  )}
                />
                <span
                  className={cx(
                    'h-px w-full bg-[color:var(--color-vellum-strong)] transition-transform duration-500 ease-[var(--ease-drape)]',
                    open && '-translate-y-1 -rotate-45',
                  )}
                />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu: a full sheet, not a dropdown. */}
      <div
        id="menu-panel"
        ref={panelRef}
        data-ground="nocturne"
        hidden={!open}
        className="fixed inset-0 z-40 flex flex-col justify-between pt-28 pb-12 lg:hidden"
      >
        <nav aria-label="Primary" className="u-gutter flex flex-col">
          {nav.map((item, i) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={() => setOpen(false)}
              style={{ transitionDelay: open ? `${120 + i * 70}ms` : '0ms' }}
              className={cx(
                'group border-b border-[color:var(--color-rule-light)] py-6 transition-all duration-700 ease-[var(--ease-settle)]',
                open ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
              )}
            >
              <span className="annotation-sm mr-5 text-[color:var(--color-brass-text)] opacity-70">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="font-[family-name:var(--font-display)] text-[2rem] leading-none">
                {item.label}
              </span>
            </a>
          ))}
        </nav>

        <div className="u-gutter">
          <a
            href="#contact"
            onClick={() => setOpen(false)}
            style={{ transitionDelay: open ? '480ms' : '0ms' }}
            className={cx(
              'annotation flex items-center justify-center bg-[color:var(--color-brass)] px-8 py-5 text-[color:var(--color-nocturne)] transition-all duration-700 ease-[var(--ease-settle)]',
              open ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
            )}
          >
            Start your event
          </a>
          <p className="annotation-sm mt-8 opacity-65">
            {site.contact.base} — {site.contact.travels}
          </p>
        </div>
      </div>
    </>
  )
}
