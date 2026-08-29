import { forwardRef } from 'react'
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { clsx } from 'clsx'

/*
 * Inputs read as a recessed well rather than an outlined box: a darker fill
 * than the surface around them, with a hairline instead of a drawn border.
 * That inversion is what distinguishes "type here" from "press this" at a
 * glance, without either needing a heavy outline.
 *
 * Focus adds a ring outside the control instead of recoloring its border,
 * so nothing shifts or changes size when a field is focused.
 */
const baseClasses = clsx(
  'w-full bg-surface-sunken text-graphite-50 rounded-control',
  'border border-hairline',
  'shadow-[inset_0_1px_2px_rgb(0_0_0/0.25)]',
  'placeholder:text-graphite-600',
  'outline-none transition-[border-color,box-shadow,background-color] duration-150 ease-out',
  'hover:border-hairline-strong',
  'focus:border-ember-500/70 focus:bg-surface-base',
  'focus:ring-[3.5px] focus:ring-ember-500/20',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'aria-[invalid=true]:border-signal-red/70 aria-[invalid=true]:focus:ring-signal-red/20',
)

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={clsx(baseClasses, 'h-11 px-3.5 text-sm', className)} {...props} />
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={clsx(baseClasses, 'resize-none px-3.5 py-2.5 text-sm', className)} {...props} />
  },
)

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block text-[0.8125rem] font-medium tracking-[-0.006em] text-graphite-300"
    >
      {children}
    </label>
  )
}

/** Inline validation/error text tied to a field via aria-describedby. */
export function FieldError({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <p id={id} role="alert" className="mt-2 text-[0.8125rem] leading-relaxed text-signal-red">
      {children}
    </p>
  )
}
