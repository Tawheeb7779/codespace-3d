import { Section } from '@/components/ui'
import { useRevealRoot } from '@/lib/motion'

/**
 * A breath between the work and the services. One sentence, one rule, and a
 * great deal of nothing — the page's only genuinely empty screen.
 */
export function Statement() {
  const root = useRevealRoot<HTMLDivElement>()

  return (
    <Section ground="ink" label="What LIFARD does" className="py-32 sm:py-40 lg:py-56">
      <div ref={root} className="u-shell u-gutter">
        <svg
          aria-hidden
          viewBox="0 0 1200 2"
          preserveAspectRatio="none"
          className="mb-16 h-px w-full text-[color:var(--color-brass-text)]"
        >
          <path data-draw d="M0 1 H1200" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>

        <p
          data-reveal
          className="max-w-[52rem] font-[family-name:var(--font-display)] text-[clamp(1.65rem,4.1vw,3.4rem)] leading-[1.24] tracking-[-0.012em]"
        >
          A venue gives you four walls and a ceiling. Everything else — the light you remember, the
          table you sat at, the moment the doors opened — is designed.
        </p>

        <p
          data-reveal
          style={{ '--reveal-delay': '180ms' } as React.CSSProperties}
          className="annotation mt-14 text-[color:var(--color-brass-text)]"
        >
          That is the part we do.
        </p>
      </div>
    </Section>
  )
}
