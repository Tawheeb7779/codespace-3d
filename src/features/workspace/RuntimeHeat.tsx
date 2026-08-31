import { clsx } from 'clsx'
import type { RuntimeStatus } from '@/stores/runtimeStore'

/**
 * The runtime readout, rendered as forge temperature.
 *
 * Steel glows through real colors as it heats, and this product is named
 * after the process — so the accent here is a ramp (cold steel → dull red →
 * orange → white-hot) driven by how far the project has actually got
 * toward running, rather than one flat status color.
 *
 * The gauge carries the metaphor; the word stays literal. A developer
 * needs to know whether their server is up, so the label says "running",
 * not "white-hot". Specific beats clever in an interface.
 */

const SEGMENTS = 4

interface Heat {
  /** How many of the four segments are lit — the boot progression, ordinally. */
  level: number
  color: string
  label: string
}

const HEAT: Record<RuntimeStatus, Heat> = {
  idle: { level: 0, color: 'var(--color-heat-cold)', label: 'idle' },
  unsupported: { level: 0, color: 'var(--color-graphite-600)', label: 'unavailable' },
  stopped: { level: 0, color: 'var(--color-heat-cold)', label: 'stopped' },
  installing: { level: 1, color: 'var(--color-heat-dull)', label: 'installing' },
  starting: { level: 2, color: 'var(--color-heat-orange)', label: 'starting' },
  running: { level: SEGMENTS, color: 'var(--color-heat-white)', label: 'running' },
  error: { level: 0, color: 'var(--color-signal-red)', label: 'error' },
}

export function RuntimeHeat({ status }: { status: RuntimeStatus }) {
  const heat = HEAT[status]

  return (
    <div
      role="status"
      aria-label={`Runtime ${heat.label}`}
      className="flex shrink-0 items-center gap-2 rounded-full bg-surface-sunken/70 py-1 pl-2 pr-2.5 ring-1 ring-inset ring-hairline"
    >
      <span className="flex items-end gap-[2px]" aria-hidden>
        {Array.from({ length: SEGMENTS }, (_, i) => {
          const lit = i < heat.level
          return (
            <span
              key={i}
              className="h-2.5 w-[2px] rounded-full transition-[background-color] duration-300 ease-out"
              style={{ backgroundColor: lit ? heat.color : 'var(--color-graphite-800)' }}
            />
          )
        })}
      </span>
      <span
        className={clsx('font-mono text-[0.6875rem] font-medium leading-none tracking-[0.02em]')}
        style={{ color: heat.level > 0 || status === 'error' ? heat.color : 'var(--color-graphite-500)' }}
      >
        {heat.label}
      </span>
    </div>
  )
}
