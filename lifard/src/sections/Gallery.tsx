import { useMemo, useState } from 'react'
import { CATEGORIES, projects, type Category } from '@/content/work'
import { Figure } from '@/components/Figure'
import { Heading, Section, cx } from '@/components/ui'
import { useRevealRoot, stagger } from '@/lib/motion'

type Filter = Category | 'All'

/**
 * The archive.
 *
 * Work reads the projects as case studies; this reads the same body of work
 * by discipline instead, which is how clients actually arrive — they want to
 * see stages, or florals, not project names. A masonry column flow keeps the
 * drawings at their own proportions rather than cropping them all square.
 */
export function Gallery({ onOpen }: { onOpen: (index: number) => void }) {
  const root = useRevealRoot<HTMLDivElement>()
  const [filter, setFilter] = useState<Filter>('All')

  // Only offer a discipline if there is work behind it.
  const filters = useMemo<Filter[]>(() => {
    const used = CATEGORIES.filter((c) => projects.some((p) => p.tags.includes(c)))
    return ['All', ...used]
  }, [])

  const visible = useMemo(
    () =>
      projects
        .map((project, index) => ({ project, index }))
        .filter(({ project }) => filter === 'All' || project.tags.includes(filter)),
    [filter],
  )

  return (
    <Section id="gallery" ground="ink" className="py-24 sm:py-32 lg:py-40">
      <div ref={root} className="u-shell u-gutter">
        <Heading
          annotation="Archive"
          title="Look by discipline."
          lede="The same projects, sorted the way a room gets built — by what each part of it needed."
        />

        <div
          role="group"
          aria-label="Filter the archive by discipline"
          className="mt-14 flex flex-wrap gap-x-2 gap-y-3 border-b border-[color:var(--color-rule-light)] pb-6"
        >
          {filters.map((item) => {
            const isActive = filter === item
            const count =
              item === 'All'
                ? projects.length
                : projects.filter((p) => p.tags.includes(item)).length
            return (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                aria-pressed={isActive}
                className={cx(
                  'annotation-sm flex items-center gap-2 border px-4 py-2.5 transition-colors duration-500 ease-[var(--ease-settle)]',
                  isActive
                    ? 'border-[color:var(--color-brass)] bg-[color:var(--color-brass)] text-[color:var(--color-nocturne)]'
                    : 'border-[color:var(--color-rule-light)] opacity-60 hover:border-current/40 hover:opacity-100',
                )}
              >
                {item}
                <span className={cx('tabular-nums', isActive ? 'opacity-70' : 'opacity-65')}>
                  {String(count).padStart(2, '0')}
                </span>
              </button>
            )
          })}
        </div>

        {/* CSS columns give real masonry without measuring anything. */}
        <div className="mt-12 gap-6 [column-count:1] sm:[column-count:2] lg:[column-count:3]">
          {visible.map(({ project, index }, i) => (
            <article
              key={project.plate}
              data-reveal
              style={stagger(i, 70)}
              className="mb-6 break-inside-avoid"
            >
              <button
                type="button"
                onClick={() => onOpen(index)}
                className="group block w-full text-left"
                aria-label={`${project.name}. Open plate.`}
              >
                <Figure
                  motif={project.motif}
                  photo={project.photo}
                  className={cx(
                    'w-full bg-[color:var(--color-nocturne)]',
                    // Vary the crop so the columns do not march in step.
                    i % 3 === 0 ? 'aspect-[3/4]' : i % 3 === 1 ? 'aspect-[4/3]' : 'aspect-[1/1]',
                  )}
                />
                <div className="mt-4 flex items-baseline justify-between gap-4">
                  <h3 className="text-[1.15rem] transition-opacity duration-500 group-hover:opacity-100 lg:opacity-80">
                    {project.name}
                  </h3>
                  <span className="annotation-sm shrink-0 text-[color:var(--color-brass-text)] opacity-70">
                    {project.plate}
                  </span>
                </div>
                <p className="annotation-sm mt-2 opacity-65">
                  {project.location} — {project.year}
                </p>
              </button>
            </article>
          ))}
        </div>

        {visible.length === 0 ? (
          <p className="py-20 text-center text-[0.95rem] opacity-60">
            Nothing filed under {filter} yet. Try another discipline.
          </p>
        ) : null}
      </div>
    </Section>
  )
}
