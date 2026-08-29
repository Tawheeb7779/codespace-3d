import { Bot, Code2, GitBranch, Monitor, TerminalSquare, Users } from 'lucide-react'

const FEATURES = [
  {
    icon: Code2,
    title: 'Monaco-powered editor',
    description: 'The same editor engine as VS Code — tabs, multi-cursor, command palette, and syntax highlighting for 30+ languages.',
  },
  {
    icon: TerminalSquare,
    title: 'Real in-browser runtime',
    description: 'A genuine Node.js environment running in your browser via WebContainer — install packages, run scripts, and see real output.',
  },
  {
    icon: Monitor,
    title: 'Live preview',
    description: 'Your app renders as you type, with runtime errors surfaced in a dedicated problems panel — not a static screenshot.',
  },
  {
    icon: Bot,
    title: 'AI coding agent',
    description: 'An agent with real tools — it reads your files, edits them, runs your project, and iterates on failures until it works.',
  },
  {
    icon: GitBranch,
    title: 'Git, built in',
    description: 'Stage, commit, and browse history directly in the workspace, backed by a real Git implementation over your project files.',
  },
  {
    icon: Users,
    title: 'Team workspaces',
    description: 'Shared projects, roles, and live presence — see who is online and what they are working on.',
  },
]

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-graphite-50 sm:text-4xl">Everything a serious dev environment needs</h2>
        <p className="mt-4 text-graphite-400">No mockups. Every capability below runs against real code.</p>
      </div>

      <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-xl border border-hairline bg-surface-raised/40 p-6 transition-colors hover:border-hairline-strong">
            <div className="mb-4 inline-flex rounded-lg bg-ember-500/10 p-2.5 text-ember-400">
              <f.icon size={20} />
            </div>
            <h3 className="text-base font-medium text-graphite-100">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-graphite-500">{f.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
