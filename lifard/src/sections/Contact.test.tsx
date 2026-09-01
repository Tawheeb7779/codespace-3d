import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Contact, mailtoHref, validate } from '@/sections/Contact'

const BLANK = {
  name: '',
  email: '',
  phone: '',
  eventType: '',
  date: '',
  location: '',
  guests: '',
  message: '',
}

const VALID = {
  ...BLANK,
  name: 'Layla Haddad',
  email: 'layla@example.com',
  phone: '+971 50 123 4567',
  eventType: 'Wedding',
}

describe('enquiry validation', () => {
  it('asks for the four things the studio cannot reply without', () => {
    const errors = validate(BLANK)
    expect(Object.keys(errors).sort()).toEqual(['email', 'eventType', 'name', 'phone'])
  })

  it('passes a complete enquiry', () => {
    expect(validate(VALID)).toEqual({})
  })

  it('names what is wrong with an address rather than just rejecting it', () => {
    expect(validate({ ...VALID, email: 'layla.example.com' }).email).toMatch(/@|domain/)
  })

  it('rejects a phone number too short to dial', () => {
    expect(validate({ ...VALID, phone: '123' }).phone).toBeTruthy()
  })

  it('rejects a date in the past but accepts one in the future', () => {
    expect(validate({ ...VALID, date: '2000-01-01' }).date).toBeTruthy()
    expect(validate({ ...VALID, date: '2099-01-01' }).date).toBeUndefined()
  })

  it('rejects a non-positive guest count and accepts a real one', () => {
    expect(validate({ ...VALID, guests: '0' }).guests).toBeTruthy()
    expect(validate({ ...VALID, guests: '240' }).guests).toBeUndefined()
  })
})

describe('mail handoff', () => {
  it('writes the whole enquiry into the message body', () => {
    const href = mailtoHref({ ...VALID, guests: '240', location: 'Jeddah' })
    const body = decodeURIComponent(href.split('&body=')[1] ?? '')
    expect(body).toContain('Layla Haddad')
    expect(body).toContain('+971 50 123 4567')
    expect(body).toContain('Guests: 240')
    expect(body).toContain('Jeddah')
  })

  it('leaves out fields the visitor did not fill in', () => {
    const body = decodeURIComponent(mailtoHref(VALID).split('&body=')[1] ?? '')
    expect(body).not.toContain('Guests:')
    expect(body).not.toContain('Location:')
  })
})

describe('enquiry form', () => {
  it('reports every missing field at once and moves focus to the first', async () => {
    const user = userEvent.setup()
    render(<Contact />)

    await user.click(screen.getByRole('button', { name: /start your event/i }))

    expect(await screen.findByText('Enter your name.')).toBeInTheDocument()
    expect(screen.getByText(/phone number we can reach you on/i)).toBeInTheDocument()
    expect(screen.getByText(/email we can reply to/i)).toBeInTheDocument()
    expect(screen.getByText('Choose the kind of event.')).toBeInTheDocument()
    expect(document.activeElement).toBe(screen.getByLabelText(/^name/i))
  })

  it('clears the error on a field as soon as it is being corrected', async () => {
    const user = userEvent.setup()
    render(<Contact />)

    await user.click(screen.getByRole('button', { name: /start your event/i }))
    expect(await screen.findByText('Enter your name.')).toBeInTheDocument()

    await user.type(screen.getByLabelText(/^name/i), 'Layla')
    expect(screen.queryByText('Enter your name.')).not.toBeInTheDocument()
  })

  it('marks invalid fields for assistive technology', async () => {
    const user = userEvent.setup()
    render(<Contact />)

    await user.click(screen.getByRole('button', { name: /start your event/i }))
    expect(await screen.findByLabelText(/^name/i)).toHaveAttribute('aria-invalid', 'true')
  })
})
