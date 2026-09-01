import { process } from '@/content/studio'
import { Heading, Section } from '@/components/ui'
import { useRevealRoot, stagger } from '@/lib/motion'

/**
 * The five stages, set on a dimension line that draws itself as the section
 * arrives. The numbering earns its place here: this is a real sequence a
 * client moves through in order, and each stage ends with something they
 * physically receive.
 */
export function Process() {
  const root = useRevealRoot<HTMLDivElement>()

  return (
    <Section id="process" ground="vellum" className="grain py-24 sm:py-32 lg:py-40">
      <div ref={root} className="u-shell u-gutter">
        <Heading
          annotation="Process — 5 stages"
          title="From an empty room to the night itself."
          lede="Roughly four to nine months, depending on scale. You always know which stage you are in and what arrives at the end of it."
        />

        {/* The line every stage hangs from. */}
        <div className="relative mt-20 lg:mt-28">
          <svg
            aria-hidden
            viewBox="0 0 1200 2"
            preserveAspectRatio="none"
            className="absolute inset-x-0 top-[6px] hidden h-px w-full text-[color:var(--color-brass-text)] lg:block"
          >
            <path data-draw d="M0 1 H1200" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>

          <ol className="grid gap-y-14 lg:grid-cols-5 lg:gap-x-8">
            {process.map((step, i) => (
              <li
                key={step.index}
                data-reveal
                style={stagger(i, 120)}
                className="relative flex flex-col lg:pt-10"
              >
                {/* Station mark on the line. */}
                <span
                  aria-hidden
                  className="absolute top-[2px] left-0 hidden h-[11px] w-[11px] rounded-full border border-[color:var(--color-brass)] bg-[color:var(--color-vellum)] lg:block"
                />

                <p className="annotation-sm text-[color:var(--color-brass-text)]">{step.index}</p>

                <h3 className="mt-4 text-[clamp(1.35rem,2.4vw,1.85rem)]">{step.title}</h3>

                <p className="mt-4 text-[0.9rem] leading-[1.75] opacity-70">{step.body}</p>

                {/* Pushed to the foot of the column so the five deliverables
                    line up regardless of how long the copy above them runs. */}
                <p className="annotation-sm mt-6 flex items-center gap-2 opacity-65 lg:mt-auto lg:pt-6">
                  <span aria-hidden className="inline-block h-px w-4 bg-current" />
                  {step.output}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Section>
  )
}
