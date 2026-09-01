import { site } from '@/content/site'
import { Plate } from '@/graphics/Plate'
import { Section } from '@/components/ui'
import { useInView, useRevealRoot } from '@/lib/motion'

const facts = [
  { value: '2016', label: 'Founded' },
  { value: '140+', label: 'Events designed' },
  { value: '9', label: 'Countries worked in' },
  { value: '1', label: 'Concept per project' },
]

/**
 * Who LIFARD is, told through how they work rather than through adjectives.
 * Two columns that do not line up on purpose — the drawing sits lower than
 * the text so the section reads as a spread, not a banner.
 */
export function Studio() {
  const root = useRevealRoot<HTMLDivElement>()
  const [figureRef, inView] = useInView<HTMLDivElement>()

  return (
    <Section id="studio" ground="vellum" className="grain py-24 sm:py-32 lg:py-40">
      <div ref={root} className="u-shell u-gutter grid gap-16 lg:grid-cols-12 lg:gap-x-16">
        <div className="lg:col-span-6">
          <p
            data-reveal
            className="annotation flex items-center gap-3 text-[color:var(--color-brass-text)]"
          >
            <span aria-hidden className="inline-block h-px w-8 bg-current opacity-60" />
            The studio
          </p>

          <h2
            data-reveal
            style={{ '--reveal-delay': '60ms' } as React.CSSProperties}
            className="mt-6 text-[clamp(2rem,4.6vw,3.6rem)]"
          >
            We are a small studio that draws before it decorates.
          </h2>

          <div
            data-reveal
            style={{ '--reveal-delay': '140ms' } as React.CSSProperties}
            className="u-measure mt-9 space-y-6 text-[0.98rem] leading-[1.8] opacity-75"
          >
            <p>
              {site.name} was founded in {site.founded} on a straightforward conviction: an event is
              a piece of design, and design is something you can draw, argue about and improve
              before anyone spends money on flowers.
            </p>
            <p>
              So every project starts on paper. Floor plans to scale. Stage elevations. A lighting
              plot with every fixture on it. By the time the first truck arrives, the evening has
              already been built once, on the table, where mistakes are cheap.
            </p>
            <p>
              We keep the team deliberately small and take a limited number of events a year. The
              people who draw your wedding are the people standing in the room at midnight, moving
              the last candle two centimetres to the left.
            </p>
          </div>

          <dl className="mt-14 grid grid-cols-2 gap-x-8 gap-y-9 border-t border-[color:var(--color-ink)]/12 pt-10 sm:grid-cols-4">
            {facts.map((fact, i) => (
              <div
                key={fact.label}
                data-reveal
                style={{ '--reveal-delay': `${180 + i * 70}ms` } as React.CSSProperties}
              >
                <dt className="annotation-sm order-2 mt-2 opacity-65">{fact.label}</dt>
                <dd className="font-[family-name:var(--font-display)] text-[1.9rem] leading-none">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Sits low and runs past the text block's baseline. */}
        <div ref={figureRef} className="lg:col-span-5 lg:col-start-8 lg:pt-28">
          <div
            data-reveal
            className="plate aspect-[3/4] w-full bg-[color:var(--color-vellum-deep)]"
            data-lit={inView ? '' : undefined}
          >
            <Plate motif="bloom" title="Floral installation study, drawn to scale" />
          </div>
          <p className="annotation-sm mt-4 flex justify-between opacity-65">
            <span>Installation study</span>
            <span>Workshop, {site.contact.base}</span>
          </p>
        </div>
      </div>
    </Section>
  )
}
