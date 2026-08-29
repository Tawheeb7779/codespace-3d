import { supabase } from '@/lib/supabaseClient'
import { AGENT_TOOLS } from '@/features/ai/tools'
import { executeTool } from '@/features/ai/ToolDispatcher'
import type { ToolContext } from '@/features/ai/ToolDispatcher'
import type { AiSettings } from '@/stores/settingsStore'

export interface AgentToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface AgentMessage {
  id: string
  role: 'user' | 'assistant' | 'tool'
  content: string
  toolCallId?: string
  toolName?: string
  toolCalls?: AgentToolCall[]
}

interface AgentTurnResult {
  content: string | null
  toolCalls: AgentToolCall[]
  stopReason: 'end_turn' | 'tool_use' | 'max_tokens' | 'error'
  error?: string
}

export class AiNotConfiguredError extends Error {
  constructor() {
    super('AI features require Supabase to be configured (the agent proxy runs as a Supabase Edge Function).')
    this.name = 'AiNotConfiguredError'
  }
}

const SYSTEM_PROMPT = `You are Forge IDE's coding agent, embedded in a real browser-based development environment.
You have tools to inspect and modify the user's actual project files and to run real commands in a live runtime.
Always inspect before you assume: list files and read the ones relevant to the task before editing.
After making changes to a runnable project, run it (or run its build/tests) and read the output to verify your change actually works, fixing and re-running as needed.
Be concise in your final explanation: summarize what you changed and why, and mention anything you could not verify.`

const MAX_STEPS = 10

async function callModel(
  ai: AiSettings,
  messages: AgentMessage[],
  signal: AbortSignal,
): Promise<AgentTurnResult> {
  if (!supabase) throw new AiNotConfiguredError()

  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error('You must be signed in to use the AI agent.')

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-agent`, {
    method: 'POST',
    signal,
    headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      provider: ai.provider,
      model: ai.model,
      baseUrl: ai.baseUrl,
      system: SYSTEM_PROMPT,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        toolCallId: m.toolCallId,
        toolName: m.toolName,
        toolCalls: m.toolCalls,
      })),
      tools: AGENT_TOOLS,
    }),
  })

  const data = (await res.json()) as AgentTurnResult
  if (!res.ok) {
    return { content: null, toolCalls: [], stopReason: 'error', error: data.error ?? `Request failed (${res.status})` }
  }
  return data
}

export interface AgentRunHandlers {
  onMessage: (message: AgentMessage) => void
  onStepStart?: (step: number) => void
}

/**
 * Runs the bounded agent loop: model call -> execute any tool calls ->
 * feed results back -> repeat, up to MAX_STEPS. Cancellable via AbortSignal
 * (spec §24: cancellation, timeout, step limits).
 */
export async function runAgentTurn(
  userText: string,
  ai: AiSettings,
  toolContext: ToolContext,
  history: AgentMessage[],
  handlers: AgentRunHandlers,
  signal: AbortSignal,
): Promise<void> {
  const userMessage: AgentMessage = { id: crypto.randomUUID(), role: 'user', content: userText }
  handlers.onMessage(userMessage)
  const messages = [...history, userMessage]

  for (let step = 0; step < MAX_STEPS; step++) {
    if (signal.aborted) return
    handlers.onStepStart?.(step)

    const result = await callModel(ai, messages, signal)

    if (result.stopReason === 'error') {
      const errorMessage: AgentMessage = { id: crypto.randomUUID(), role: 'assistant', content: `⚠ ${result.error}` }
      handlers.onMessage(errorMessage)
      return
    }

    const assistantMessage: AgentMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: result.content ?? '',
      toolCalls: result.toolCalls.length > 0 ? result.toolCalls : undefined,
    }
    handlers.onMessage(assistantMessage)
    messages.push(assistantMessage)

    if (result.toolCalls.length === 0) return

    for (const call of result.toolCalls) {
      if (signal.aborted) return
      const output = await executeTool(call.name, call.arguments, toolContext)
      const toolMessage: AgentMessage = {
        id: crypto.randomUUID(),
        role: 'tool',
        content: output,
        toolCallId: call.id,
        toolName: call.name,
      }
      handlers.onMessage(toolMessage)
      messages.push(toolMessage)
    }
  }

  handlers.onMessage({
    id: crypto.randomUUID(),
    role: 'assistant',
    content: `⚠ Stopped after ${MAX_STEPS} steps to avoid a runaway loop. Ask me to continue if more work is needed.`,
  })
}
