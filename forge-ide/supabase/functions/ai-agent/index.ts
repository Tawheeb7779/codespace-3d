// Single-turn LLM proxy used by the client-side agent loop (see
// src/features/ai/AgentService.ts). The client owns the loop and executes
// tools locally against the project's file system / runtime; this function
// only ever makes ONE model call per request and normalizes the response
// across providers so the client doesn't need provider-specific parsing.
//
// POST body:
// {
//   provider: 'openai' | 'anthropic' | 'gemini' | 'openai-compatible',
//   model: string,
//   baseUrl?: string,               // required for 'openai-compatible'
//   apiKeyOverride?: string,        // used transiently when testing a key in Settings; never stored
//   system: string,
//   messages: AgentMessage[],
//   tools: AgentTool[],
// }
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { decryptSecret } from '../_shared/crypto.ts'

interface AgentTool {
  name: string
  description: string
  parameters: Record<string, unknown>
}

interface AgentMessage {
  role: 'user' | 'assistant' | 'tool'
  content: string
  toolCallId?: string
  toolName?: string
  toolCalls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }>
}

interface AgentResult {
  content: string | null
  toolCalls: Array<{ id: string; name: string; arguments: Record<string, unknown> }>
  stopReason: 'end_turn' | 'tool_use' | 'max_tokens' | 'error'
  error?: string
}

const MAX_OUTPUT_TOKENS = 4096

async function callAnthropic(apiKey: string, model: string, system: string, messages: AgentMessage[], tools: AgentTool[]): Promise<AgentResult> {
  const anthropicMessages = messages.map((m) => {
    if (m.role === 'tool') {
      return {
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: m.toolCallId, content: m.content }],
      }
    }
    if (m.role === 'assistant' && m.toolCalls?.length) {
      return {
        role: 'assistant',
        content: [
          ...(m.content ? [{ type: 'text', text: m.content }] : []),
          ...m.toolCalls.map((tc) => ({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.arguments })),
        ],
      }
    }
    return { role: m.role, content: m.content }
  })

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      system,
      max_tokens: MAX_OUTPUT_TOKENS,
      messages: anthropicMessages,
      tools: tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters })),
    }),
  })

  if (!res.ok) {
    return { content: null, toolCalls: [], stopReason: 'error', error: `Anthropic API error ${res.status}: ${await res.text()}` }
  }
  const data = await res.json()
  const textBlocks = (data.content ?? []).filter((b: { type: string }) => b.type === 'text')
  const toolBlocks = (data.content ?? []).filter((b: { type: string }) => b.type === 'tool_use')
  return {
    content: textBlocks.map((b: { text: string }) => b.text).join('\n') || null,
    toolCalls: toolBlocks.map((b: { id: string; name: string; input: Record<string, unknown> }) => ({
      id: b.id,
      name: b.name,
      arguments: b.input,
    })),
    stopReason: data.stop_reason === 'tool_use' ? 'tool_use' : data.stop_reason === 'max_tokens' ? 'max_tokens' : 'end_turn',
  }
}

async function callOpenAiCompatible(apiKey: string, model: string, system: string, messages: AgentMessage[], tools: AgentTool[], baseUrl: string): Promise<AgentResult> {
  const openAiMessages = [
    { role: 'system', content: system },
    ...messages.map((m) => {
      if (m.role === 'tool') {
        return { role: 'tool', tool_call_id: m.toolCallId, content: m.content }
      }
      if (m.role === 'assistant' && m.toolCalls?.length) {
        return {
          role: 'assistant',
          content: m.content || null,
          tool_calls: m.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function',
            function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
          })),
        }
      }
      return { role: m.role, content: m.content }
    }),
  ]

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: openAiMessages,
      max_tokens: MAX_OUTPUT_TOKENS,
      tools: tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } })),
    }),
  })

  if (!res.ok) {
    return { content: null, toolCalls: [], stopReason: 'error', error: `OpenAI-compatible API error ${res.status}: ${await res.text()}` }
  }
  const data = await res.json()
  const choice = data.choices?.[0]
  const toolCalls = (choice?.message?.tool_calls ?? []).map((tc: { id: string; function: { name: string; arguments: string } }) => ({
    id: tc.id,
    name: tc.function.name,
    arguments: safeJsonParse(tc.function.arguments),
  }))
  return {
    content: choice?.message?.content ?? null,
    toolCalls,
    stopReason: toolCalls.length > 0 ? 'tool_use' : choice?.finish_reason === 'length' ? 'max_tokens' : 'end_turn',
  }
}

async function callGemini(apiKey: string, model: string, system: string, messages: AgentMessage[], tools: AgentTool[]): Promise<AgentResult> {
  const contents = messages.map((m) => {
    if (m.role === 'tool') {
      return { role: 'user', parts: [{ functionResponse: { name: m.toolName, response: { result: m.content } } }] }
    }
    if (m.role === 'assistant' && m.toolCalls?.length) {
      return {
        role: 'model',
        parts: m.toolCalls.map((tc) => ({ functionCall: { name: tc.name, args: tc.arguments } })),
      }
    }
    return { role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }
  })

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents,
      tools: tools.length ? [{ functionDeclarations: tools.map((t) => ({ name: t.name, description: t.description, parameters: t.parameters })) }] : undefined,
      generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS },
    }),
  })

  if (!res.ok) {
    return { content: null, toolCalls: [], stopReason: 'error', error: `Gemini API error ${res.status}: ${await res.text()}` }
  }
  const data = await res.json()
  const parts = data.candidates?.[0]?.content?.parts ?? []
  const textParts = parts.filter((p: { text?: string }) => p.text)
  const fnParts = parts.filter((p: { functionCall?: unknown }) => p.functionCall)
  return {
    content: textParts.map((p: { text: string }) => p.text).join('\n') || null,
    toolCalls: fnParts.map((p: { functionCall: { name: string; args: Record<string, unknown> } }, i: number) => ({
      id: `${p.functionCall.name}-${i}`,
      name: p.functionCall.name,
      arguments: p.functionCall.args,
    })),
    stopReason: fnParts.length > 0 ? 'tool_use' : 'end_turn',
  }
}

function safeJsonParse(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}

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

    const body = await req.json()
    const { provider, model, baseUrl, apiKeyOverride, system, messages, tools } = body as {
      provider: string
      model: string
      baseUrl?: string
      apiKeyOverride?: string
      system: string
      messages: AgentMessage[]
      tools: AgentTool[]
    }

    let apiKey = apiKeyOverride
    if (!apiKey) {
      const encryptionSecret = Deno.env.get('AI_KEY_ENCRYPTION_SECRET')
      if (!encryptionSecret) return jsonResponse({ error: 'Server missing AI_KEY_ENCRYPTION_SECRET' }, 500)
      const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
      const { data: connection, error } = await admin
        .from('connections')
        .select('encrypted_api_key')
        .eq('user_id', user.id)
        .eq('provider', provider)
        .maybeSingle()
      if (error) return jsonResponse({ error: error.message }, 500)
      if (!connection) {
        return jsonResponse({ error: `No API key configured for provider "${provider}". Add one in Settings → AI.` }, 400)
      }
      apiKey = await decryptSecret(connection.encrypted_api_key, encryptionSecret)
    }

    let result: AgentResult
    switch (provider) {
      case 'anthropic':
        result = await callAnthropic(apiKey, model, system, messages, tools)
        break
      case 'openai':
        result = await callOpenAiCompatible(apiKey, model, system, messages, tools, 'https://api.openai.com/v1')
        break
      case 'openai-compatible':
        if (!baseUrl) return jsonResponse({ error: 'baseUrl is required for openai-compatible provider' }, 400)
        result = await callOpenAiCompatible(apiKey, model, system, messages, tools, baseUrl)
        break
      case 'gemini':
        result = await callGemini(apiKey, model, system, messages, tools)
        break
      default:
        return jsonResponse({ error: `Unknown provider "${provider}"` }, 400)
    }

    return jsonResponse(result, result.stopReason === 'error' ? 502 : 200)
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})
