import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import { clsx } from 'clsx'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size = 'sm' | 'md' | 'lg' | 'xl' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  /** Shows a spinner in place of the leading content and blocks interaction. */
  loading?: boolean
  /** Renders at the 44px minimum touch target regardless of size. */
  touch?: boolean
}

/*
 * Filled surfaces rather than outlines: a control reads as a physical
 * affordance you can press, and the inset top highlight gives it a lit
 * top edge so it sits above the surface behind it instead of being a
 * rectangle drawn on it. `secondary` and `outline` differ only in weight,
 * so a screen can carry two tiers of non-primary action without a third
 * visual language.
 */
const VARIANT_CLASSES: Record<Variant, string> = {
  primary: clsx(
    'bg-ember-500 text-white',
    'shadow-[inset_0_1px_0_0_rgb(255_255_255/0.18),0_1px_2px_rgb(0_0_0/0.3)]',
    'hover:bg-ember-400 active:bg-ember-600',
  ),
  secondary: clsx(
    'bg-surface-hover text-graphite-100 border border-hairline-strong',
    'shadow-[inset_0_1px_0_0_rgb(255_255_255/0.05)]',
    'hover:bg-surface-overlay hover:border-hairline-strong',
  ),
  outline: clsx(
    'bg-surface-raised text-graphite-200 border border-hairline',
    'shadow-[inset_0_1px_0_0_rgb(255_255_255/0.04)]',
    'hover:bg-surface-hover hover:text-graphite-50 hover:border-hairline-strong',
  ),
  ghost: 'text-graphite-400 hover:bg-surface-hover hover:text-graphite-100',
  danger: clsx(
    'bg-signal-red/90 text-white',
    'shadow-[inset_0_1px_0_0_rgb(255_255_255/0.15)]',
    'hover:bg-signal-red',
  ),
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-9 px-3.5 text-sm gap-2 rounded-control',
  lg: 'h-11 px-5 text-sm gap-2 rounded-control',
  xl: 'h-12 px-6 text-[0.9375rem] gap-2.5 rounded-control',
  icon: 'h-9 w-9 rounded-lg',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'secondary', size = 'md', loading = false, touch = false, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(
        'relative inline-flex select-none items-center justify-center whitespace-nowrap',
        'font-medium tracking-[-0.006em]',
        // Press feedback is the fastest signal that a control registered a
        // tap — it matters most on touch, where there is no hover to confirm it.
        'transition-[background-color,border-color,color,transform,opacity,box-shadow] duration-150 ease-out',
        'active:scale-[0.975] motion-reduce:active:scale-100',
        'disabled:pointer-events-none disabled:opacity-45',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        touch && 'min-h-11',
        className,
      )}
      {...props}
    >
      {loading && <Loader2 size={size === 'sm' ? 13 : 16} className="animate-spin" aria-hidden />}
      {children}
    </button>
  )
})
