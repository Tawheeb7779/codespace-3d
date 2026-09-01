import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Motion, kept small on purpose.
 *
 * There is no animation library here. Reveals are CSS transitions that fire
 * when an observer stamps [data-revealed] on an element, which means the
 * browser handles the easing on the compositor and the JS cost is one shared
 * IntersectionObserver rather than a per-frame loop.
 */

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Reveals every [data-reveal] descendant once, as it enters the viewport.
 *
 * One observer per section rather than one per element: a page with ~120
 * revealing nodes still only allocates a handful of observers.
 */
export function useRevealRoot<T extends HTMLElement>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return

    const targets = root.querySelectorAll<HTMLElement>('[data-reveal], [data-draw]')
    if (targets.length === 0) return

    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      targets.forEach((el) => el.setAttribute('data-revealed', ''))
      return
    }

    // A drawn line needs to know its own length before it can draw itself.
    targets.forEach((el) => {
      if (el.hasAttribute('data-draw') && el instanceof SVGPathElement) {
        const length = Math.ceil(el.getTotalLength())
        el.style.setProperty('--draw-length', String(length))
      }
    })

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.setAttribute('data-revealed', '')
          observer.unobserve(entry.target)
        }
      },
      // Fire a little before the element is fully on screen, so the motion
      // reads as "already happening" rather than "triggered by me".
      { rootMargin: '0px 0px -12% 0px', threshold: 0.01 },
    )

    targets.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return ref
}

/** True once the element has been seen. Used to light plates on scroll. */
export function useInView<T extends HTMLElement>(options?: { rootMargin?: string; once?: boolean }) {
  const ref = useRef<T>(null)
  // Without an observer there is no way to know, so assume visible: content
  // must never be withheld because a browser API is missing.
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined')
  const once = options?.once ?? true

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return
        if (entry.isIntersecting) {
          setInView(true)
          if (once) observer.disconnect()
        } else if (!once) {
          setInView(false)
        }
      },
      { rootMargin: options?.rootMargin ?? '0px 0px -20% 0px', threshold: 0.15 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [once, options?.rootMargin])

  return [ref, inView] as const
}

/**
 * Scroll progress through an element, 0 → 1, as a CSS variable on that
 * element. Reads on rAF-throttled scroll and writes one custom property, so
 * parallax stays declarative in CSS instead of setting transforms from JS.
 */
export function useScrollProgress<T extends HTMLElement>(varName = '--progress') {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion()) return

    let frame = 0
    const update = () => {
      frame = 0
      const rect = el.getBoundingClientRect()
      const total = rect.height + window.innerHeight
      const seen = window.innerHeight - rect.top
      const progress = Math.min(1, Math.max(0, seen / total))
      el.style.setProperty(varName, progress.toFixed(4))
    }

    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [varName])

  return ref
}

/** Which section is currently on screen — drives the nav's active mark. */
export function useActiveSection(ids: readonly string[]): string | null {
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const seen = new Map<string, number>()

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          seen.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0)
        }
        let best: string | null = null
        let bestRatio = 0
        for (const [id, ratio] of seen) {
          if (ratio > bestRatio) {
            best = id
            bestRatio = ratio
          }
        }
        setActive(bestRatio > 0 ? best : null)
      },
      { threshold: [0, 0.25, 0.5, 0.75], rootMargin: '-20% 0px -40% 0px' },
    )

    for (const id of ids) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [ids])

  return active
}

/** Locks page scroll while a dialog owns the screen. */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return
    const { overflow, paddingRight } = document.body.style
    const gap = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (gap > 0) document.body.style.paddingRight = `${gap}px`
    return () => {
      document.body.style.overflow = overflow
      document.body.style.paddingRight = paddingRight
    }
  }, [locked])
}

/** Stable per-item stagger, in ms, for reveal sequences. */
export function stagger(index: number, step = 90, max = 6): React.CSSProperties {
  return { '--reveal-delay': `${Math.min(index, max) * step}ms` } as React.CSSProperties
}

/** Escape closes anything that opens. */
export function useEscape(active: boolean, onEscape: () => void) {
  const handler = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') onEscape()
    },
    [onEscape],
  )

  useEffect(() => {
    if (!active) return
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [active, handler])
}
