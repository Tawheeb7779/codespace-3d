import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import { clsx } from 'clsx'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size = 'sm' | 'md' | 'lg' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  /** Shows a spinner in place of the leading content and blocks interaction. */
  loading?: boolean
  /** Renders at the 44px minimum touch target regardless of size (mobile-first controls). */
  touch?: boolean
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-ember-500 text-white hover:bg-ember-400 active:bg-ember-600 shadow-sm shadow-ember-900/30',
  secondary: 'bg-graphite-800 text-graphite-100 hover:bg-graphite-700 border border-graphite-700',
  outline: 'border border-graphite-700 text-graphite-200 hover:bg-graphite-800 hover:border-graphite-600',
  ghost: 'text-graphite-300 hover:bg-graphite-800 hover:text-graphite-100',
  danger: 'bg-signal-red/90 text-white hover:bg-signal-red',
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'h-8 px-2.5 text-xs gap-1.5 rounded-md',
  md: 'h-9 px-3.5 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-sm gap-2 rounded-lg',
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
        'relative inline-flex select-none items-center justify-center whitespace-nowrap font-medium',
        // Press feedback is the fastest signal that a control registered a
        // tap — it matters most on touch, where there is no hover to confirm it.
        'transition-[background-color,border-color,color,transform,opacity] duration-150 ease-out',
        'active:scale-[0.97] motion-reduce:active:scale-100',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        touch && 'min-h-11',
        className,
      )}
      {...props}
    >
      {loading && <Loader2 size={size === 'sm' ? 13 : 15} className="animate-spin" aria-hidden />}
      {children}
    </button>
  )
})
