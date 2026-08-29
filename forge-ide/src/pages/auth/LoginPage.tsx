import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout } from '@/layouts/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Input, Label, FieldError } from '@/components/ui/Input'
import { ConfigNotice } from '@/components/ConfigNotice'
import { OAuthButtons } from '@/pages/auth/OAuthButtons'
import { AuthDivider, AuthRedirectGate } from '@/pages/auth/authParts'
import { AuthService } from '@/services/AuthService'
import { safeRedirectPath } from '@/features/auth/redirect'
import { useAuthStore } from '@/stores/authStore'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const status = useAuthStore((s) => s.status)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const from = safeRedirectPath((location.state as { from?: string } | null)?.from)

  // Hold the screen until the session is known, so a signed-in user
  // refreshing here never sees the form flash before being redirected.
  if (status === 'loading') return <AuthRedirectGate />
  if (status === 'authenticated') return <Navigate to={from} replace />

  if (!AuthService.isConfigured) {
    return (
      <AuthLayout title="Sign in" subtitle="Cloud accounts require a Supabase project.">
        <ConfigNotice>
          Supabase isn't configured for this deployment, so cloud accounts and Google/GitHub sign-in aren't
          available. You can still use Forge IDE in{' '}
          <Link to="/dashboard" className="font-medium underline underline-offset-2">
            local mode
          </Link>{' '}
          — projects are saved in this browser only.
        </ConfigNotice>
      </AuthLayout>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await AuthService.signInWithPassword(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Sign in" subtitle="Welcome back to Forge IDE.">
      <OAuthButtons disabled={loading} />

      <AuthDivider />

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'login-error' : undefined}
          />
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              to="/forgot-password"
              className="mb-1.5 rounded text-xs text-graphite-500 transition-colors hover:text-graphite-300"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'login-error' : undefined}
          />
        </div>

        {error && <FieldError id="login-error">{error}</FieldError>}

        <Button type="submit" variant="primary" size="lg" touch loading={loading} className="w-full">
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-graphite-500">
        No account?{' '}
        <Link to="/signup" className="rounded font-medium text-graphite-200 transition-colors hover:text-ember-400">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  )
}
