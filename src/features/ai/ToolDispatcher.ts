import type { FileSystemService } from '@/services/FileSystemService'
import { detectFramework, detectPackageManager, runScriptCommand } from '@/services/RuntimeDetection'
import { WebContainerService } from '@/services/WebContainerService'
import { syncFileToRunningContainer } from '@/services/syncFileToRuntime'
import { useRuntimeStore } from '@/stores/runtimeStore'
import { useTerminalStore } from '@/stores/terminalStore'
import { ChangeTracker } from '@/features/ai/ChangeTracker'
import { InvalidPathError } from '@/lib/paths'

const MAX_RESULT_CHARS = 8000

function truncate(text: string): string {
  return text.length > MAX_RESULT_CHARS ? `${text.slice(0, MAX_RESULT_CHARS)}\n…(truncated)` : text
}

export interface ToolContext {
  fs: FileSystemService
  changeTracker: ChangeTracker
}

async function runToCompletion(command: string[]): Promise<{ exitCode: number; output: string }> {
  let output = ''
  const exitCode = await WebContainerService.run(command, (chunk) => {
    output += chunk
  })
  return { exitCode, output: truncate(output) }
}

/**
 * Executes one agent tool call against the real project state. Every tool
 * either reads real data or performs a real mutation through
 * FileSystemService / WebContainerService — nothing here fabricates a
 * result (spec §24, §62).
 */
export async function executeTool(name: string, args: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const { fs, changeTracker } = ctx

  try {
    switch (name) {
      case 'list_files':
        return fs.list().map((n) => (n.kind === 'directory' ? `${n.path}/` : n.path)).join('\n') || '(empty project)'

      case 'read_file': {
        const path = String(args.path)
        return fs.read(path)
      }

      case 'search_project': {
        const query = String(args.query)
        const isRegex = Boolean(args.regex)
        const matcher = isRegex ? new RegExp(query, 'i') : null
        const results: string[] = []
        for (const node of fs.list()) {
          if (node.kind !== 'file' || !node.content) continue
          const lines = node.content.split('\n')
          lines.forEach((line, i) => {
            const hit = matcher ? matcher.test(line) : line.toLowerCase().includes(query.toLowerCase())
            if (hit) results.push(`${node.path}:${i + 1}: ${line.trim().slice(0, 200)}`)
          })
        }
        return truncate(results.slice(0, 200).join('\n') || 'No matches found.')
      }

      case 'create_file': {
        const path = String(args.path)
        const content = String(args.content ?? '')
        if (fs.exists(path)) return `Error: "${path}" already exists. Use edit_file to modify it.`
        changeTracker.recordWrite(fs, path)
        fs.write(path, content)
        syncFileToRunningContainer(path, content)
        return `Created ${path}`
      }

      case 'edit_file': {
        const path = String(args.path)
        const content = String(args.content ?? '')
        if (!fs.exists(path)) return `Error: "${path}" does not exist. Use create_file to create it.`
        changeTracker.recordWrite(fs, path)
        fs.write(path, content)
        syncFileToRunningContainer(path, content)
        return `Updated ${path}`
      }

      case 'delete_file': {
        const path = String(args.path)
        changeTracker.recordDelete(fs, path)
        fs.delete(path)
        return `Deleted ${path}`
      }

      case 'rename_file': {
        const from = String(args.from)
        const to = String(args.to)
        changeTracker.recordRename(fs, from, to)
        fs.rename(from, to)
        return `Renamed ${from} -> ${to}`
      }

      case 'read_package_json': {
        if (!fs.exists('package.json')) return 'No package.json in this project.'
        return fs.read('package.json')
      }

      case 'install_dependencies': {
        if (!fs.exists('package.json')) return 'No package.json — nothing to install.'
        const manager = detectPackageManager(fs)
        const { exitCode, output } = await runToCompletion([manager, 'install'])
        return `exit code: ${exitCode}\n${output}`
      }

      case 'run_project': {
        await useRuntimeStore.getState().run(fs)
        const { status, errorMessage, previewUrl } = useRuntimeStore.getState()
        return `status: ${status}${previewUrl ? `\npreview: ${previewUrl}` : ''}${errorMessage ? `\nerror: ${errorMessage}` : ''}`
      }

      case 'stop_project': {
        await useRuntimeStore.getState().stop()
        return 'Project stopped.'
      }

      case 'run_script': {
        const script = String(args.script)
        const manager = detectPackageManager(fs)
        const { exitCode, output } = await runToCompletion(runScriptCommand(manager, script))
        return `exit code: ${exitCode}\n${output}`
      }

      case 'run_build': {
        const framework = detectFramework(fs)
        const manager = detectPackageManager(fs)
        const { exitCode, output } = await runToCompletion(runScriptCommand(manager, 'build'))
        return `framework: ${framework?.name ?? 'unknown'}\nexit code: ${exitCode}\n${output}`
      }

      case 'read_runtime_errors': {
        const logs = useRuntimeStore.getState().logs
        const relevant = logs.slice(-100)
        return truncate(relevant.map((l) => l.text).join('') || 'No runtime output yet.')
      }

      case 'read_terminal_output':
        return truncate(useTerminalStore.getState().read() || 'No terminal output yet.')

      default:
        return `Error: unknown tool "${name}"`
    }
  } catch (err) {
    if (err instanceof InvalidPathError) return `Error: ${err.message}`
    return `Error: ${err instanceof Error ? err.message : 'unknown error'}`
  }
}
