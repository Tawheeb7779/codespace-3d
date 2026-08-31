import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { useDrawerGesture } from '@/lib/motion/useDrawerGesture'

const REDUCED_MOTION_MS = 180

/**
 * A left-anchored drawer that can be grabbed, dragged 1:1 with the finger,
 * flicked, and reversed mid-flight — the direct-manipulation behavior the
 * apple-design skill calls for, in place of a drawer that only ever snaps
 * open or closed on click.
 *
 * `open` still drives it declaratively (rail-button toggle, click-away),
 * but closing — from either a button or a swipe — is one physical motion:
 * the component stays mounted through the closing spring and only unmounts
 * once it has actually come to rest offscreen, so a fast toggle never cuts
 * the animation short.
 */
export function SidebarDrawer({
  open,
  width,
  onClose,
  children,
  className,
}: {
  open: boolean
  width: number
  onClose: () => void
  children: React.ReactNode
  className?: string
}) {
  const [mounted, setMounted] = useState(open)
  const [prefersReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    if (open) {
      setMounted(true)
      return
    }
    if (!prefersReducedMotion) return // the spring's onProgress handles unmount timing
    // No simulated physics under reduced motion — a plain timed transition
    // takes over (see the CSS class below), so unmounting just needs to
    // wait for that transition instead of a physics "at rest" callback.
    const timer = setTimeout(() => setMounted(false), REDUCED_MOTION_MS)
    return () => clearTimeout(timer)
  }, [open, prefersReducedMotion])

  const { ref, handlers } = useDrawerGesture({
    width,
    open,
    onClose,
    disabled: prefersReducedMotion,
    onProgress: (progress) => {
      if (!prefersReducedMotion && progress <= 0.001 && !open) setMounted(false)
    },
  })

  if (!mounted) return null

  return (
    <div
      ref={ref}
      {...handlers}
      // pan-y leaves vertical scroll (the file tree) to the browser; only
      // horizontal movement is ours to interpret as a drawer drag.
      style={{ touchAction: 'pan-y' }}
      className={clsx(
        className,
        // Tailwind needs this class literal in source to generate it, so it
        // can't be built from REDUCED_MOTION_MS — keep the two in sync.
        prefersReducedMotion && 'transition-transform duration-[180ms] ease-out',
      )}
    >
      {children}
    </div>
  )
}
