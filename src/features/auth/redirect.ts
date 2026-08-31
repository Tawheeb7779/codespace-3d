export const DEFAULT_POST_AUTH_PATH = '/dashboard'

/**
 * Validates a post-authentication redirect target.
 *
 * The `?next=` parameter survives a round trip through an external OAuth
 * provider, so it must be treated as untrusted on the way back. Only
 * same-origin, in-app paths are allowed; anything that could send the user
 * to another site after signing in falls back to the dashboard.
 *
 * Rejects: absolute URLs, protocol-relative (`//evil.com`), backslash
 * variants that some browsers normalize to `//`, and control characters.
 */
export function safeRedirectPath(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_POST_AUTH_PATH
  if (typeof raw !== 'string') return DEFAULT_POST_AUTH_PATH

  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\s]/.test(raw)) return DEFAULT_POST_AUTH_PATH
  if (!raw.startsWith('/')) return DEFAULT_POST_AUTH_PATH
  if (raw.startsWith('//') || raw.startsWith('/\\')) return DEFAULT_POST_AUTH_PATH

  return raw
}
