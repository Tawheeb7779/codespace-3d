import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import { clsx } from 'clsx'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size = 'sm' | 'md' | 'lg' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-ember-500 text-white hover:bg-ember-400 active:bg-ember-600 shadow-sm shadow-ember-900/30',
  secondary: 'bg-graphite-800 text-graphite-100 hover:bg-graphite-700 border border-graphite-700',
  outline: 'border border-graphite-700 text-graphite-200 hover:bg-graphite-800',
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
  { className, variant = 'secondary', size = 'md', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={clsx(
        'inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-colors duration-150',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    />
  )
})
