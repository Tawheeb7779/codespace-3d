import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { AuthLayout } from '@/layouts/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Input, Label, FieldError } from '@/components/ui/Input'
import { ConfigNotice } from '@/components/ConfigNotice'
import { OAuthButtons } from '@/pages/auth/OAuthButtons'
import { AuthDivider, AuthRedirectGate } from '@/pages/auth/authParts'
import { AuthService } from '@/services/AuthService'
import { useAuthStore } from '@/stores/authStore'

const MIN_PASSWORD_LENGTH = 8

export function SignupPage() {
  const status = useAuthStore((s) => s.status)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  if (status === 'loading') return <AuthRedirectGate />
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />

  if (!AuthService.isConfigured) {
    return (
      <AuthLayout key="config" title="Create your account" subtitle="Cloud accounts require a Supabase project.">
        <ConfigNotice>
          Supabase isn't configured for this deployment, so account creation and Google/GitHub sign-in aren't
          available. You can still use Forge IDE in{' '}
          <Link to="/dashboard" className="font-medium underline underline-offset-2">
            local mode
          </Link>{' '}
          — projects are saved in this browser only, with no cloud sync.
        </ConfigNotice>
      </AuthLayout>
    )
  }

  if (sent) {
    return (
      <AuthLayout key="sent" title="Check your inbox" subtitle={`We sent a confirmation link to ${email}.`}>
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-signal-green/12 text-signal-green ring-1 ring-inset ring-signal-green/20">
            <MailCheck size={24} />
          </div>
          <p className="text-sm text-graphite-400">
            Click the link in the email to finish creating your account. You can close this tab.
          </p>
          <Link to="/login" className="text-sm font-medium text-graphite-300 hover:text-ember-400">
            Back to sign in
          </Link>
        </div>
      </AuthLayout>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    setLoading(true)
    try {
      await AuthService.signUpWithPassword(email, password)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      key="form"
      title="Create your account"
      subtitle="Start building for free."
      footer={
        <p className="type-secondary text-graphite-500">
          Already have an account?{' '}
          <Link
            to="/login"
            className="rounded font-medium text-graphite-200 transition-colors duration-150 hover:text-ember-400"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <OAuthButtons disabled={loading} />

      <AuthDivider />

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'signup-error' : undefined}
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'signup-error' : 'password-hint'}
          />
          {!error && (
            <p id="password-hint" className="mt-2 text-[0.8125rem] text-graphite-600">
              At least {MIN_PASSWORD_LENGTH} characters.
            </p>
          )}
        </div>

        {error && <FieldError id="signup-error">{error}</FieldError>}

        <Button type="submit" variant="primary" size="xl" loading={loading} className="w-full">
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  )
}
