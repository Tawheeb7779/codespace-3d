const STEPS = [
  { label: 'Create', description: 'Spin up a project from a real template — React, Vite, Node, or start blank.' },
  { label: 'Code', description: 'Edit with a full Monaco setup: multi-file tabs, search, and a command palette.' },
  { label: 'Run', description: 'A real runtime installs dependencies and starts your dev server in-browser.' },
  { label: 'Collaborate', description: 'Invite your team, see who is online, and leave comments on any file.' },
  { label: 'Ship', description: 'Commit your history with built-in Git, ready to push once GitHub is connected.' },
]

export function Workflow() {
  return (
    <section id="workflow" className="border-y border-hairline/70 bg-surface-raised/30 px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold tracking-[-0.015em] text-graphite-50 sm:text-4xl">From idea to shipped, in one tab</h2>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((step, i) => (
            <div key={step.label} className="relative">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ember-500/40 bg-ember-500/10 text-sm font-medium text-ember-400">
                  {i + 1}
                </span>
                <h3 className="text-sm font-medium text-graphite-100">{step.label}</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-graphite-500">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
