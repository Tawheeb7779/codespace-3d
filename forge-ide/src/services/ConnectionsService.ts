import { supabase } from '@/lib/supabaseClient'
import type { AiProvider } from '@/stores/settingsStore'

export const ConnectionsService = {
  async saveApiKey(provider: AiProvider, apiKey: string, baseUrl?: string): Promise<void> {
    if (!supabase) throw new Error('Supabase is not configured.')
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    if (!token) throw new Error('You must be signed in to save an API key.')

    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/connections-save`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ provider, apiKey, baseUrl }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error ?? `Failed to save API key (${res.status})`)
    }
  },
}
