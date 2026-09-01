import { useState } from 'react'
import { services } from '@/content/studio'
import { Plate } from '@/graphics/Plate'
import { Heading, Rule, Section, cx } from '@/components/ui'
import { useRevealRoot } from '@/lib/motion'

/**
 * Services as an index, not a price list.
 *
 * The list on the left behaves like a drawing register: moving through it
 * changes the plate held beside it. Each entry states what the client
 * actually receives, because "bespoke floral artistry" tells nobody anything
 * and "installation engineering, seasonal sourcing, build & strike" does.
 */
export function Services() {
  const root = useRevealRoot<HTMLDivElement>()
  const [active, setActive] = useState(0)

  return (
    <Section id="services" ground="vellum" className="grain py-24 sm:py-32 lg:py-40">
      <div ref={root} className="u-shell u-gutter">
        <Heading
          annotation={`Services — ${services.length}`}
          title={
            <>
              What we are
              <br />
              asked to make.
            </>
          }
        />

        <Rule className="mt-16 mb-4" label="Register" />

        <div className="grid gap-x-16 lg:grid-cols-[1fr_minmax(0,26rem)] lg:items-start">
          <ul className="border-t border-[color:var(--color-ink)]/12">
            {services.map((service, i) => {
              const isActive = i === active
              return (
                <li key={service.index} className="border-b border-[color:var(--color-ink)]/12">
                  <button
                    type="button"
                    aria-expanded={isActive}
                    onClick={() => setActive(i)}
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    className="group flex w-full items-baseline gap-5 py-6 text-left sm:gap-8"
                  >
                    <span
                      className={cx(
                        'annotation-sm shrink-0 transition-colors duration-500',
                        isActive
                          ? 'text-[color:var(--color-brass-text)]'
                          : 'text-[color:var(--color-ink)]/35',
                      )}
                    >
                      {service.index}
                    </span>

                    <span className="flex-1">
                      <span
                        className={cx(
                          'block font-[family-name:var(--font-display)] text-[clamp(1.4rem,3.1vw,2.35rem)] leading-none transition-[opacity,transform] duration-500 ease-[var(--ease-drape)]',
                          isActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-80',
                        )}
                      >
                        {service.name}
                      </span>

                      {/* Grid-rows trick: animates to the content's real height
                          without measuring anything in JS. */}
                      <span
                        className={cx(
                          'grid transition-[grid-template-rows,opacity] duration-700 ease-[var(--ease-settle)]',
                          isActive ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                        )}
                      >
                        <span className="overflow-hidden">
                          <span className="u-measure block pt-5 text-[0.92rem] leading-[1.75] opacity-70">
                            {service.summary}
                          </span>

                          <span className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
                            {service.includes.map((item) => (
                              <span
                                key={item}
                                className="annotation-sm flex items-center gap-2 opacity-65"
                              >
                                <span
                                  aria-hidden
                                  className="inline-block h-px w-3 bg-[color:var(--color-brass)]"
                                />
                                {item}
                              </span>
                            ))}
                          </span>

                          {/* The plate, inline, where there is no room beside. */}
                          <span className="mt-7 block lg:hidden">
                            <span className="plate block aspect-[4/3] w-full bg-[color:var(--color-vellum-deep)]">
                              <Plate motif={service.motif} />
                            </span>
                          </span>
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          {/* Held plate. Sticks alongside the register as it is read. */}
          <div className="hidden lg:block">
            <div className="sticky top-32">
              <div className="plate relative aspect-[3/4] w-full bg-[color:var(--color-vellum-deep)]" data-lit>
                {services.map((service, i) => (
                  <div
                    key={service.index}
                    aria-hidden={i !== active}
                    className={cx(
                      'absolute inset-0 transition-opacity duration-[900ms] ease-[var(--ease-settle)]',
                      i === active ? 'opacity-100' : 'opacity-0',
                    )}
                  >
                    <Plate motif={service.motif} />
                  </div>
                ))}
              </div>
              <p className="annotation-sm mt-4 flex justify-between opacity-65">
                <span>{services[active]?.name}</span>
                <span>{services[active]?.index} / 07</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Section>
  )
}
