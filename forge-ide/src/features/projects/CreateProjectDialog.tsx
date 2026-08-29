import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { clsx } from 'clsx'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { PROJECT_TEMPLATES } from '@/features/projects/templates'
import { Badge } from '@/components/ui/misc'

export function CreateProjectDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (input: { name: string; templateId: string }) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [templateId, setTemplateId] = useState(PROJECT_TEMPLATES[0].id)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await onCreate({ name: name.trim() || 'Untitled Project', templateId })
      setName('')
      setTemplateId(PROJECT_TEMPLATES[0].id)
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/65 backdrop-blur-[3px] data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
        <Dialog.Content className="surface-overlay fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-modal p-6 data-[state=closed]:animate-scale-out data-[state=open]:animate-scale-in sm:p-7">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="type-title text-graphite-50">New project</Dialog.Title>
              <Dialog.Description className="type-secondary mt-1 text-graphite-500">
                Pick a template — it opens straight in the editor.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                className="-m-1.5 shrink-0 rounded-lg p-1.5 text-graphite-500 transition-colors duration-150 hover:bg-surface-hover hover:text-graphite-100"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="project-name">Project name</Label>
              <Input id="project-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="My awesome project" autoFocus />
            </div>

            <div>
              <Label>Template</Label>
              {/* A single-select list: exposed as a radiogroup so screen
                  readers and arrow-key navigation treat it as one choice
                  rather than a dozen unrelated buttons. */}
              <div
                role="radiogroup"
                aria-label="Project template"
                className="grid max-h-[17rem] grid-cols-1 gap-2 overflow-y-auto scrollbar-thin p-0.5 sm:grid-cols-2"
              >
                {PROJECT_TEMPLATES.map((t) => (
                  <button
                    type="button"
                    key={t.id}
                    role="radio"
                    aria-checked={templateId === t.id}
                    onClick={() => setTemplateId(t.id)}
                    className={clsx(
                      'rounded-control border p-3.5 text-left',
                      'transition-[border-color,background-color,box-shadow,transform] duration-150 ease-out',
                      'active:scale-[0.99] motion-reduce:active:scale-100',
                      templateId === t.id
                        ? 'border-ember-500/60 bg-ember-500/[0.08] shadow-[inset_0_1px_0_0_rgb(255_255_255/0.05),0_0_0_1px_var(--color-ember-500)]'
                        : 'border-hairline bg-surface-raised hover:border-hairline-strong hover:bg-surface-hover',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[0.875rem] font-medium tracking-[-0.008em] text-graphite-100">{t.name}</p>
                      {!t.runnable && <Badge>Edit only</Badge>}
                    </div>
                    <p className="mt-1 text-[0.75rem] leading-relaxed text-graphite-500">{t.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <Button type="submit" variant="primary" size="xl" loading={loading} className="w-full">
              {loading ? 'Creating…' : 'Create project'}
            </Button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
