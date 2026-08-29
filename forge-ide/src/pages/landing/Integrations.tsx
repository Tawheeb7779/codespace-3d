import { FeatureStatusBadge } from '@/components/ui/FeatureStatus'
import type { FeatureStatus } from '@/components/ui/FeatureStatus'

const INTEGRATIONS: Array<{ name: string; description: string; status: FeatureStatus }> = [
  { name: 'Supabase', description: 'Auth, database, and realtime — the backend for your account and projects.', status: 'config-required' },
  { name: 'Anthropic / OpenAI / Gemini', description: 'Bring your own API key to power the AI agent.', status: 'config-required' },
  { name: 'GitHub OAuth', description: 'Sign in with GitHub once OAuth is configured in your Supabase project.', status: 'config-required' },
  { name: 'GitHub repositories', description: 'Import and push to repositories.', status: 'planned' },
  { name: 'Vercel / Netlify deploys', description: 'One-click deployment from a project.', status: 'planned' },
]

export function Integrations() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-graphite-50 sm:text-4xl">Real integrations, honestly labeled</h2>
        <p className="mt-4 text-graphite-400">We never dress up a planned feature as a working one.</p>
      </div>

      <div className="mt-10 divide-y divide-graphite-800 rounded-xl border border-graphite-800">
        {INTEGRATIONS.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-4 px-5 py-4">
            <div>
              <p className="text-sm font-medium text-graphite-100">{item.name}</p>
              <p className="mt-0.5 text-sm text-graphite-500">{item.description}</p>
            </div>
            <FeatureStatusBadge status={item.status} />
          </div>
        ))}
      </div>
    </section>
  )
}
