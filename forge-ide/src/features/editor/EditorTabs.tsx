import { useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { History, PanelBottom, PanelRight, Rows3, X, XSquare } from 'lucide-react'
import { clsx } from 'clsx'
import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from '@/stores/editorStore'
import { useWorkspace } from '@/features/workspace/WorkspaceContext'
import { basename } from '@/lib/paths'
import { FileIcon } from '@/lib/fileIcon'
import { menuContentClass, menuItemClass, menuSeparatorClass } from '@/components/ui/menu'

export function EditorTabs() {
  const { tabs, activePath, setActive, close, closeAll, closeOthers, reopenLastClosed, closedStack, openSplit } = useEditorStore(
    useShallow((s) => ({
      tabs: s.tabs,
      activePath: s.activePath,
      setActive: s.setActive,
      close: s.close,
      closeAll: s.closeAll,
      closeOthers: s.closeOthers,
      reopenLastClosed: s.reopenLastClosed,
      closedStack: s.closedStack,
      openSplit: s.openSplit,
    })),
  )
  const { fs } = useWorkspace()
  const [menuFor, setMenuFor] = useState<string | null>(null)

  function requestClose(path: string, dirty: boolean) {
    if (dirty && !confirm(`Discard unsaved changes to ${basename(path)}?`)) return
    close(path)
  }

  if (tabs.length === 0) return null

  return (
    <div className="flex items-stretch overflow-x-auto border-b border-hairline bg-surface-raised scrollbar-thin">
      {tabs.map((tab) => {
        const active = tab.path === activePath
        return (
          // The active tab drops to the editor's own surface and carries a
          // top accent, so it reads as physically connected to the content
          // below it rather than as a highlighted list row.
          //
          // The dropdown's trigger is a separate, pointer-events-none span
          // rather than this whole div, deliberately: Radix's
          // DropdownMenu.Trigger opens on any click it receives, which
          // would fight this row's own click-to-activate if the row itself
          // were the trigger (a left click would activate the tab *and*
          // pop the menu). The invisible span only anchors the menu's
          // position; opening it is driven entirely by onContextMenu below.
          <div
            key={tab.path}
            onClick={() => setActive(tab.path)}
            onContextMenu={(e) => {
              e.preventDefault()
              setMenuFor(tab.path)
            }}
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
                  requestClose(tab.path, tab.dirty)
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

            <DropdownMenu.Root open={menuFor === tab.path} onOpenChange={(open) => setMenuFor(open ? tab.path : null)}>
              <DropdownMenu.Trigger asChild>
                <span aria-hidden className="pointer-events-none absolute inset-0" />
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
              <DropdownMenu.Content className={menuContentClass} align="start" sideOffset={4}>
                <DropdownMenu.Item className={menuItemClass} onSelect={() => requestClose(tab.path, tab.dirty)}>
                  <X size={14} /> Close
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className={menuItemClass}
                  disabled={tabs.length <= 1}
                  onSelect={() => closeOthers(tab.path)}
                >
                  <Rows3 size={14} /> Close others
                </DropdownMenu.Item>
                <DropdownMenu.Item className={menuItemClass} onSelect={() => closeAll()}>
                  <XSquare size={14} /> Close all
                </DropdownMenu.Item>
                <div className={menuSeparatorClass} />
                <DropdownMenu.Item
                  className={menuItemClass}
                  disabled={closedStack.length === 0}
                  onSelect={() => reopenLastClosed(fs)}
                >
                  <History size={14} /> Reopen closed tab
                </DropdownMenu.Item>
                <div className={menuSeparatorClass} />
                <DropdownMenu.Item className={menuItemClass} onSelect={() => openSplit(tab.path, 'vertical')}>
                  <PanelRight size={14} /> Split right
                </DropdownMenu.Item>
                <DropdownMenu.Item className={menuItemClass} onSelect={() => openSplit(tab.path, 'horizontal')}>
                  <PanelBottom size={14} /> Split down
                </DropdownMenu.Item>
              </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        )
      })}
    </div>
  )
}
