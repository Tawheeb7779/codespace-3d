import type { ReactNode } from 'react'

/** The small set of marks every section is built from. */

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ')
}

/* ------------------------------------------------------------------ Section */

interface SectionProps {
  id?: string
  ground: 'vellum' | 'ink' | 'nocturne'
  className?: string
  children: ReactNode
  /** Sections are landmarks; give the screen-reader outline a name. */
  label?: string
}

export function Section({ id, ground, className, children, label }: SectionProps) {
  return (
    <section
      id={id}
      data-ground={ground}
      aria-label={label}
      className={cx('relative isolate', className)}
    >
      {children}
    </section>
  )
}

/* ------------------------------------------------------------------ Heading */

interface HeadingProps {
  /** The annotation always carries information — a count, a plate range, a scope. */
  annotation?: string
  title: ReactNode
  lede?: ReactNode
  align?: 'start' | 'center'
  as?: 'h2' | 'h3'
  className?: string
}

export function Heading({
  annotation,
  title,
  lede,
  align = 'start',
  as: Tag = 'h2',
  className,
}: HeadingProps) {
  return (
    <div
      className={cx(
        'flex flex-col',
        align === 'center' && 'items-center text-center',
        className,
      )}
    >
      {annotation ? (
        <p
          data-reveal
          className="annotation mb-6 flex items-center gap-3 text-[color:var(--color-brass-text)]"
        >
          <span aria-hidden className="inline-block h-px w-8 bg-[color:var(--color-brass)] opacity-60" />
          {annotation}
        </p>
      ) : null}
      <Tag
        data-reveal
        style={{ '--reveal-delay': '60ms' } as React.CSSProperties}
        className="text-[clamp(2.1rem,5.2vw,4.25rem)]"
      >
        {title}
      </Tag>
      {lede ? (
        <div
          data-reveal
          style={{ '--reveal-delay': '140ms' } as React.CSSProperties}
          className={cx(
            'u-measure mt-7 text-[0.98rem] leading-[1.75] opacity-70',
            align === 'center' && 'mx-auto',
          )}
        >
          {lede}
        </div>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------- Button */

interface ButtonProps {
  href: string
  children: ReactNode
  variant?: 'solid' | 'line'
  className?: string
  onClick?: () => void
}

/**
 * Two treatments only. Solid is brass on its ground and is reserved for the
 * single action the page wants; line is everything else.
 */
export function Button({ href, children, variant = 'solid', className, onClick }: ButtonProps) {
  const base =
    'group relative inline-flex items-center gap-3 px-8 py-4 annotation transition-colors duration-500 ease-[var(--ease-settle)]'

  const styles =
    variant === 'solid'
      ? 'bg-[color:var(--color-brass)] text-[color:var(--color-nocturne)] hover:bg-[color:var(--color-brass-bright)]'
      : 'border border-current/35 text-current hover:border-current/80'

  return (
    <a href={href} onClick={onClick} className={cx(base, styles, className)}>
      {children}
      <Arrow />
    </a>
  )
}

function Arrow() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 22 8"
      width="22"
      height="8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      className="overflow-visible transition-transform duration-500 ease-[var(--ease-drape)] group-hover:translate-x-1.5"
    >
      <path d="M0 4h20M16.5 0.5 20 4l-3.5 3.5" />
    </svg>
  )
}

/* --------------------------------------------------------------------- Rule */

/**
 * A hairline that can carry a label, the way a drawing's border does.
 * Draws itself in when it enters view.
 */
export function Rule({ label, className }: { label?: string; className?: string }) {
  return (
    <div className={cx('flex items-center gap-5', className)}>
      <span
        data-reveal
        style={{ '--reveal-y': '0px' } as React.CSSProperties}
        className="h-px flex-1 origin-left bg-current opacity-20"
      />
      {label ? <span className="annotation-sm shrink-0 opacity-65">{label}</span> : null}
    </div>
  )
}
