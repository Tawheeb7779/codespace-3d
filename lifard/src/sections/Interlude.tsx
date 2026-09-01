import { Plate } from '@/graphics/Plate'
import { Section } from '@/components/ui'
import { useInView, useScrollProgress } from '@/lib/motion'

/**
 * Pure atmosphere. After the density of the register, one full-bleed drawing
 * that lights as it crosses the screen and says almost nothing.
 */
export function Interlude() {
  const [ref, inView] = useInView<HTMLDivElement>({ rootMargin: '0px 0px -25% 0px' })
  const parallax = useScrollProgress<HTMLDivElement>('--scroll')

  return (
    <Section ground="nocturne" label="Reception hall, drawn in plan" className="overflow-hidden">
      <div ref={ref} className="relative h-[76svh] min-h-[26rem] lg:h-[92svh]">
        <div
          ref={parallax}
          className="absolute inset-x-0 -top-[8%] h-[116%]"
          style={{ transform: 'translate3d(0, calc(var(--scroll, 0.5) * -6rem), 0)' }}
        >
          <div className="plate h-full w-full" data-lit={inView ? '' : undefined}>
            <Plate motif="hall" />
          </div>
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,var(--color-nocturne)_0%,transparent_22%,transparent_74%,var(--color-nocturne)_100%)]"
        />

        <div className="u-shell u-gutter absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-4 pb-10">
          <p className="annotation text-[color:var(--color-brass-text)]">Nocturne — Dubai</p>
          <p className="annotation-sm opacity-65">420 guests · 2 rooms · 1 040 candles</p>
        </div>
      </div>
    </Section>
  )
}
