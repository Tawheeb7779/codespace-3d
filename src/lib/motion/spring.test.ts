import { describe, expect, it } from 'vitest'
import { VelocityTracker, projectMomentum, rubberband } from './spring'

describe('projectMomentum', () => {
  it('projects further for faster flicks', () => {
    const slow = projectMomentum(200)
    const fast = projectMomentum(2000)
    expect(fast).toBeGreaterThan(slow)
  })

  it('uses the exponential-decay form, not v^2/(2a)', () => {
    // (v/1000) * d / (1 - d) with d = 0.998 -> v * 0.499
    expect(projectMomentum(1000)).toBeCloseTo(499, 0)
    expect(projectMomentum(500)).toBeCloseTo(249.5, 0)
  })

  it('scales linearly with velocity (a doubled flick travels twice as far)', () => {
    expect(projectMomentum(2000)).toBeCloseTo(projectMomentum(1000) * 2, 5)
  })

  it('carries direction', () => {
    expect(projectMomentum(-1000)).toBeCloseTo(-499, 0)
  })

  it('a snappier deceleration rate projects a shorter distance', () => {
    expect(projectMomentum(1000, 0.99)).toBeLessThan(projectMomentum(1000, 0.998))
  })
})

describe('rubberband', () => {
  it('returns less than the raw overshoot — the element lags the finger', () => {
    expect(rubberband(100, 300)).toBeLessThan(100)
  })

  it('resists progressively: each extra pixel of pull moves it less', () => {
    const firstStep = rubberband(50, 300) - rubberband(0, 300)
    const laterStep = rubberband(250, 300) - rubberband(200, 300)
    expect(laterStep).toBeLessThan(firstStep)
  })

  it('is symmetric about zero', () => {
    expect(rubberband(-120, 300)).toBeCloseTo(-rubberband(120, 300), 5)
  })

  it('never hard-stops — output keeps growing with input', () => {
    expect(rubberband(1000, 300)).toBeGreaterThan(rubberband(500, 300))
  })

  it('is a no-op at the boundary and safe for a zero dimension', () => {
    expect(rubberband(0, 300)).toBe(0)
    expect(rubberband(50, 0)).toBe(0)
  })
})

describe('VelocityTracker', () => {
  it('measures velocity in px/s across samples', () => {
    const t = new VelocityTracker()
    t.add(0, 0)
    t.add(50, 50)
    t.add(100, 100) // 100px over 100ms => 1000 px/s
    expect(t.velocity).toBeCloseTo(1000, 0)
  })

  it('reports zero before it has two samples', () => {
    const t = new VelocityTracker()
    expect(t.velocity).toBe(0)
    t.add(10, 0)
    expect(t.velocity).toBe(0)
  })

  it('tracks direction', () => {
    const t = new VelocityTracker()
    t.add(100, 0)
    t.add(0, 100)
    expect(t.velocity).toBeCloseTo(-1000, 0)
  })

  it('drops samples outside its window, so a finger that stops reads as stopped', () => {
    const t = new VelocityTracker(100)
    t.add(0, 0)
    t.add(500, 50) // fast early movement
    // ...then the finger rests before release
    t.add(505, 400)
    t.add(505, 460)
    expect(Math.abs(t.velocity)).toBeLessThan(100)
  })

  it('resets cleanly', () => {
    const t = new VelocityTracker()
    t.add(0, 0)
    t.add(100, 100)
    t.reset()
    expect(t.velocity).toBe(0)
  })
})
