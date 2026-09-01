import { projects } from '@/content/work'
import { Figure } from '@/components/Figure'
import { Heading, Rule, Section, cx } from '@/components/ui'
import { useRevealRoot, stagger } from '@/lib/motion'

/**
 * The index of plates.
 *
 * Laid out as facing pages rather than a card grid: each band pairs a wide
 * drawing with a narrow one, the split alternates, and the second item drops
 * below the first so the eye moves diagonally down the sheet instead of
 * scanning rows.
 */

/** Per-position composition. Deliberate, not generated. */
const COMPOSITION = [
  { span: 'lg:col-span-7', ratio: 'aspect-[4/3]', drop: '' },
  { span: 'lg:col-span-5', ratio: 'aspect-[3/4]', drop: 'lg:mt-28' },
  { span: 'lg:col-span-5', ratio: 'aspect-[4/5]', drop: '' },
  { span: 'lg:col-span-7', ratio: 'aspect-[16/10]', drop: 'lg:mt-36' },
  { span: 'lg:col-span-7', ratio: 'aspect-[16/9]', drop: '' },
  { span: 'lg:col-span-5', ratio: 'aspect-[1/1]', drop: 'lg:mt-24' },
  { span: 'lg:col-span-5', ratio: 'aspect-[3/4]', drop: '' },
  { span: 'lg:col-span-7', ratio: 'aspect-[4/3]', drop: 'lg:mt-32' },
] as const

export function Work({ onOpen }: { onOpen: (index: number) => void }) {
  const root = useRevealRoot<HTMLDivElement>()

  return (
    <Section id="work" ground="vellum" className="grain py-24 sm:py-32 lg:py-40">
      <div ref={root} className="u-shell u-gutter">
        <Heading
          annotation={`Selected work — ${projects.length} plates`}
          title={
            <>
              Every evening begins
              <br />
              as a drawing.
            </>
          }
          lede="A project reaches the room only after it has survived the page. These are the drawings the rooms were built from."
        />

        <Rule className="mt-16 mb-14" label="P-01 — P-08" />

        <div className="grid grid-cols-1 gap-x-8 gap-y-16 lg:grid-cols-12 lg:gap-y-4">
          {projects.map((project, i) => {
            const layout = COMPOSITION[i] ?? COMPOSITION[0]
            return (
              <article
                key={project.plate}
                data-reveal
                style={stagger(i % 2, 110)}
                className={cx('group', layout.span, layout.drop)}
              >
                <button
                  type="button"
                  onClick={() => onOpen(i)}
                  className="block w-full text-left"
                  aria-label={`${project.name}, ${project.category} in ${project.location}. Open plate.`}
                >
                  <Figure
                    motif={project.motif}
                    photo={project.photo}
                    className={cx('w-full bg-[color:var(--color-vellum-deep)]', layout.ratio)}
                  />

                  <div className="mt-5 flex items-baseline justify-between gap-4 border-t border-[color:var(--color-ink)]/12 pt-4">
                    <h3 className="text-[clamp(1.3rem,2.1vw,1.7rem)]">{project.name}</h3>
                    <span className="annotation-sm shrink-0 text-[color:var(--color-brass-text)] opacity-80">
                      {project.plate}
                    </span>
                  </div>

                  <p className="annotation-sm mt-3 opacity-65">
                    {project.category} — {project.location}, {project.year}
                  </p>

                  {/* The case note. Always readable on touch; on a pointer it
                      waits until the plate is being looked at. */}
                  <p
                    className={cx(
                      'u-measure mt-4 text-[0.9rem] leading-[1.7] opacity-70 transition-all duration-700 ease-[var(--ease-settle)]',
                      'lg:-translate-y-1 lg:opacity-0 lg:group-hover:translate-y-0 lg:group-hover:opacity-70 lg:group-focus-within:translate-y-0 lg:group-focus-within:opacity-70',
                    )}
                  >
                    {project.note}
                  </p>
                </button>
              </article>
            )
          })}
        </div>
      </div>
    </Section>
  )
}
