import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { AuthService } from '@/services/AuthService'
import { toast } from '@/stores/toastStore'

export function OAuthButtons() {
  const [pending, setPending] = useState<'google' | 'github' | null>(null)

  async function handle(provider: 'google' | 'github') {
    setPending(provider)
    try {
      await AuthService.signInWithOAuth(provider)
    } catch (err) {
      toast.error('Sign-in failed', err instanceof Error ? err.message : undefined)
      setPending(null)
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <Button variant="outline" onClick={() => handle('google')} disabled={pending !== null}>
        {pending === 'google' ? 'Redirecting…' : 'Google'}
      </Button>
      <Button variant="outline" onClick={() => handle('github')} disabled={pending !== null}>
        {pending === 'github' ? 'Redirecting…' : 'GitHub'}
      </Button>
    </div>
  )
}
