import { SHORTCUT_GROUPS } from '@/features/workspace/shortcuts'

export function KeyboardShortcutsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="type-display text-graphite-50">Keyboard shortcuts</h1>
      <p className="type-body mt-1.5 text-graphite-500">
        These work anywhere inside an open project, including while the editor has focus.
      </p>

      <div className="mt-8 space-y-8">
        {SHORTCUT_GROUPS.map((group) => (
          <section key={group.category}>
            <h2 className="type-label text-graphite-600">{group.category}</h2>
            <div className="surface-card mt-3 divide-y divide-hairline overflow-hidden rounded-card">
              {group.items.map((item) => (
                <div key={item.keys.join('+') + item.description} className="flex items-center justify-between gap-4 px-4 py-3">
                  <span className="text-sm text-graphite-300">{item.description}</span>
                  <div className="flex shrink-0 items-center gap-1">
                    {item.keys.map((key, i) => (
                      <kbd
                        key={i}
                        className="rounded-md bg-surface-sunken px-1.5 py-1 text-[11px] font-medium text-graphite-300 ring-1 ring-inset ring-hairline-strong"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
