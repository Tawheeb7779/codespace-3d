/**
 * An interruptible, velocity-aware spring.
 *
 * Parameterized the way Apple's design talks frame it — damping ratio and
 * response — rather than mass/stiffness/damping, because those are the two
 * numbers a designer actually reasons about:
 *
 *   damping  1.0  = critically damped, settles with no overshoot
 *            ~0.8 = slight overshoot, correct only when a gesture carried
 *                   momentum into the animation
 *   response      = how quickly it reaches the target, in seconds. This is
 *                   NOT a duration: a spring has no fixed duration, its
 *                   settle time emerges from the parameters.
 *
 * The important property is that `setTarget` continues from the CURRENT
 * position and velocity rather than restarting. That is what makes motion
 * grabbable and reversible mid-flight without a visible jump or a velocity
 * discontinuity at the reversal.
 */

export interface SpringConfig {
  /** Damping ratio. 1 = critically damped (default). */
  damping?: number
  /** Response in seconds — lower is snappier. */
  response?: number
}

const REST_DISTANCE = 0.35
const REST_VELOCITY = 0.35
const MAX_FRAME = 1 / 30
const SUBSTEP = 1 / 240

export class Spring {
  private value: number
  private velocity = 0
  private target: number
  private omega: number
  private zeta: number
  private frame: number | null = null
  private lastTime = 0
  private readonly onFrame: (value: number) => void
  private onRest: (() => void) | null = null

  constructor(initial: number, config: SpringConfig, onFrame: (value: number) => void) {
    this.value = initial
    this.target = initial
    this.zeta = config.damping ?? 1
    this.omega = (2 * Math.PI) / (config.response ?? 0.4)
    this.onFrame = onFrame
  }

  get currentValue(): number {
    return this.value
  }

  get currentVelocity(): number {
    return this.velocity
  }

  get isAnimating(): boolean {
    return this.frame !== null
  }

  /**
   * Retargets the spring. Velocity is carried through by default — pass
   * `velocity` explicitly to hand off a gesture's release velocity, which
   * is what removes the seam between dragging and animating.
   */
  setTarget(target: number, velocity?: number, onRest?: () => void) {
    this.target = target
    if (velocity !== undefined) this.velocity = velocity
    this.onRest = onRest ?? null
    if (this.frame === null) {
      this.lastTime = performance.now()
      this.frame = requestAnimationFrame(this.tick)
    }
  }

  /** Sets the value directly (used while a finger is driving it 1:1). */
  setValue(value: number, velocity = 0) {
    this.stop()
    this.value = value
    this.velocity = velocity
    this.onFrame(value)
  }

  stop() {
    if (this.frame !== null) {
      cancelAnimationFrame(this.frame)
      this.frame = null
    }
  }

  private tick = (now: number) => {
    const dt = Math.min((now - this.lastTime) / 1000, MAX_FRAME)
    this.lastTime = now

    // Sub-stepping keeps the integration stable when a frame runs long.
    const steps = Math.max(1, Math.ceil(dt / SUBSTEP))
    const h = dt / steps
    for (let i = 0; i < steps; i++) {
      const displacement = this.value - this.target
      const accel = -this.omega * this.omega * displacement - 2 * this.zeta * this.omega * this.velocity
      this.velocity += accel * h
      this.value += this.velocity * h
    }

    if (Math.abs(this.value - this.target) < REST_DISTANCE && Math.abs(this.velocity) < REST_VELOCITY) {
      this.value = this.target
      this.velocity = 0
      this.frame = null
      this.onFrame(this.value)
      const rest = this.onRest
      this.onRest = null
      rest?.()
      return
    }

    this.onFrame(this.value)
    this.frame = requestAnimationFrame(this.tick)
  }
}

/**
 * Projects where a flick would come to rest, using the exponential-decay
 * form Apple ships in the Designing Fluid Interfaces sample code — not the
 * textbook v²/(2a). Snap targets should be chosen from this projected
 * point rather than from the release point, which is what makes a flick
 * feel like it throws the element instead of nudging it.
 */
export function projectMomentum(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate)
}

/**
 * Progressive resistance past a boundary. A hard stop reads as frozen;
 * resistance that grows with the overshoot reads as responsive but empty.
 */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  if (dimension <= 0) return 0
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot))
}

/**
 * Rolling velocity from recent pointer samples, in px/s.
 *
 * Uses a short window rather than the last two events: a single frame pair
 * is noisy, and the value that matters at release is the speed the finger
 * was actually moving, not one sample of it.
 */
export class VelocityTracker {
  private samples: Array<{ value: number; time: number }> = []
  private readonly windowMs: number

  constructor(windowMs = 100) {
    this.windowMs = windowMs
  }

  add(value: number, time = performance.now()) {
    this.samples.push({ value, time })
    while (this.samples.length > 2 && time - this.samples[0].time > this.windowMs) {
      this.samples.shift()
    }
  }

  get velocity(): number {
    if (this.samples.length < 2) return 0
    const first = this.samples[0]
    const last = this.samples[this.samples.length - 1]
    const dt = (last.time - first.time) / 1000
    if (dt <= 0) return 0
    return (last.value - first.value) / dt
  }

  reset() {
    this.samples = []
  }
}
