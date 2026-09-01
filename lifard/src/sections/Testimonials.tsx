import { testimonials } from '@/content/studio'
import { Section, cx } from '@/components/ui'
import { useRevealRoot, stagger } from '@/lib/motion'

/**
 * Three quotes, set as pull quotes rather than cards. No avatars, no stars,
 * no carousel — the typography does the work and the attribution stays
 * quiet underneath.
 */
export function Testimonials() {
  const root = useRevealRoot<HTMLDivElement>()

  return (
    <Section ground="ink" label="What clients said" className="py-24 sm:py-32 lg:py-40">
      <div ref={root} className="u-shell u-gutter">
        <p data-reveal className="annotation flex items-center gap-3 text-[color:var(--color-brass-text)]">
          <span aria-hidden className="inline-block h-px w-8 bg-current opacity-60" />
          In their words
        </p>

        <div className="mt-16 grid gap-x-12 gap-y-16 lg:grid-cols-3">
          {testimonials.map((item, i) => (
            <figure
              key={item.attribution + item.context}
              data-reveal
              style={stagger(i, 130)}
              className={cx(
                'flex flex-col justify-between border-t border-[color:var(--color-rule-light)] pt-8',
                // Stagger the columns so the row does not read as a table.
                i === 1 && 'lg:mt-14',
                i === 2 && 'lg:mt-28',
              )}
            >
              <blockquote className="font-[family-name:var(--font-display)] text-[clamp(1.25rem,2vw,1.6rem)] leading-[1.42]">
                {item.quote}
              </blockquote>
              <figcaption className="annotation-sm mt-8 opacity-65">
                <span className="text-[color:var(--color-brass-text)]">{item.attribution}</span>
                <span aria-hidden className="mx-2 opacity-40">
                  /
                </span>
                {item.context}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </Section>
  )
}
