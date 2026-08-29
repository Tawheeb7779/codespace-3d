import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { AuthLayout } from '@/layouts/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { ConfigNotice } from '@/components/ConfigNotice'
import { OAuthButtons } from '@/pages/auth/OAuthButtons'
import { AuthService } from '@/services/AuthService'
import { useAuthStore } from '@/stores/authStore'

export function SignupPage() {
  const status = useAuthStore((s) => s.status)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  if (status === 'authenticated') return <Navigate to="/dashboard" replace />

  if (!AuthService.isConfigured) {
    return (
      <AuthLayout title="Create your account" subtitle="Cloud accounts require a Supabase project.">
        <ConfigNotice>
          Supabase isn't configured for this deployment. You can still use Forge IDE in{' '}
          <Link to="/dashboard" className="underline">
            local mode
          </Link>{' '}
          — projects are saved in this browser only, with no cloud sync.
        </ConfigNotice>
      </AuthLayout>
    )
  }

  if (sent) {
    return (
      <AuthLayout title="Check your inbox" subtitle="We sent a confirmation link to your email.">
        <p className="text-sm text-graphite-400">
          Click the link in the email to finish creating your account. You can close this tab.
        </p>
      </AuthLayout>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
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
    <AuthLayout title="Create your account" subtitle="Start building for free.">
      <OAuthButtons />
      <div className="my-5 flex items-center gap-3 text-xs text-graphite-600">
        <div className="h-px flex-1 bg-graphite-800" /> or <div className="h-px flex-1 bg-graphite-800" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        {error && <p className="text-sm text-signal-red">{error}</p>}
        <Button type="submit" variant="primary" className="w-full" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-graphite-500">
        Already have an account?{' '}
        <Link to="/login" className="text-graphite-200 hover:text-ember-400">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
