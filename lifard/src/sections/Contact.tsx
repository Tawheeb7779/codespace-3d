import { useId, useRef, useState } from 'react'
import { eventTypes } from '@/content/studio'
import { site } from '@/content/site'
import { Section, cx } from '@/components/ui'
import { useRevealRoot } from '@/lib/motion'

/**
 * The commission sheet.
 *
 * Laid out like the order form a studio actually fills in: ruled lines
 * rather than boxes, monospaced labels, and the fields grouped the way the
 * questions get asked — who you are, then what the evening is.
 *
 * It works with no backend. If VITE_INQUIRY_ENDPOINT is set the form POSTs
 * JSON to it; otherwise it opens the visitor's mail client with the whole
 * enquiry already written out, so the message genuinely reaches the studio
 * either way.
 */

interface Fields {
  name: string
  email: string
  phone: string
  eventType: string
  date: string
  location: string
  guests: string
  message: string
}

const EMPTY: Fields = {
  name: '',
  email: '',
  phone: '',
  eventType: '',
  date: '',
  location: '',
  guests: '',
  message: '',
}

type Status = 'idle' | 'sending' | 'sent' | 'handoff' | 'error'

export function Contact() {
  const root = useRevealRoot<HTMLDivElement>()
  const [fields, setFields] = useState<Fields>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({})
  const [status, setStatus] = useState<Status>('idle')
  const [failure, setFailure] = useState<string | null>(null)
  const statusRef = useRef<HTMLParagraphElement>(null)

  const set = (key: keyof Fields) => (value: string) => {
    setFields((f) => ({ ...f, [key]: value }))
    // Clear an error the moment the visitor starts fixing it.
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e))
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = validate(fields)
    setErrors(found)

    if (Object.keys(found).length > 0) {
      // Send focus to the first field that needs work.
      const first = Object.keys(found)[0]
      document.getElementById(`field-${first}`)?.focus()
      return
    }

    const endpoint = import.meta.env.VITE_INQUIRY_ENDPOINT as string | undefined

    if (!endpoint) {
      window.location.href = mailtoHref(fields)
      setStatus('handoff')
      return
    }

    setStatus('sending')
    setFailure(null)
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(fields),
      })
      if (!response.ok) {
        setFailure(`The studio's inbox returned ${response.status}.`)
        setStatus('error')
        return
      }
      setStatus('sent')
      setFields(EMPTY)
    } catch {
      setFailure('The request never reached the studio — check your connection.')
      setStatus('error')
    }
  }

  return (
    <Section id="contact" ground="vellum" className="grain py-24 sm:py-32 lg:py-40">
      <div ref={root} className="u-shell u-gutter grid gap-16 lg:grid-cols-12 lg:gap-x-16">
        {/* Left: what happens next, so the form is not a leap of faith. */}
        <div className="lg:col-span-5">
          <p
            data-reveal
            className="annotation flex items-center gap-3 text-[color:var(--color-brass-text)]"
          >
            <span aria-hidden className="inline-block h-px w-8 bg-current opacity-60" />
            Enquiries
          </p>

          <h2
            data-reveal
            style={{ '--reveal-delay': '60ms' } as React.CSSProperties}
            className="mt-6 text-[clamp(2rem,4.6vw,3.6rem)]"
          >
            Tell us about the evening.
          </h2>

          <p
            data-reveal
            style={{ '--reveal-delay': '140ms' } as React.CSSProperties}
            className="u-measure mt-8 text-[0.98rem] leading-[1.8] opacity-75"
          >
            We take a limited number of events each year, so the first conversation is
            genuinely a conversation — about the venue, the guest list, and what the budget
            has to cover. No pitch deck.
          </p>

          <dl className="mt-12 space-y-6 border-t border-[color:var(--color-ink)]/12 pt-10">
            {[
              { term: 'Reply time', detail: 'Within two working days' },
              { term: 'Lead time', detail: 'Four to nine months, typically' },
              { term: 'Based in', detail: site.contact.base },
              { term: 'Travels to', detail: site.contact.travels },
            ].map((row) => (
              <div key={row.term} className="flex items-baseline justify-between gap-6">
                <dt className="annotation-sm opacity-65">{row.term}</dt>
                <dd className="text-[0.92rem]">{row.detail}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-10 flex flex-col gap-2">
            <a
              href={`mailto:${site.contact.email}`}
              className="font-[family-name:var(--font-display)] text-[1.35rem] underline decoration-[color:var(--color-brass)] decoration-1 underline-offset-[6px] transition-colors hover:text-[color:var(--color-brass-text)]"
            >
              {site.contact.email}
            </a>
            <a href={`tel:${site.contact.phone.replace(/\s/g, '')}`} className="annotation-sm opacity-65 hover:opacity-100">
              {site.contact.phone}
            </a>
          </div>
        </div>

        {/* Right: the sheet itself. */}
        <form
          noValidate
          onSubmit={onSubmit}
          data-reveal
          style={{ '--reveal-delay': '120ms' } as React.CSSProperties}
          className="lg:col-span-6 lg:col-start-7"
          aria-describedby="form-status"
        >
          <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
            <Field
              name="name"
              label="Name"
              value={fields.name}
              onChange={set('name')}
              error={errors.name}
              autoComplete="name"
              required
            />
            <Field
              name="phone"
              label="Phone"
              type="tel"
              value={fields.phone}
              onChange={set('phone')}
              error={errors.phone}
              autoComplete="tel"
              required
            />
            <Field
              name="email"
              label="Email"
              type="email"
              value={fields.email}
              onChange={set('email')}
              error={errors.email}
              autoComplete="email"
              className="sm:col-span-2"
              required
            />

            <SelectField
              name="eventType"
              label="Event type"
              value={fields.eventType}
              onChange={set('eventType')}
              error={errors.eventType}
              options={eventTypes}
              required
            />
            <Field
              name="date"
              label="Event date"
              type="date"
              value={fields.date}
              onChange={set('date')}
              error={errors.date}
              hint="Approximate is fine"
            />

            <Field
              name="location"
              label="Location"
              value={fields.location}
              onChange={set('location')}
              error={errors.location}
              hint="City, or the venue if it is booked"
            />
            <Field
              name="guests"
              label="Guests"
              type="number"
              inputMode="numeric"
              value={fields.guests}
              onChange={set('guests')}
              error={errors.guests}
              hint="Estimate"
            />

            <Field
              name="message"
              label="What are you imagining?"
              value={fields.message}
              onChange={set('message')}
              error={errors.message}
              multiline
              className="sm:col-span-2"
            />
          </div>

          <div className="mt-11 flex flex-wrap items-center gap-6">
            <button
              type="submit"
              disabled={status === 'sending'}
              className="annotation group inline-flex items-center gap-3 bg-[color:var(--color-ink)] px-9 py-5 text-[color:var(--color-vellum-strong)] transition-colors duration-500 ease-[var(--ease-settle)] hover:bg-[color:var(--color-brass)] hover:text-[color:var(--color-nocturne)] disabled:opacity-65"
            >
              {status === 'sending' ? 'Sending' : 'Start your event'}
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
            </button>

            <p className="annotation-sm opacity-65">Required — name, phone, email, event type</p>
          </div>

          {/* One place for every outcome, announced to assistive tech. */}
          <p
            id="form-status"
            ref={statusRef}
            role="status"
            aria-live="polite"
            className={cx(
              'mt-8 text-[0.92rem] leading-relaxed',
              status === 'error' ? 'text-[#8c3a24]' : 'text-[color:var(--color-ink)]/75',
            )}
          >
            {status === 'sent' &&
              'Received. We will reply within two working days, from studio@lifard.com.'}
            {status === 'handoff' && (
              <>
                Your email app should be opening with the enquiry already written. If nothing
                happened, send it to{' '}
                <a href={`mailto:${site.contact.email}`} className="underline underline-offset-4">
                  {site.contact.email}
                </a>
                .
              </>
            )}
            {status === 'error' && (
              <>
                {failure} Send it to{' '}
                <a href={`mailto:${site.contact.email}`} className="underline underline-offset-4">
                  {site.contact.email}
                </a>{' '}
                instead and it will reach the same inbox.
              </>
            )}
          </p>
        </form>
      </div>
    </Section>
  )
}

/* ------------------------------------------------------------------ Fields */

interface FieldProps {
  name: keyof Fields
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  type?: string
  hint?: string
  required?: boolean
  multiline?: boolean
  className?: string
  autoComplete?: string
  inputMode?: 'numeric' | 'text' | 'tel' | 'email'
}

function Field({
  name,
  label,
  value,
  onChange,
  error,
  type = 'text',
  hint,
  required,
  multiline,
  className,
  autoComplete,
  inputMode,
}: FieldProps) {
  const hintId = useId()
  const errorId = useId()
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ')

  const shared = {
    id: `field-${name}`,
    name,
    value,
    required,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy || undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(e.target.value),
    className: cx(
      'w-full border-0 border-b bg-transparent pt-2 pb-3 text-[1rem] outline-none transition-colors duration-400',
      'placeholder:text-[color:var(--color-ink)]/25',
      // The underline is the field. It brightens on focus, reddens on error.
      error
        ? 'border-b-[#8c3a24]'
        : 'border-b-[color:var(--color-ink)]/22 focus:border-b-[color:var(--color-brass)]',
      // Date and number controls need their own indicator colour.
      '[color-scheme:light]',
    ),
  }

  return (
    <div className={className}>
      <label htmlFor={`field-${name}`} className="annotation-sm flex items-baseline gap-2 opacity-65">
        {label}
        {required ? (
          <span aria-hidden className="text-[color:var(--color-brass-text)]">
            *
          </span>
        ) : null}
      </label>

      {multiline ? (
        <textarea {...shared} rows={4} className={cx(shared.className, 'resize-none')} />
      ) : (
        <input {...shared} type={type} autoComplete={autoComplete} inputMode={inputMode} />
      )}

      {hint && !error ? (
        <p id={hintId} className="annotation-sm mt-2 opacity-65">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="annotation-sm mt-2 text-[#8c3a24]">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function SelectField({
  name,
  label,
  value,
  onChange,
  error,
  options,
  required,
}: {
  name: keyof Fields
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  options: readonly string[]
  required?: boolean
}) {
  const errorId = useId()
  return (
    <div>
      <label htmlFor={`field-${name}`} className="annotation-sm flex items-baseline gap-2 opacity-65">
        {label}
        {required ? (
          <span aria-hidden className="text-[color:var(--color-brass-text)]">
            *
          </span>
        ) : null}
      </label>
      <select
        id={`field-${name}`}
        name={name}
        value={value}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={cx(
          'w-full appearance-none border-0 border-b bg-transparent pt-2 pb-3 text-[1rem] outline-none transition-colors duration-400',
          'bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'8\' fill=\'none\' stroke=\'%2316211E\'%3E%3Cpath d=\'M1 1.5 6 6.5l5-5\'/%3E%3C/svg%3E")] bg-[length:12px_8px] bg-[right_2px_center] bg-no-repeat pr-8',
          error
            ? 'border-b-[#8c3a24]'
            : 'border-b-[color:var(--color-ink)]/22 focus:border-b-[color:var(--color-brass)]',
        )}
      >
        <option value="">Select one</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error ? (
        <p id={errorId} className="annotation-sm mt-2 text-[#8c3a24]">
          {error}
        </p>
      ) : null}
    </div>
  )
}

/* -------------------------------------------------------------- Validation */

/** Direct, specific, and never apologetic. */
export function validate(fields: Fields): Partial<Record<keyof Fields, string>> {
  const errors: Partial<Record<keyof Fields, string>> = {}

  if (!fields.name.trim()) errors.name = 'Enter your name.'
  if (!fields.phone.trim()) {
    errors.phone = 'Enter a phone number we can reach you on.'
  } else if (fields.phone.replace(/\D/g, '').length < 7) {
    errors.phone = 'That number looks too short to dial.'
  }

  if (!fields.email.trim()) {
    errors.email = 'Enter an email we can reply to.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) {
    errors.email = 'That address is missing an @ or a domain.'
  }

  if (!fields.eventType) errors.eventType = 'Choose the kind of event.'

  if (fields.guests && Number(fields.guests) <= 0) {
    errors.guests = 'Guest count needs to be a positive number.'
  }

  if (fields.date) {
    const chosen = new Date(fields.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (!Number.isNaN(chosen.valueOf()) && chosen < today) {
      errors.date = 'That date has already passed.'
    }
  }

  return errors
}

/** The whole enquiry, written out, ready to send. */
export function mailtoHref(fields: Fields): string {
  const lines = [
    `Name: ${fields.name}`,
    `Phone: ${fields.phone}`,
    `Email: ${fields.email}`,
    `Event type: ${fields.eventType}`,
    fields.date ? `Date: ${fields.date}` : null,
    fields.location ? `Location: ${fields.location}` : null,
    fields.guests ? `Guests: ${fields.guests}` : null,
    '',
    fields.message || '(no message)',
  ].filter((line): line is string => line !== null)

  const subject = `Event enquiry — ${fields.eventType || 'Event'}${
    fields.date ? `, ${fields.date}` : ''
  }`

  return `mailto:${site.contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
    lines.join('\n'),
  )}`
}
