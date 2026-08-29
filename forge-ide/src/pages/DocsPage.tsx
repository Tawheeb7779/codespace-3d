import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const SECTIONS = [
  {
    title: 'Getting started',
    body: 'Sign up (or continue in local mode if no Supabase project is configured), create a project from a template, and open it in the workspace. Local-mode projects live only in your browser via IndexedDB until Supabase is configured.',
  },
  {
    title: 'Running a project',
    body: 'Forge IDE detects your package manager from lockfiles and reads package.json scripts to decide how to run your project. Web/Node projects boot in a real in-browser Node.js runtime (WebContainer); static HTML projects are served directly. Other languages can be edited but not executed in-browser.',
  },
  {
    title: 'AI agent',
    body: 'Add an API key for OpenAI, Anthropic, or Gemini in Settings → AI. The agent can list, read, write, and search your files, run scripts, and read runtime output — all changes are shown as a reviewable diff before they touch your project.',
  },
  {
    title: 'Git',
    body: 'Every project has an isomorphic-git repository over its file system. Stage, commit, branch, and view history directly in the workspace — no server round-trip required.',
  },
  { id: 'about', title: 'About', body: 'Forge IDE is a standalone browser-based development platform, built feature-by-feature with no faked functionality — see the README for exactly what is real, what needs configuration, and what is planned.' },
]

export function DocsPage() {
  return (
    <div className="min-h-screen bg-graphite-950 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-graphite-500 hover:text-graphite-300">
          <ArrowLeft size={14} /> Back home
        </Link>
        <h1 className="mt-6 text-3xl font-semibold text-graphite-50">Documentation</h1>
        <p className="mt-2 text-graphite-500">The essentials — see the project README for full setup instructions.</p>

        <div className="mt-10 space-y-8">
          {SECTIONS.map((s) => (
            <section key={s.title} id={s.id}>
              <h2 className="text-lg font-medium text-graphite-100">{s.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-graphite-400">{s.body}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
