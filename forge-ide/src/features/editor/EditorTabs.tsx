import { X } from 'lucide-react'
import { clsx } from 'clsx'
import { useEditorStore } from '@/stores/editorStore'
import { basename } from '@/lib/paths'
import { FileIcon } from '@/lib/fileIcon'

export function EditorTabs() {
  const { tabs, activePath, setActive, close } = useEditorStore((s) => ({
    tabs: s.tabs,
    activePath: s.activePath,
    setActive: s.setActive,
    close: s.close,
  }))

  if (tabs.length === 0) return null

  return (
    <div className="flex items-stretch overflow-x-auto border-b border-graphite-800 bg-graphite-900 scrollbar-thin">
      {tabs.map((tab) => {
        const active = tab.path === activePath
        return (
          <div
            key={tab.path}
            onClick={() => setActive(tab.path)}
            className={clsx(
              'group flex shrink-0 cursor-pointer items-center gap-2 border-r border-graphite-800 px-3 py-2 text-sm',
              active ? 'bg-graphite-950 text-graphite-100' : 'text-graphite-500 hover:bg-graphite-850 hover:text-graphite-300',
            )}
          >
            <FileIcon path={tab.path} size={13} />
            <span className="max-w-40 truncate">{basename(tab.path)}</span>
            <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
              {tab.dirty && (
                <span className="h-1.5 w-1.5 rounded-full bg-ember-400 group-hover:hidden" aria-label="Unsaved changes" />
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (tab.dirty && !confirm(`Discard unsaved changes to ${basename(tab.path)}?`)) return
                  close(tab.path)
                }}
                className={clsx('absolute inset-0 hidden items-center justify-center rounded hover:bg-graphite-700 group-hover:flex', !tab.dirty && 'flex')}
                aria-label={`Close ${basename(tab.path)}`}
              >
                <X size={12} />
              </button>
            </span>
          </div>
        )
      })}
    </div>
  )
}
