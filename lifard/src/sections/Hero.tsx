import { useEffect, useState } from 'react'
import { site } from '@/content/site'
import { Plate } from '@/graphics/Plate'
import { Button, cx } from '@/components/ui'
import { prefersReducedMotion, useScrollProgress } from '@/lib/motion'

/**
 * The hero is a room being lit.
 *
 * A ceremony arch is drawn on the dark, the headline arrives line by line,
 * and then the candles come up — the same sequence as a real venue in the
 * half hour before doors. It is the one orchestrated moment on the page;
 * everything after it is quieter on purpose.
 */
export function Hero() {
  // 0 mounted · 1 drawing on the sheet · 2 type set · 3 room lit.
  // Reduced motion starts at the end state rather than animating to it, so
  // there is no first frame where the hero is blank.
  const [phase, setPhase] = useState(() => (prefersReducedMotion() ? 3 : 0))
  const parallaxRef = useScrollProgress<HTMLDivElement>('--scroll')

  useEffect(() => {
    if (prefersReducedMotion()) return
    const timers = [
      window.setTimeout(() => setPhase(1), 120),
      window.setTimeout(() => setPhase(2), 620),
      window.setTimeout(() => setPhase(3), 1900),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <section
      id="top"
      data-ground="nocturne"
      aria-label="LIFARD — wedding and event design studio"
      className="relative isolate flex min-h-[100svh] flex-col justify-between overflow-hidden pt-[4.75rem]"
    >
      {/* The drawing, drifting slightly slower than the page. */}
      <div
        ref={parallaxRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center"
        style={{ transform: 'translate3d(0, calc(var(--scroll, 0) * 9rem), 0)' }}
      >
        {/* Locked to the drawing's own proportions so the arch reads as an
            arch instead of being cropped to a band of arcs. */}
        <div
          className={cx(
            'plate aspect-[4/5] h-[122%] transition-opacity duration-[2200ms] ease-[var(--ease-settle)]',
            phase >= 1 ? 'opacity-100' : 'opacity-0',
          )}
          data-lit={phase >= 3 ? '' : undefined}
        >
          <Plate motif="arch" />
        </div>
      </div>

      {/* Holds the type off the line work without dimming the candles. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_86%_at_50%_54%,transparent_18%,var(--color-nocturne)_84%)] opacity-90"
      />

      <div className="u-shell u-gutter flex flex-1 flex-col justify-center py-16">
        <p
          className={cx(
            'annotation flex items-center gap-3 text-[color:var(--color-brass-text)] transition-all duration-1000 ease-[var(--ease-settle)]',
            phase >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
          )}
        >
          <span aria-hidden className="inline-block h-px w-10 bg-current opacity-60" />
          {site.discipline}
        </p>

        <h1 className="mt-8 text-[clamp(2.65rem,8.4vw,7.5rem)] leading-[0.97] tracking-[-0.02em]">
          {['We draw the night', 'before it happens.'].map((line, i) => (
            <span key={line} className="block overflow-hidden">
              <span
                className={cx(
                  'block transition-transform duration-[1400ms] ease-[var(--ease-drape)]',
                  phase >= 2 ? 'translate-y-0' : 'translate-y-full',
                )}
                style={{ transitionDelay: `${i * 130}ms` }}
              >
                {line}
              </span>
            </span>
          ))}
        </h1>

        <p
          className={cx(
            'u-measure mt-9 text-[1.02rem] leading-[1.75] text-[color:var(--color-vellum-strong)]/72 transition-all duration-1000 ease-[var(--ease-settle)]',
            phase >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
          )}
          style={{ transitionDelay: '420ms' }}
        >
          {site.summary}
        </p>

        <div
          className={cx(
            'mt-12 flex flex-wrap items-center gap-4 transition-all duration-1000 ease-[var(--ease-settle)]',
            phase >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
          )}
          style={{ transitionDelay: '580ms' }}
        >
          <Button href="#contact" className="w-full justify-center sm:w-auto sm:justify-start">
            Start your event
          </Button>
          <Button href="#work" variant="line" className="w-full justify-center sm:w-auto sm:justify-start">
            See the work
          </Button>
        </div>
      </div>

      {/* Sheet border: the annotations a drawing carries in its margins. */}
      <div
        className={cx(
          'u-shell u-gutter flex items-end justify-between gap-6 pb-8 transition-opacity duration-1000',
          phase >= 3 ? 'opacity-100' : 'opacity-0',
        )}
        style={{ transitionDelay: '300ms' }}
      >
        <p className="annotation-sm opacity-65">
          Est. {site.founded} — {site.contact.base}
        </p>

        <a
          href="#work"
          className="group hidden flex-col items-center gap-3 sm:flex"
          aria-label="Scroll to the work"
        >
          <span className="annotation-sm opacity-65 transition-opacity group-hover:opacity-80">
            Scroll
          </span>
          <span aria-hidden className="relative block h-14 w-px overflow-hidden bg-current/20">
            <span className="absolute inset-x-0 top-0 block h-5 animate-[trace_2.6s_var(--ease-settle)_infinite] bg-[color:var(--color-brass-bright)]" />
          </span>
        </a>

        <p
          className="annotation-sm opacity-65"
          lang="ar"
          dir="rtl"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          {site.nameArabic}
        </p>
      </div>
    </section>
  )
}
