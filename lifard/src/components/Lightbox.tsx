import { useCallback, useEffect, useRef } from 'react'
import type { Project } from '@/content/work'
import { Figure } from '@/components/Figure'
import { useEscape, useScrollLock } from '@/lib/motion'

interface LightboxProps {
  projects: Project[]
  /** Index into `projects`, or null when closed. */
  index: number | null
  onClose: () => void
  onNavigate: (index: number) => void
}

/**
 * A plate, opened full size, with its case note.
 *
 * Built on <dialog> so the browser handles the top layer and inert
 * background; arrow keys move through the set the way you would flip through
 * drawings on a table.
 */
export function Lightbox({ projects, index, onClose, onNavigate }: LightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const open = index !== null
  const project = index !== null ? projects[index] : undefined

  useScrollLock(open)
  useEscape(open, onClose)

  const go = useCallback(
    (delta: number) => {
      if (index === null) return
      onNavigate((index + delta + projects.length) % projects.length)
    },
    [index, onNavigate, projects.length],
  )

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      closeRef.current?.focus()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') go(1)
      if (event.key === 'ArrowLeft') go(-1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, go])

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        // Clicking the backdrop — i.e. the dialog element itself — closes.
        if (e.target === dialogRef.current) onClose()
      }}
      aria-label={project ? `${project.name} — plate ${project.plate}` : 'Project'}
      className="m-0 h-full max-h-none w-full max-w-none bg-[color:var(--color-nocturne)]/97 p-0 text-[color:var(--color-vellum-strong)] backdrop:bg-[color:var(--color-nocturne)]/80"
    >
      {project ? (
        <div className="flex h-full flex-col">
          <div className="u-gutter flex items-center justify-between border-b border-[color:var(--color-rule-light)] py-5">
            <p className="annotation text-[color:var(--color-brass-text)]">
              {project.plate} — {project.category}
            </p>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="annotation flex items-center gap-3 py-2 opacity-70 transition-opacity hover:opacity-100"
            >
              Close
              <svg aria-hidden viewBox="0 0 14 14" width="14" height="14" stroke="currentColor" fill="none">
                <path d="M1 1l12 12M13 1L1 13" />
              </svg>
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            <div className="relative min-h-0 flex-1">
              <Figure
                motif={project.motif}
                photo={project.photo}
                title={`${project.name} — ${project.category.toLowerCase()} drawing`}
                lit
                className="absolute inset-0 h-full w-full"
              />
            </div>

            <aside className="u-gutter flex shrink-0 flex-col justify-center gap-6 border-t border-[color:var(--color-rule-light)] py-10 lg:w-[26rem] lg:border-t-0 lg:border-l">
              <h2 className="text-[clamp(1.9rem,4vw,2.9rem)]">{project.name}</h2>
              <dl className="annotation-sm grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 opacity-65">
                <dt>Location</dt>
                <dd>{project.location}</dd>
                <dt>Year</dt>
                <dd>{project.year}</dd>
                <dt>Scope</dt>
                <dd>{project.scope}</dd>
              </dl>
              <p className="text-[0.95rem] leading-[1.75] opacity-75">{project.note}</p>

              <div className="mt-2 flex items-center gap-6 border-t border-[color:var(--color-rule-light)] pt-6">
                <button
                  type="button"
                  onClick={() => go(-1)}
                  className="annotation-sm opacity-65 transition-opacity hover:opacity-100"
                >
                  ← Previous
                </button>
                <span className="annotation-sm opacity-65">
                  {String((index ?? 0) + 1).padStart(2, '0')} / {String(projects.length).padStart(2, '0')}
                </span>
                <button
                  type="button"
                  onClick={() => go(1)}
                  className="annotation-sm opacity-65 transition-opacity hover:opacity-100"
                >
                  Next →
                </button>
              </div>
            </aside>
          </div>
        </div>
      ) : null}
    </dialog>
  )
}
