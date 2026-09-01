import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { AuthLayout } from '@/layouts/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Input, Label, FieldError } from '@/components/ui/Input'
import { ConfigNotice } from '@/components/ConfigNotice'
import { AuthService } from '@/services/AuthService'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  if (!AuthService.isConfigured) {
    return (
      <AuthLayout key="config" title="Reset password">
        <ConfigNotice>Supabase isn't configured for this deployment, so password reset isn't available.</ConfigNotice>
      </AuthLayout>
    )
  }

  if (sent) {
    return (
      <AuthLayout key="sent" title="Check your inbox" subtitle="We sent a password reset link to your email.">
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-signal-green/12 text-signal-green ring-1 ring-inset ring-signal-green/20">
            <MailCheck size={24} />
          </div>
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
    <AuthLayout key="form" title="Reset your password" subtitle="We'll email you a link to reset it.">
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
            aria-describedby={error ? 'forgot-error' : undefined}
          />
        </div>
        {error && <FieldError id="forgot-error">{error}</FieldError>}
        <Button type="submit" variant="primary" size="xl" loading={loading} className="w-full">
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
