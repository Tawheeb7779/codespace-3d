/**
 * Extracts the most useful human-readable detail available from an unknown
 * thrown value.
 *
 * Every error toast in the app used to test `err instanceof Error` and fall
 * back to `undefined` otherwise, which silently discards
 * the cause for anything that isn't an `Error` — a rejected fetch, a Supabase
 * `PostgrestError` (a plain object with `message`), a thrown string. The user
 * was then left with a bare title like "Failed to create project" and nothing
 * to act on.
 *
 * This never invents a cause: if the value genuinely carries no message, it
 * returns `undefined` and the caller's title stands on its own.
 */
export function describeError(err: unknown): string | undefined {
  if (err == null) return undefined
  if (typeof err === 'string') return err.trim() || undefined
  if (err instanceof Error) return err.message || undefined

  if (typeof err === 'object') {
    const record = err as Record<string, unknown>
    // Supabase/PostgREST errors and DOMException-likes: a `message`, often
    // with a more specific `details`/`hint` worth appending.
    const message = typeof record.message === 'string' ? record.message.trim() : ''
    const details = typeof record.details === 'string' ? record.details.trim() : ''
    const hint = typeof record.hint === 'string' ? record.hint.trim() : ''
    const parts = [message, details, hint].filter(Boolean)
    if (parts.length > 0) return [...new Set(parts)].join(' — ')
  }

  return undefined
}
