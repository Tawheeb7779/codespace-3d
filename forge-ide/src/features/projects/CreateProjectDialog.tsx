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
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-graphite-800 bg-graphite-900 p-6 shadow-2xl shadow-black/50 data-[state=closed]:animate-scale-out data-[state=open]:animate-scale-in">
          <div className="mb-5 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-graphite-50">New project</Dialog.Title>
            <Dialog.Close asChild>
              <button
                className="-m-1.5 rounded-lg p-1.5 text-graphite-500 transition-colors hover:bg-graphite-800 hover:text-graphite-200"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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
                className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto scrollbar-thin p-0.5 sm:grid-cols-2"
              >
                {PROJECT_TEMPLATES.map((t) => (
                  <button
                    type="button"
                    key={t.id}
                    role="radio"
                    aria-checked={templateId === t.id}
                    onClick={() => setTemplateId(t.id)}
                    className={clsx(
                      'rounded-lg border p-3 text-left transition-[border-color,background-color,transform] duration-150',
                      'active:scale-[0.99] motion-reduce:active:scale-100',
                      templateId === t.id
                        ? 'border-ember-500 bg-ember-500/[0.06]'
                        : 'border-graphite-800 hover:border-graphite-700 hover:bg-graphite-850/50',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-graphite-100">{t.name}</p>
                      {!t.runnable && <Badge>Edit only</Badge>}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-graphite-500">{t.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <Button type="submit" variant="primary" size="lg" touch loading={loading} className="w-full">
              {loading ? 'Creating…' : 'Create project'}
            </Button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
