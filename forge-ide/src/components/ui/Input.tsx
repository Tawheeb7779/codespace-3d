import { forwardRef } from 'react'
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { clsx } from 'clsx'

/*
 * Inputs use a soft ring on focus rather than a color-swapped border: the
 * control keeps its shape and position, so focus reads as emphasis instead
 * of the field appearing to change size. `outline-none` here is safe because
 * the ring itself is the visible focus indicator.
 */
const baseClasses = clsx(
  'w-full rounded-lg border border-graphite-700 bg-graphite-900 px-3 py-2 text-sm text-graphite-100',
  'placeholder:text-graphite-500',
  'outline-none transition-[border-color,box-shadow] duration-150 ease-out',
  'focus:border-ember-500 focus:ring-2 focus:ring-ember-500/25',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'aria-[invalid=true]:border-signal-red aria-[invalid=true]:focus:ring-signal-red/25',
)

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={clsx(baseClasses, 'min-h-10', className)} {...props} />
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={clsx(baseClasses, 'resize-none', className)} {...props} />
  },
)

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-graphite-300">
      {children}
    </label>
  )
}

/** Inline validation/error text tied to a field via aria-describedby. */
export function FieldError({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm text-signal-red">
      {children}
    </p>
  )
}
