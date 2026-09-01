/**
 * OAuth provider registry. Adding a provider Supabase already supports is a
 * data change here plus enabling it in the Supabase dashboard — no new
 * branching in the auth flow (spec §7: "architecture should allow
 * additional providers later").
 */
export type OAuthProviderId = 'google' | 'github'

export interface OAuthProviderConfig {
  id: OAuthProviderId
  label: string
  icon: React.ComponentType<{ className?: string }>
}

/* Brand marks are inlined rather than pulled from an icon pack: Google's
   multicolor "G" has no equivalent in a monochrome icon set, and both
   marks have brand-guideline shapes worth keeping exact. */
function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M23.06 12.25c0-.86-.08-1.68-.22-2.47H12v4.68h6.2a5.3 5.3 0 0 1-2.3 3.48v2.9h3.72c2.18-2 3.44-4.96 3.44-8.59Z"
      />
      <path
        fill="#34A853"
        d="M12 23.5c3.11 0 5.72-1.03 7.62-2.79l-3.72-2.89c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.55-2.03-6.46-4.76H1.69v2.98A11.5 11.5 0 0 0 12 23.5Z"
      />
      <path
        fill="#FBBC05"
        d="M5.54 14.16a6.9 6.9 0 0 1 0-4.41V6.77H1.69a11.51 11.51 0 0 0 0 10.37l3.85-2.98Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.02c1.69 0 3.21.58 4.4 1.72l3.3-3.3C17.72 1.6 15.11.5 12 .5A11.5 11.5 0 0 0 1.69 6.77l3.85 2.98C6.45 7.05 9 5.02 12 5.02Z"
      />
    </svg>
  )
}

function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false" fill="currentColor">
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.11.79-.25.79-.55v-2.15c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.8 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.25 5.67.41.35.78 1.05.78 2.12v3.14c0 .3.21.67.8.55A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  )
}

export const OAUTH_PROVIDERS: OAuthProviderConfig[] = [
  { id: 'google', label: 'Google', icon: GoogleMark },
  { id: 'github', label: 'GitHub', icon: GitHubMark },
]
