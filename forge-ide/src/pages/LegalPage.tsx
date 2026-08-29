import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const CONTENT: Record<string, { title: string; body: string[] }> = {
  terms: {
    title: 'Terms of use',
    body: [
      'Forge IDE is provided as-is, under active development. By using it you agree that it may change, and that you are responsible for the code and data you create with it.',
      'When self-hosted with your own Supabase project, you control your data and are responsible for securing your own credentials and API keys.',
    ],
  },
  privacy: {
    title: 'Privacy',
    body: [
      'Account data (email, profile) and project content are stored in the Supabase project you configure — Forge IDE itself does not operate a shared multi-tenant backend.',
      'AI provider API keys are encrypted at rest and only decrypted server-side, inside the AI proxy function, to make requests on your behalf. They are never sent to the browser after being saved.',
      'In local mode (no Supabase configured), all project data stays in your browser\'s IndexedDB and is never transmitted anywhere.',
    ],
  },
  security: {
    title: 'Security',
    body: [
      'All file paths are validated server- and client-side to prevent path traversal outside a project.',
      'Row Level Security is enforced on every Supabase table so users can only read or modify projects and teams they belong to.',
      'Report a vulnerability by opening an issue in the project repository with reproduction steps.',
    ],
  },
}

export function LegalPage() {
  const { page } = useParams<{ page: string }>()
  const entry = CONTENT[page ?? ''] ?? { title: 'Not found', body: ['This page does not exist.'] }

  return (
    <div className="min-h-screen bg-graphite-950 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-graphite-500 hover:text-graphite-300">
          <ArrowLeft size={14} /> Back home
        </Link>
        <h1 className="mt-6 text-3xl font-semibold text-graphite-50">{entry.title}</h1>
        <div className="mt-6 space-y-4">
          {entry.body.map((p, i) => (
            <p key={i} className="text-sm leading-relaxed text-graphite-400">
              {p}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}
