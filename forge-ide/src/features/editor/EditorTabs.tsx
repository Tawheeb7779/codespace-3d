import { X } from 'lucide-react'
import { clsx } from 'clsx'
import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from '@/stores/editorStore'
import { basename } from '@/lib/paths'
import { FileIcon } from '@/lib/fileIcon'

export function EditorTabs() {
  const { tabs, activePath, setActive, close } = useEditorStore(
    useShallow((s) => ({
      tabs: s.tabs,
      activePath: s.activePath,
      setActive: s.setActive,
      close: s.close,
    })),
  )

  if (tabs.length === 0) return null

  return (
    <div className="flex items-stretch overflow-x-auto border-b border-hairline bg-surface-raised scrollbar-thin">
      {tabs.map((tab) => {
        const active = tab.path === activePath
        return (
          // The active tab drops to the editor's own surface and carries a
          // top accent, so it reads as physically connected to the content
          // below it rather than as a highlighted list row.
          <div
            key={tab.path}
            onClick={() => setActive(tab.path)}
            className={clsx(
              'group relative flex shrink-0 cursor-pointer items-center gap-2 border-r border-hairline px-3.5 py-2.5 text-[0.8125rem]',
              'transition-colors duration-150',
              active
                ? 'bg-surface-base text-graphite-50 before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-ember-500'
                : 'text-graphite-500 hover:bg-surface-hover hover:text-graphite-200',
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
                className={clsx(
                  'reveal-on-hover-flex absolute inset-0 hidden items-center justify-center rounded transition-colors hover:bg-surface-overlay group-hover:flex',
                  !tab.dirty && 'flex',
                )}
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
