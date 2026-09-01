import { describe, expect, it } from 'vitest'
import { describeError } from './describeError'

describe('describeError', () => {
  it('reads an Error message', () => {
    expect(describeError(new Error('Local storage is locked by another tab'))).toBe(
      'Local storage is locked by another tab',
    )
  })

  it('passes a thrown string through', () => {
    expect(describeError('quota exceeded')).toBe('quota exceeded')
  })

  it('reads a Supabase-style error object (the case the old code dropped)', () => {
    expect(describeError({ message: 'permission denied for table projects', code: '42501' })).toBe(
      'permission denied for table projects',
    )
  })

  it('appends details and hint when present, without repeating them', () => {
    expect(
      describeError({ message: 'insert failed', details: 'row violates policy', hint: 'sign in first' }),
    ).toBe('insert failed — row violates policy — sign in first')
    expect(describeError({ message: 'same', details: 'same' })).toBe('same')
  })

  it('returns undefined when there is genuinely no cause to report, rather than inventing one', () => {
    expect(describeError(null)).toBeUndefined()
    expect(describeError(undefined)).toBeUndefined()
    expect(describeError({})).toBeUndefined()
    expect(describeError('   ')).toBeUndefined()
    expect(describeError(new Error(''))).toBeUndefined()
  })
})
