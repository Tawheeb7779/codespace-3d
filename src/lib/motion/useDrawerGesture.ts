import { useCallback, useEffect, useRef } from 'react'
import { Spring, VelocityTracker, projectMomentum, rubberband } from '@/lib/motion/spring'

const DIRECTION_THRESHOLD = 10 // px of movement before we commit to an axis

export interface DrawerGestureOptions {
  /** Panel width in px. Open is 0, closed is -width. */
  width: number
  open: boolean
  onClose: () => void
  /** Receives 0 (fully closed) → 1 (fully open) on every frame. */
  onProgress?: (progress: number) => void
  disabled?: boolean
}

/**
 * Makes a left-anchored drawer directly manipulable.
 *
 * The panel tracks the finger 1:1 while dragging (never only animating at
 * the end), resists past its open bound instead of stopping dead, and on
 * release projects where the flick was heading and springs to the nearer
 * of open/closed — handing the finger's release velocity to the spring so
 * there is no seam between dragging and animating.
 *
 * Because the spring retargets from its live value, the drawer can be
 * grabbed mid-animation and reversed without a jump.
 *
 * Horizontal intent is disambiguated from vertical scrolling: the panel
 * declares `touch-action: pan-y`, so the browser keeps native vertical
 * scrolling of the file tree and hands us horizontal movement.
 */
export function useDrawerGesture({ width, open, onClose, onProgress, disabled }: DrawerGestureOptions) {
  const elementRef = useRef<HTMLDivElement | null>(null)
  const springRef = useRef<Spring | null>(null)
  const tracker = useRef(new VelocityTracker())
  const drag = useRef({ active: false, axis: null as null | 'x' | 'y', startX: 0, startY: 0, startValue: 0 })

  const apply = useCallback(
    (value: number) => {
      const el = elementRef.current
      if (el) el.style.transform = `translate3d(${value}px, 0, 0)`
      onProgress?.(1 - Math.min(1, Math.abs(value) / width))
    },
    [width, onProgress],
  )

  // One spring instance for the life of the drawer, so an interrupted
  // animation continues from wherever it actually is on screen.
  if (springRef.current === null) {
    springRef.current = new Spring(open ? 0 : -width, { damping: 1, response: 0.35 }, apply)
  }

  useEffect(() => {
    const spring = springRef.current
    if (!spring) return
    const target = open ? 0 : -width
    if (disabled) {
      // prefers-reduced-motion: no spring physics at all. The element still
      // moves (a plain CSS transition on the wrapper picks up the instant
      // style change), but there is no simulated momentum or overshoot.
      spring.setValue(target)
      return
    }
    // Momentum-free open/close (e.g. from the rail button) stays critically
    // damped — overshoot is only right when a gesture threw it.
    spring.setTarget(target)
  }, [open, width, disabled])

  useEffect(() => {
    apply(springRef.current?.currentValue ?? (open ? 0 : -width))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => () => springRef.current?.stop(), [])

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled || e.pointerType === 'mouse') return // pointer-drag is a touch affordance
      const spring = springRef.current
      if (!spring) return
      // Grab from the live on-screen value, not the logical target.
      const current = spring.currentValue
      spring.stop()
      drag.current = { active: true, axis: null, startX: e.clientX, startY: e.clientY, startValue: current }
      tracker.current.reset()
      tracker.current.add(current, e.timeStamp)
    },
    [disabled],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const state = drag.current
      if (!state.active) return
      const dx = e.clientX - state.startX
      const dy = e.clientY - state.startY

      if (state.axis === null) {
        if (Math.abs(dx) < DIRECTION_THRESHOLD && Math.abs(dy) < DIRECTION_THRESHOLD) return
        // Commit to the dominant axis once intent is clear; a vertical
        // gesture is the file tree scrolling and is not ours.
        state.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
        if (state.axis === 'y') {
          state.active = false
          return
        }
        elementRef.current?.setPointerCapture(e.pointerId)
      }

      let next = state.startValue + dx
      if (next > 0) next = rubberband(next, width) // resist past fully open
      if (next < -width) next = -width + rubberband(next + width, width)

      springRef.current?.setValue(next)
      tracker.current.add(next, e.timeStamp)
    },
    [width],
  )

  const endDrag = useCallback(() => {
    const state = drag.current
    if (!state.active || state.axis !== 'x') {
      drag.current.active = false
      return
    }
    drag.current.active = false

    const spring = springRef.current
    if (!spring) return

    const velocity = tracker.current.velocity
    // Snap to whichever bound the flick is actually heading toward, not the
    // one nearest the release point.
    const projected = spring.currentValue + projectMomentum(velocity)
    const shouldOpen = projected > -width / 2

    spring.setTarget(shouldOpen ? 0 : -width, velocity, () => {
      if (!shouldOpen) onClose()
    })
  }, [width, onClose])

  return {
    ref: elementRef,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
  }
}
