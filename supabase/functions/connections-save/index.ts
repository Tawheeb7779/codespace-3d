// Stores a user's AI provider API key, encrypted at rest.
// POST { provider: 'openai'|'anthropic'|'gemini'|'openai-compatible', apiKey: string, baseUrl?: string }
// Auth: requires a valid Supabase user JWT (Authorization: Bearer <token>).
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { encryptSecret } from '../_shared/crypto.ts'

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req)
  if (optionsResponse) return optionsResponse

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: 'Missing Authorization header' }, 401)

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) return jsonResponse({ error: 'Unauthorized' }, 401)

    const encryptionSecret = Deno.env.get('AI_KEY_ENCRYPTION_SECRET')
    if (!encryptionSecret) return jsonResponse({ error: 'Server missing AI_KEY_ENCRYPTION_SECRET' }, 500)

    const body = await req.json()
    const { provider, apiKey, baseUrl } = body as { provider: string; apiKey: string; baseUrl?: string }
    const allowed = ['openai', 'anthropic', 'gemini', 'openai-compatible']
    if (!allowed.includes(provider)) return jsonResponse({ error: `Unknown provider "${provider}"` }, 400)
    if (!apiKey || typeof apiKey !== 'string') return jsonResponse({ error: 'apiKey is required' }, 400)

    const encrypted = await encryptSecret(apiKey, encryptionSecret)

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { error } = await admin
      .from('connections')
      .upsert({ user_id: user.id, provider, encrypted_api_key: encrypted, base_url: baseUrl ?? null })
    if (error) return jsonResponse({ error: error.message }, 500)

    return jsonResponse({ ok: true }, 200)
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})
