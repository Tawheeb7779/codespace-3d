import { useEffect, useRef, useState } from 'react'
import { Bot, Send, Square, User, Wrench } from 'lucide-react'
import { clsx } from 'clsx'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { ConfigNotice } from '@/components/ConfigNotice'
import { AiNotConfiguredError, runAgentTurn } from '@/features/ai/AgentService'
import type { AgentMessage } from '@/features/ai/AgentService'
import { ChangesReview } from '@/features/ai/ChangesReview'
import { useWorkspace } from '@/features/workspace/WorkspaceContext'
import { useSettingsStore } from '@/stores/settingsStore'
import { isSupabaseConfigured } from '@/lib/supabaseClient'
import { toast } from '@/stores/toastStore'
import { useWorkspaceUiStore } from '@/stores/workspaceUiStore'

export function AiPanel() {
  const { fs, changeTracker } = useWorkspace()
  const ai = useSettingsStore((s) => s.ai)
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [input, setInput] = useState('')
  const [running, setRunning] = useState(false)
  const [, forceTick] = useState(0)
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  if (!isSupabaseConfigured) {
    return (
      <div className="p-4">
        <ConfigNotice>
          The AI agent proxy runs as a Supabase Edge Function, so it needs Supabase configured (and an API key
          added in Settings → AI) to work.
        </ConfigNotice>
      </div>
    )
  }

  const aiDraftPrompt = useWorkspaceUiStore((s) => s.aiDraftPrompt)
  const lastAppliedDraft = useRef<number | null>(null)

  useEffect(() => {
    if (aiDraftPrompt && aiDraftPrompt.nonce !== lastAppliedDraft.current) {
      lastAppliedDraft.current = aiDraftPrompt.nonce
      handleSend(aiDraftPrompt.text)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiDraftPrompt])

  async function handleSend(explicitText?: string) {
    const text = (explicitText ?? input).trim()
    if (!text || running) return
    setInput('')
    setRunning(true)
    abortRef.current = new AbortController()

    try {
      await runAgentTurn(
        text,
        ai,
        { fs, changeTracker },
        messages,
        {
          onMessage: (message) => {
            setMessages((prev) => [...prev, message])
            forceTick((t) => t + 1)
          },
        },
        abortRef.current.signal,
      )
    } catch (err) {
      if (err instanceof AiNotConfiguredError) {
        toast.error('AI not configured', err.message)
      } else if (!(err instanceof DOMException && err.name === 'AbortError')) {
        toast.error('Agent error', err instanceof Error ? err.message : undefined)
      }
    } finally {
      setRunning(false)
    }
  }

  function handleCancel() {
    abortRef.current?.abort()
    setRunning(false)
  }

  const changes = changeTracker.getChanges(fs)

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3 scrollbar-thin">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-3.5 px-4 pt-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-overlay ring-1 ring-inset ring-hairline">
              <Bot size={20} className="text-ember-400" />
            </div>
            <p className="max-w-[15rem] text-[0.8125rem] leading-relaxed text-graphite-500">
              Ask the agent to build, fix, or explain something. It can read and edit your files and run your
              project.
            </p>
          </div>
        )}
        {messages
          .filter((m) => m.role !== 'tool')
          .map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
        {running && (
          <div className="flex items-center gap-2 text-xs text-graphite-500">
            <Bot size={14} className="animate-pulse" /> Working…
          </div>
        )}
      </div>

      {changes.length > 0 && (
        <div className="h-72 shrink-0">
          <ChangesReview
            changes={changes}
            onRevertFile={(path) => {
              changeTracker.revertFile(fs, path)
              forceTick((t) => t + 1)
            }}
            onRevertAll={() => {
              changeTracker.revertAll(fs)
              forceTick((t) => t + 1)
            }}
            onAcceptAll={() => {
              changeTracker.acceptAll()
              forceTick((t) => t + 1)
            }}
          />
        </div>
      )}

      <div className="flex items-end gap-2 border-t border-hairline p-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void handleSend()
            }
          }}
          placeholder="Ask the agent…"
          rows={2}
          className="flex-1"
        />
        {running ? (
          <Button variant="danger" size="icon" onClick={handleCancel} aria-label="Cancel">
            <Square size={14} />
          </Button>
        ) : (
          <Button variant="primary" size="icon" onClick={() => handleSend()} disabled={!input.trim()} aria-label="Send">
            <Send size={14} />
          </Button>
        )}
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: AgentMessage }) {
  const isUser = message.role === 'user'
  return (
    <div className={clsx('flex gap-2', isUser && 'flex-row-reverse')}>
      <div className={clsx('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full', isUser ? 'bg-graphite-700' : 'bg-ember-500/20 text-ember-400')}>
        {isUser ? <User size={13} /> : <Bot size={13} />}
      </div>
      <div className={clsx('max-w-[85%] rounded-lg px-3 py-2 text-sm', isUser ? 'bg-surface-hover text-graphite-100' : 'bg-surface-raised text-graphite-200')}>
        {message.content && <p className="whitespace-pre-wrap">{message.content}</p>}
        {message.toolCalls?.map((call) => (
          <div key={call.id} className="mt-1.5 flex items-center gap-1.5 rounded bg-surface-overlay px-2 py-1 text-xs text-graphite-500">
            <Wrench size={11} /> {call.name}
            {typeof call.arguments.path === 'string' && <span className="text-graphite-400">{call.arguments.path}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
