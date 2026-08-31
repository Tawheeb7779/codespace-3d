import { useMemo, useState } from 'react'
import { Package, Plus, RotateCw, Trash2 } from 'lucide-react'
import { clsx } from 'clsx'
import { useWorkspace } from '@/features/workspace/WorkspaceContext'
import { useEditorStore } from '@/stores/editorStore'
import { WebContainerService } from '@/services/WebContainerService'
import { detectPackageManager, addPackageCommand, removePackageCommand, lockfileFor } from '@/services/RuntimeDetection'
import { ConfigNotice } from '@/components/ConfigNotice'
import { Spinner, EmptyState } from '@/components/ui/misc'
import { toast } from '@/stores/toastStore'

interface ParsedPackageJson {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

/**
 * A real package.json viewer/editor plus install/uninstall/update, run
 * through the same WebContainer the Run/Preview flow uses — not a mock
 * dependency list. Every operation actually runs the detected package
 * manager's real command; package.json (and its lockfile) are read back
 * out of WebContainer's fs afterward and copied into the project's own
 * virtual fs, so Explorer/Editor/Git all see the real change too.
 */
export function PackagesPanel() {
  const { fs } = useWorkspace()
  const [busy, setBusy] = useState<string | null>(null)

  const pkg = useMemo<ParsedPackageJson | 'missing' | 'invalid'>(() => {
    if (!fs.exists('package.json')) return 'missing'
    try {
      return JSON.parse(fs.read('package.json')) as ParsedPackageJson
    } catch {
      return 'invalid'
    }
  }, [fs])

  if (!WebContainerService.isSupported) {
    return (
      <div className="p-3">
        <ConfigNotice>
          Installing, updating, and removing packages runs inside the in-browser runtime (WebContainer), which requires
          this page to be cross-origin isolated. You can still open package.json directly from the Explorer.
        </ConfigNotice>
      </div>
    )
  }

  if (pkg === 'missing') {
    return <EmptyState icon={Package} title="No package.json" description="This project has no package.json yet." />
  }
  if (pkg === 'invalid') {
    return <EmptyState icon={Package} title="package.json is invalid" description="Fix its JSON syntax in the editor, then reopen this panel." />
  }

  async function runManagerCommand(command: string[], successMessage: string) {
    setBusy(command.join(' '))
    try {
      await WebContainerService.mount(fs.toFileSystemTree())
      let output = ''
      const exitCode = await WebContainerService.run(command, (chunk) => {
        output += chunk
      })
      if (exitCode !== 0) {
        toast.error(`${command[0]} ${command[1]} failed`, output.slice(-400) || `Exit code ${exitCode}`)
        return
      }
      // Copy the result back into the project's own fs so Explorer/Editor/Git see it.
      const manager = detectPackageManager(fs)
      const updatedPkg = await WebContainerService.readFile('package.json')
      fs.write('package.json', updatedPkg)
      if (await WebContainerService.fileExists(lockfileFor(manager))) {
        fs.write(lockfileFor(manager), await WebContainerService.readFile(lockfileFor(manager)))
      }
      toast.success(successMessage)
    } catch (err) {
      toast.error('Command failed', err instanceof Error ? err.message : undefined)
    } finally {
      setBusy(null)
    }
  }

  function handleInstall() {
    const name = prompt('Package name (e.g. lodash or lodash@4.17.21)')
    if (!name?.trim()) return
    const dev = confirm('Install as a dev dependency? Cancel installs as a regular dependency.')
    const manager = detectPackageManager(fs)
    void runManagerCommand(addPackageCommand(manager, name.trim(), dev), `Installed ${name.trim()}`)
  }

  function handleUpdate(name: string) {
    const manager = detectPackageManager(fs)
    void runManagerCommand(addPackageCommand(manager, `${name}@latest`, false), `Updated ${name}`)
  }

  function handleRemove(name: string) {
    if (!confirm(`Remove ${name}?`)) return
    const manager = detectPackageManager(fs)
    void runManagerCommand(removePackageCommand(manager, name), `Removed ${name}`)
  }

  const deps = Object.entries(pkg.dependencies ?? {})
  const devDeps = Object.entries(pkg.devDependencies ?? {})

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 py-2.5">
        <span className="type-label text-graphite-600">Packages</span>
        <button
          onClick={handleInstall}
          disabled={busy !== null}
          aria-label="Install package"
          title="Install package"
          className="rounded-md p-1.5 text-graphite-500 transition-colors hover:bg-surface-hover hover:text-graphite-100 disabled:opacity-50"
        >
          <Plus size={14} />
        </button>
      </div>

      {busy && (
        <div className="flex items-center gap-2 border-y border-hairline bg-surface-hover px-3 py-2 text-xs text-graphite-400">
          <Spinner size={12} /> Running <code className="font-mono text-graphite-200">{busy}</code>…
        </div>
      )}

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-1.5 pb-2">
        <button
          onClick={() => useEditorStore.getState().open(fs, 'package.json')}
          className="mb-2 mt-2 flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-graphite-500 hover:bg-surface-hover hover:text-graphite-200"
        >
          <Package size={13} /> Open package.json
        </button>

        {deps.length === 0 && devDeps.length === 0 ? (
          <EmptyState title="No dependencies" description="Install a package to get started." />
        ) : (
          <>
            {deps.length > 0 && <DependencyGroup title="Dependencies" entries={deps} busy={busy !== null} onUpdate={handleUpdate} onRemove={handleRemove} />}
            {devDeps.length > 0 && (
              <DependencyGroup title="Dev dependencies" entries={devDeps} busy={busy !== null} onUpdate={handleUpdate} onRemove={handleRemove} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

function DependencyGroup({
  title,
  entries,
  busy,
  onUpdate,
  onRemove,
}: {
  title: string
  entries: [string, string][]
  busy: boolean
  onUpdate: (name: string) => void
  onRemove: (name: string) => void
}) {
  return (
    <div className="mb-2">
      <p className="px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-graphite-600">{title}</p>
      {entries.map(([name, version]) => (
        <div key={name} className="group flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-[0.8125rem] hover:bg-surface-hover">
          <div className="min-w-0 flex-1">
            <p className="truncate text-graphite-200">{name}</p>
            <p className="truncate text-[0.6875rem] text-graphite-600">{version}</p>
          </div>
          <div className={clsx('flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100', busy && 'pointer-events-none opacity-40')}>
            <button
              onClick={() => onUpdate(name)}
              aria-label={`Update ${name}`}
              title="Update to latest"
              className="rounded-md p-1 text-graphite-500 hover:bg-surface-overlay hover:text-graphite-100"
            >
              <RotateCw size={12} />
            </button>
            <button
              onClick={() => onRemove(name)}
              aria-label={`Remove ${name}`}
              title="Remove"
              className="rounded-md p-1 text-graphite-500 hover:bg-signal-red/12 hover:text-signal-red"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
