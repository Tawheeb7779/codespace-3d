import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as Tabs from '@radix-ui/react-tabs'
import { useShallow } from 'zustand/react/shallow'
import { clsx } from 'clsx'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { ConfigNotice } from '@/components/ConfigNotice'
import { useSettingsStore } from '@/stores/settingsStore'
import type { AiProvider, Theme } from '@/stores/settingsStore'
import { useAuthStore } from '@/stores/authStore'
import { AuthService } from '@/services/AuthService'
import { ConnectionsService } from '@/services/ConnectionsService'
import { toast } from '@/stores/toastStore'
import { isSupabaseConfigured } from '@/lib/supabaseClient'
import { describeError } from '@/lib/describeError'

const TABS = ['editor', 'appearance', 'ai', 'account'] as const

export function SettingsPage() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="type-display text-graphite-50">Settings</h1>
      <p className="type-body mt-1.5 text-graphite-500">Editor, appearance, AI, and account preferences.</p>

      <Tabs.Root defaultValue="editor" className="mt-8">
        {/* Same filled-pill segmented control as the workspace's bottom
            panel, rather than a second tab language for the same idea. */}
        <Tabs.List className="inline-flex gap-0.5 rounded-xl bg-surface-sunken p-1 ring-1 ring-inset ring-hairline">
          {TABS.map((tab) => (
            <Tabs.Trigger
              key={tab}
              value={tab}
              className={clsx(
                'rounded-lg px-3.5 py-1.5 text-[0.8125rem] font-medium capitalize text-graphite-500',
                'transition-[background-color,color] duration-150',
                'data-[state=active]:bg-surface-hover data-[state=active]:text-graphite-50',
                'data-[state=active]:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.06)]',
                'hover:text-graphite-200',
              )}
            >
              {tab}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="editor" className="animate-fade-in mt-7">
          <EditorSettingsPanel />
        </Tabs.Content>
        <Tabs.Content value="appearance" className="animate-fade-in mt-7">
          <AppearanceSettingsPanel />
        </Tabs.Content>
        <Tabs.Content value="ai" className="animate-fade-in mt-7">
          <AiSettingsPanel />
        </Tabs.Content>
        <Tabs.Content value="account" className="animate-fade-in mt-7">
          <AccountSettingsPanel onSignedOut={() => navigate('/')} />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  )
}

function EditorSettingsPanel() {
  const editor = useSettingsStore((s) => s.editor)
  const updateEditor = useSettingsStore((s) => s.updateEditor)

  return (
    <div className="space-y-5">
      <Field label="Font size">
        <Input
          type="number"
          min={10}
          max={24}
          value={editor.fontSize}
          onChange={(e) => updateEditor({ fontSize: Number(e.target.value) })}
          className="w-24"
        />
      </Field>
      <Field label="Tab size">
        <Input
          type="number"
          min={1}
          max={8}
          value={editor.tabSize}
          onChange={(e) => updateEditor({ tabSize: Number(e.target.value) })}
          className="w-24"
        />
      </Field>
      <ToggleField label="Word wrap" checked={editor.wordWrap} onChange={(v) => updateEditor({ wordWrap: v })} />
      <ToggleField label="Minimap" checked={editor.minimap} onChange={(v) => updateEditor({ minimap: v })} />
      <ToggleField label="Autosave" checked={editor.autosave} onChange={(v) => updateEditor({ autosave: v })} />
      {editor.autosave && (
        <Field label="Autosave delay (ms)">
          <Input
            type="number"
            min={200}
            step={100}
            value={editor.autosaveDelayMs}
            onChange={(e) => updateEditor({ autosaveDelayMs: Number(e.target.value) })}
            className="w-28"
          />
        </Field>
      )}
    </div>
  )
}

function AppearanceSettingsPanel() {
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)

  return (
    <div className="flex gap-3">
      {(['dark', 'light', 'system'] as Theme[]).map((option) => (
        <button
          key={option}
          onClick={() => setTheme(option)}
          className={clsx(
            'flex-1 rounded-control border px-4 py-3 text-sm font-medium capitalize',
            'transition-[border-color,background-color,transform] duration-150 ease-out',
            'active:scale-[0.98] motion-reduce:active:scale-100',
            theme === option
              ? 'border-ember-500/60 bg-ember-500/[0.08] text-graphite-100 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.05),0_0_0_1px_var(--color-ember-500)]'
              : 'border-hairline text-graphite-400 hover:border-hairline-strong hover:bg-surface-hover',
          )}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

function AiSettingsPanel() {
  const ai = useSettingsStore((s) => s.ai)
  const updateAi = useSettingsStore((s) => s.updateAi)
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)

  if (!isSupabaseConfigured) {
    return <ConfigNotice>The AI agent requires Supabase to be configured (its provider proxy runs as an Edge Function).</ConfigNotice>
  }

  async function handleSaveKey() {
    if (!apiKey.trim()) return
    setSaving(true)
    try {
      await ConnectionsService.saveApiKey(ai.provider, apiKey.trim(), ai.baseUrl)
      setApiKey('')
      toast.success('API key saved', 'Encrypted and stored for your account.')
    } catch (err) {
      toast.error('Failed to save key', describeError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <Field label="Provider">
        <select
          value={ai.provider}
          onChange={(e) => updateAi({ provider: e.target.value as AiProvider })}
          className="h-10 rounded-control border border-hairline bg-surface-sunken px-3 text-sm text-graphite-200 shadow-[inset_0_1px_2px_rgb(0_0_0/0.25)] outline-none transition-colors hover:border-hairline-strong focus:border-ember-500/70 focus:ring-[3.5px] focus:ring-ember-500/20"
        >
          <option value="anthropic">Anthropic</option>
          <option value="openai">OpenAI</option>
          <option value="gemini">Google Gemini</option>
          <option value="openai-compatible">OpenAI-compatible</option>
        </select>
      </Field>
      <Field label="Model">
        <Input value={ai.model} onChange={(e) => updateAi({ model: e.target.value })} placeholder="e.g. claude-sonnet-4-5" className="w-64" />
      </Field>
      {ai.provider === 'openai-compatible' && (
        <Field label="Base URL">
          <Input value={ai.baseUrl ?? ''} onChange={(e) => updateAi({ baseUrl: e.target.value })} placeholder="https://api.example.com/v1" className="w-72" />
        </Field>
      )}
      <div>
        <Label htmlFor="api-key">API key for {ai.provider}</Label>
        <div className="flex gap-2">
          <Input id="api-key" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-…" className="max-w-xs" />
          <Button variant="primary" onClick={handleSaveKey} disabled={!apiKey.trim() || saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
        <p className="mt-1.5 text-xs text-graphite-500">Encrypted at rest; only decrypted server-side to call the provider on your behalf.</p>
      </div>
    </div>
  )
}

function AccountSettingsPanel({ onSignedOut }: { onSignedOut: () => void }) {
  const { user, status, signOut } = useAuthStore(
    useShallow((s) => ({ user: s.user, status: s.status, signOut: s.signOut })),
  )
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  if (status === 'local') {
    return <ConfigNotice>You're in local mode — projects are stored only in this browser. Configure Supabase to enable cloud accounts.</ConfigNotice>
  }

  async function handleUpdatePassword() {
    if (password.length < 8) return
    setSaving(true)
    try {
      await AuthService.updatePassword(password)
      setPassword('')
      toast.success('Password updated')
    } catch (err) {
      toast.error('Failed to update password', describeError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Label>Email</Label>
        <p className="text-sm text-graphite-300">{user?.email}</p>
      </div>
      <div>
        <Label htmlFor="new-password">New password</Label>
        <div className="flex gap-2">
          <Input id="new-password" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="max-w-xs" />
          <Button variant="outline" onClick={handleUpdatePassword} disabled={password.length < 8 || saving}>
            Update
          </Button>
        </div>
      </div>
      <Button
        variant="danger"
        loading={signingOut}
        onClick={async () => {
          setSigningOut(true)
          try {
            await signOut()
            onSignedOut()
          } catch (err) {
            toast.error('Sign out failed', describeError(err))
            setSigningOut(false)
          }
        }}
      >
        Sign out
      </Button>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-control border border-hairline px-3.5 py-2.5 transition-colors duration-150 hover:border-hairline-strong hover:bg-surface-hover/40">
      <span className="text-sm text-graphite-300">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-ember-500" />
    </label>
  )
}
