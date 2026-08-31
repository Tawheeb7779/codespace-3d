import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FieldError, Label } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/misc'
import type { Project } from '@/types/project'
import type { Team } from '@/types/team'

/**
 * Attach/change/remove a project's team. Only ever rendered for the
 * project owner — DashboardPage/ProjectCard don't show the trigger to
 * anyone else — but the actual authorization is the server's: migration
 * 0005's `projects_guard_sharing` trigger rejects a non-owner's update
 * regardless of what the client shows, so this dialog never has to assume
 * success before the request resolves.
 */
export function ShareProjectDialog({
  open,
  onOpenChange,
  project,
  teams,
  onAttach,
  onDetach,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project
  /** Teams the current user belongs to — the only ones they're allowed to share into. */
  teams: Team[]
  onAttach: (teamId: string) => Promise<void>
  onDetach: () => Promise<void>
}) {
  const currentTeam = teams.find((t) => t.id === project.teamId)
  const [selected, setSelected] = useState(currentTeam?.id ?? teams[0]?.id ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      onOpenChange(false)
    } catch (err) {
      // Surfaced from the backend (RLS/trigger rejection or a network
      // error) — the dialog stays open and shows exactly what failed,
      // rather than closing as if the change had gone through.
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/65 backdrop-blur-[3px] data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
        <Dialog.Content className="surface-overlay fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-modal p-6 data-[state=closed]:animate-scale-out data-[state=open]:animate-scale-in">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="type-title text-graphite-50">Team access</Dialog.Title>
              <Dialog.Description className="type-secondary mt-1 text-graphite-500">
                Share “{project.name}” with a team you belong to.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                className="-m-1.5 shrink-0 rounded-lg p-1.5 text-graphite-500 transition-colors duration-150 hover:bg-surface-hover hover:text-graphite-100"
                aria-label="Close dialog"
                disabled={busy}
              >
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          {project.teamId && (
            <div className="mb-5 flex items-center justify-between rounded-control border border-hairline bg-surface-raised px-3.5 py-2.5">
              <div>
                <p className="text-[0.6875rem] font-medium uppercase tracking-wide text-graphite-600">Current team</p>
                <p className="mt-0.5 text-sm text-graphite-100">
                  {currentTeam?.name ?? "Shared with a team you're no longer a member of"}
                </p>
              </div>
              <Button variant="outline" size="sm" loading={busy} onClick={() => run(onDetach)}>
                Remove
              </Button>
            </div>
          )}

          {teams.length === 0 ? (
            <EmptyState title="No teams yet" description="Create a team from the Teams page first." />
          ) : (
            <div>
              <Label htmlFor="team-select">{currentTeam ? 'Change team' : 'Share with'}</Label>
              <div className="flex gap-2">
                <select
                  id="team-select"
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  className="h-10 w-full rounded-control border border-hairline bg-surface-sunken px-3 text-sm text-graphite-200 shadow-[inset_0_1px_2px_rgb(0_0_0/0.25)] outline-none transition-colors hover:border-hairline-strong focus:border-ember-500/70 focus:ring-[3.5px] focus:ring-ember-500/20"
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <Button
                  variant="primary"
                  loading={busy}
                  disabled={!selected || selected === currentTeam?.id}
                  onClick={() => run(() => onAttach(selected))}
                >
                  {currentTeam ? 'Move' : 'Share'}
                </Button>
              </div>
            </div>
          )}

          {error && <FieldError>{error}</FieldError>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
