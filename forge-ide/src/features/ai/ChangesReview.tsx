import { useState } from 'react'
import { DiffEditor } from '@monaco-editor/react'
import { Check, FilePlus, FileMinus, FileEdit, RotateCcw, X } from 'lucide-react'
import { clsx } from 'clsx'
import { Button } from '@/components/ui/Button'
import { languageForPath } from '@/lib/languageMap'
import { useResolvedTheme } from '@/app/useThemeEffect'
import type { FileChange } from '@/features/ai/ChangeTracker'

const ICON = { created: FilePlus, deleted: FileMinus, modified: FileEdit, renamed: FileEdit }
const ICON_COLOR = { created: 'text-signal-green', deleted: 'text-signal-red', modified: 'text-signal-amber', renamed: 'text-signal-violet' }

export function ChangesReview({
  changes,
  onRevertFile,
  onRevertAll,
  onAcceptAll,
}: {
  changes: FileChange[]
  onRevertFile: (path: string) => void
  onRevertAll: () => void
  onAcceptAll: () => void
}) {
  const [selected, setSelected] = useState<string | null>(changes[0]?.path ?? null)
  const resolvedTheme = useResolvedTheme()

  if (changes.length === 0) return null
  const active = changes.find((c) => c.path === selected) ?? changes[0]

  return (
    <div className="flex h-full flex-col border-t border-graphite-800 bg-graphite-900">
      <div className="flex items-center justify-between border-b border-graphite-800 px-3 py-2">
        <p className="text-xs font-medium uppercase tracking-wide text-graphite-500">
          AI changes ({changes.length} file{changes.length === 1 ? '' : 's'})
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onRevertAll}>
            <RotateCcw size={13} /> Revert all
          </Button>
          <Button variant="primary" size="sm" onClick={onAcceptAll}>
            <Check size={13} /> Accept all
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-52 shrink-0 overflow-y-auto border-r border-graphite-800 scrollbar-thin">
          {changes.map((change) => {
            const Icon = ICON[change.kind]
            return (
              <button
                key={change.path}
                onClick={() => setSelected(change.path)}
                className={clsx(
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-xs',
                  active.path === change.path ? 'bg-graphite-800 text-graphite-100' : 'text-graphite-400 hover:bg-graphite-850',
                )}
              >
                <Icon size={13} className={clsx('shrink-0', ICON_COLOR[change.kind])} />
                <span className="truncate">{change.path}</span>
              </button>
            )
          })}
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between border-b border-graphite-800 px-3 py-1.5">
            <span className="truncate text-xs text-graphite-400">{active.path}</span>
            <button
              onClick={() => onRevertFile(active.path)}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-graphite-500 hover:bg-graphite-800 hover:text-graphite-200"
            >
              <X size={11} /> Revert this file
            </button>
          </div>
          <div className="h-[calc(100%-2rem)]">
            <DiffEditor
              language={languageForPath(active.path)}
              original={active.before ?? ''}
              modified={active.after ?? ''}
              theme={resolvedTheme === 'light' ? 'vs' : 'vs-dark'}
              options={{ readOnly: true, renderSideBySide: true, minimap: { enabled: false }, fontSize: 12 }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
