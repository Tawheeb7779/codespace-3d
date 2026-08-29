import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthLayout } from '@/layouts/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { ConfigNotice } from '@/components/ConfigNotice'
import { AuthService } from '@/services/AuthService'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  if (!AuthService.isConfigured) {
    return (
      <AuthLayout title="Reset password">
        <ConfigNotice>Supabase isn't configured for this deployment, so password reset isn't available.</ConfigNotice>
      </AuthLayout>
    )
  }

  if (sent) {
    return (
      <AuthLayout title="Check your inbox" subtitle="We sent a password reset link to your email.">
        <Link to="/login" className="text-sm text-graphite-400 hover:text-graphite-200">
          Back to sign in
        </Link>
      </AuthLayout>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await AuthService.sendPasswordReset(email)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset link')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Reset your password" subtitle="We'll email you a link to reset it.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        {error && <p className="text-sm text-signal-red">{error}</p>}
        <Button type="submit" variant="primary" className="w-full" disabled={loading}>
          {loading ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-graphite-500">
        <Link to="/login" className="text-graphite-200 hover:text-ember-400">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
