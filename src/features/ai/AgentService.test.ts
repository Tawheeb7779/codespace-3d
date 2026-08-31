import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AiSettings } from '@/stores/settingsStore'
import type { ToolContext } from '@/features/ai/ToolDispatcher'

let mockSupabase: {
  auth: { getSession: () => Promise<{ data: { session: { access_token: string } | null } }> }
} | null = null

vi.mock('@/lib/supabaseClient', () => ({
  get supabase() {
    return mockSupabase
  },
}))

const { AiNotConfiguredError, runAgentTurn } = await import('./AgentService')

const AI: AiSettings = { provider: 'anthropic', model: 'claude', baseUrl: undefined } as unknown as AiSettings
const TOOL_CONTEXT = {} as ToolContext

function withSignedInSupabase() {
  mockSupabase = { auth: { getSession: async () => ({ data: { session: { access_token: 'tok-123' } } }) } }
}

async function run() {
  const onMessage = vi.fn()
  const controller = new AbortController()
  await runAgentTurn('hello', AI, TOOL_CONTEXT, [], { onMessage }, controller.signal)
  return onMessage
}

describe('AgentService / runAgentTurn error surfacing', () => {
  beforeEach(() => {
    mockSupabase = null
    vi.unstubAllEnvs()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('names both missing env vars when supabase is not configured at all', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
    await expect(run()).rejects.toBeInstanceOf(AiNotConfiguredError)
    await expect(run()).rejects.toThrow(/VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY/)
  })

  it('names only the one missing env var', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
    // supabase stays null here (as it would in the real client when only one var is set)
    await expect(run()).rejects.toThrow(/VITE_SUPABASE_ANON_KEY/)
    await expect(run()).rejects.not.toThrow(/VITE_SUPABASE_URL and/)
  })

  it('requires being signed in when supabase is configured but there is no session', async () => {
    mockSupabase = { auth: { getSession: async () => ({ data: { session: null } }) } }
    await expect(run()).rejects.toThrow(/signed in/i)
  })

  it('gives an actionable, specific message on a raw network-level fetch failure instead of the bare browser error', async () => {
    withSignedInSupabase()
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(run()).rejects.toThrow(/ai-agent Edge Function is deployed|Could not reach the AI agent/)
  })

  it('re-throws an AbortError as-is (a real user cancellation, not a config problem)', async () => {
    withSignedInSupabase()
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.mocked(fetch).mockRejectedValue(new DOMException('aborted', 'AbortError'))

    await expect(run()).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('gives a clear message when the response body is not valid JSON (misrouted / undeployed function)', async () => {
    withSignedInSupabase()
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.reject(new SyntaxError('Unexpected token <')),
    } as unknown as Response)

    await expect(run()).rejects.toThrow(/non-JSON response.*HTTP 404/)
  })

  it('surfaces a real HTTP error response (e.g. missing provider API key) as a chat message, not a thrown exception', async () => {
    withSignedInSupabase()
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'No API key configured for provider "anthropic". Add one in Settings → AI.' }),
    } as unknown as Response)

    const onMessage = vi.fn()
    await runAgentTurn('hello', AI, TOOL_CONTEXT, [], { onMessage }, new AbortController().signal)

    const errorMsg = onMessage.mock.calls.map(([m]) => m).find((m) => m.role === 'assistant' && m.content.includes('No API key configured'))
    expect(errorMsg).toBeDefined()
  })

  it('resolves normally on a successful response', async () => {
    withSignedInSupabase()
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ content: 'Hi there', toolCalls: [], stopReason: 'end_turn' }),
    } as unknown as Response)

    const onMessage = vi.fn()
    await runAgentTurn('hello', AI, TOOL_CONTEXT, [], { onMessage }, new AbortController().signal)

    const assistantMsg = onMessage.mock.calls.map(([m]) => m).find((m) => m.role === 'assistant')
    expect(assistantMsg?.content).toBe('Hi there')
  })
})
