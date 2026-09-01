import { useCallback, useRef, useState } from 'react'
import { clsx } from 'clsx'
import { X } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useEditorStore } from '@/stores/editorStore'
import { MonacoEditor } from '@/features/editor/MonacoEditor'
import { basename } from '@/lib/paths'
import { FileIcon } from '@/lib/fileIcon'

/**
 * Renders the primary editor alone, or — when a split is active — the
 * primary and split panes side by side (vertical) or stacked (horizontal)
 * with a draggable divider between them. Both panes draw from the same
 * shared `tabs` list (see editorStore's `split` doc comment): this is
 * "view two of your open files at once," not two independent editor
 * groups with their own tab sets.
 */
export function SplitEditor() {
  const { split, tabs, setSplitPath, closeSplit } = useEditorStore(
    useShallow((s) => ({ split: s.split, tabs: s.tabs, setSplitPath: s.setSplitPath, closeSplit: s.closeSplit })),
  )
  const [ratio, setRatio] = useState(0.5)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const onPointerDown = useCallback(() => {
    dragging.current = true
    const onMove = (e: PointerEvent) => {
      if (!dragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const next =
        split?.direction === 'horizontal'
          ? (e.clientY - rect.top) / rect.height
          : (e.clientX - rect.left) / rect.width
      setRatio(Math.min(0.8, Math.max(0.2, next)))
    }
    const onUp = () => {
      dragging.current = false
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [split?.direction])

  if (!split) return <MonacoEditor />

  const stacked = split.direction === 'horizontal'
  const primaryStyle = stacked ? { height: `${ratio * 100}%` } : { width: `${ratio * 100}%` }
  const splitStyle = stacked ? { height: `${(1 - ratio) * 100}%` } : { width: `${(1 - ratio) * 100}%` }

  return (
    <div ref={containerRef} className={clsx('flex h-full min-h-0 min-w-0', stacked ? 'flex-col' : 'flex-row')}>
      <div className="min-h-0 min-w-0 overflow-hidden" style={primaryStyle}>
        <MonacoEditor />
      </div>

      <div
        role="separator"
        aria-orientation={stacked ? 'horizontal' : 'vertical'}
        aria-label="Resize split"
        onPointerDown={onPointerDown}
        className={clsx(
          'shrink-0 bg-hairline transition-colors hover:bg-ember-500/40',
          stacked ? 'h-1 w-full cursor-row-resize' : 'h-full w-1 cursor-col-resize',
        )}
      />

      <div className="flex min-h-0 min-w-0 flex-col" style={splitStyle}>
        <div className="flex items-center justify-between gap-2 border-b border-hairline bg-surface-raised px-2 py-1">
          <select
            value={split.path}
            onChange={(e) => setSplitPath(e.target.value)}
            aria-label="File shown in split pane"
            className="min-w-0 flex-1 truncate rounded-md bg-transparent px-1.5 py-1 text-xs text-graphite-300 outline-none hover:bg-surface-hover"
          >
            {tabs.map((t) => (
              <option key={t.path} value={t.path}>
                {basename(t.path)}
              </option>
            ))}
          </select>
          <FileIcon path={split.path} size={13} />
          <button
            onClick={closeSplit}
            aria-label="Close split"
            title="Close split"
            className="shrink-0 rounded-md p-1 text-graphite-500 transition-colors hover:bg-surface-hover hover:text-graphite-100"
          >
            <X size={13} />
          </button>
        </div>
        <div className="min-h-0 flex-1">
          <MonacoEditor path={split.path} />
        </div>
      </div>
    </div>
  )
}
