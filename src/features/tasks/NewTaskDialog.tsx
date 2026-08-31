import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { clsx } from 'clsx'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Label, Textarea } from '@/components/ui/Input'
import type { CreateTaskInput, TaskPriority } from '@/types/task'

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high']

export function NewTaskDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (input: CreateTaskInput) => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [assignee, setAssignee] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [loading, setLoading] = useState(false)

  function reset() {
    setTitle('')
    setDescription('')
    setPriority('medium')
    setAssignee('')
    setDueDate('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    try {
      await onCreate({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        assignee: assignee.trim() || undefined,
        dueDate: dueDate || undefined,
      })
      reset()
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/65 backdrop-blur-[3px] data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
        <Dialog.Content className="surface-overlay fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-modal p-6 data-[state=closed]:animate-scale-out data-[state=open]:animate-scale-in sm:p-7">
          <div className="mb-6 flex items-start justify-between gap-4">
            <Dialog.Title className="type-title text-graphite-50">New task</Dialog.Title>
            <Dialog.Close asChild>
              <button className="-m-1.5 shrink-0 rounded-lg p-1.5 text-graphite-500 transition-colors duration-150 hover:bg-surface-hover hover:text-graphite-100" aria-label="Close dialog">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="task-title">Title</Label>
              <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Fix the login redirect bug" autoFocus />
            </div>

            <div>
              <Label htmlFor="task-description">Description</Label>
              <Textarea id="task-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Optional details…" />
            </div>

            <div>
              <Label>Priority</Label>
              <div role="radiogroup" aria-label="Priority" className="flex gap-2">
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={priority === p}
                    onClick={() => setPriority(p)}
                    className={clsx(
                      'flex-1 rounded-control border px-3 py-2 text-sm font-medium capitalize transition-colors duration-150',
                      priority === p
                        ? 'border-ember-500/60 bg-ember-500/[0.08] text-graphite-50'
                        : 'border-hairline text-graphite-400 hover:border-hairline-strong hover:bg-surface-hover',
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="task-assignee">Assignee</Label>
                <Input id="task-assignee" value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="Optional" />
              </div>
              <div>
                <Label htmlFor="task-due">Due date</Label>
                <Input id="task-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>

            <Button type="submit" variant="primary" size="lg" loading={loading} disabled={!title.trim()} className="w-full">
              {loading ? 'Creating…' : 'Create task'}
            </Button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
