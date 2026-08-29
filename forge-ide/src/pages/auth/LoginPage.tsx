import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AuthLayout } from '@/layouts/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { ConfigNotice } from '@/components/ConfigNotice'
import { OAuthButtons } from '@/pages/auth/OAuthButtons'
import { AuthService } from '@/services/AuthService'
import { useAuthStore } from '@/stores/authStore'

export function LoginPage() {
  const navigate = useNavigate()
  const status = useAuthStore((s) => s.status)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (status === 'authenticated') return <Navigate to="/dashboard" replace />

  if (!AuthService.isConfigured) {
    return (
      <AuthLayout title="Sign in" subtitle="Cloud accounts require a Supabase project.">
        <ConfigNotice>
          Supabase isn't configured for this deployment, so cloud accounts aren't available. You can still use
          Forge IDE in{' '}
          <Link to="/dashboard" className="underline">
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
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Sign in" subtitle="Welcome back to Forge IDE.">
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="mb-1.5 text-xs text-graphite-500 hover:text-graphite-300">
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
          />
        </div>
        {error && <p className="text-sm text-signal-red">{error}</p>}
        <Button type="submit" variant="primary" className="w-full" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-graphite-500">
        No account?{' '}
        <Link to="/signup" className="text-graphite-200 hover:text-ember-400">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  )
}
