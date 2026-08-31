import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Bug, FileText, Gauge, Search, Shield, Sparkles, TestTube2, Wand2, Zap } from 'lucide-react'
import { useEditorStore } from '@/stores/editorStore'
import { useWorkspaceUiStore } from '@/stores/workspaceUiStore'
import { useDiagnosticsStore } from '@/stores/diagnosticsStore'
import { useWorkspace } from '@/features/workspace/WorkspaceContext'
import { Button } from '@/components/ui/Button'
import { menuContentClass, menuItemClass } from '@/components/ui/menu'

const ACTIONS = [
  { id: 'explain', label: 'Explain', icon: FileText, prompt: (path: string) => `Explain what the code in ${path} does.` },
  { id: 'fix', label: 'Fix', icon: Bug, prompt: (path: string) => `Find and fix any bugs in ${path}. Run the project afterward to verify.` },
  {
    id: 'debug',
    label: 'Debug',
    icon: Search,
    prompt: (path: string) => `${path} isn't behaving as expected. Investigate: read recent runtime/terminal output and this file's diagnostics, find the root cause, and explain it before fixing anything.`,
  },
  { id: 'refactor', label: 'Refactor', icon: Wand2, prompt: (path: string) => `Refactor ${path} for clarity and maintainability without changing its behavior.` },
  { id: 'generate', label: 'Generate', icon: Sparkles, prompt: (path: string) => `Look at ${path} and suggest/implement what's missing to complete it.` },
  { id: 'tests', label: 'Tests', icon: TestTube2, prompt: (path: string) => `Write tests for ${path}.` },
  { id: 'docs', label: 'Documentation', icon: FileText, prompt: (path: string) => `Add concise documentation/comments to ${path} where genuinely helpful.` },
  { id: 'optimize', label: 'Optimize', icon: Gauge, prompt: (path: string) => `Review ${path} for performance issues and optimize it.` },
  { id: 'security', label: 'Security', icon: Shield, prompt: (path: string) => `Review ${path} for common security issues (OWASP-style) and fix anything you find.` },
]

export function QuickActions() {
  const activePath = useEditorStore((s) => s.activePath)
  const requestAiAction = useWorkspaceUiStore((s) => s.requestAiAction)
  const { fs } = useWorkspace()
  const diagnosticsByPath = useDiagnosticsStore((s) => s.byPath)

  function trigger(buildPrompt: (path: string) => string) {
    if (!activePath) return
    const instruction = buildPrompt(activePath)
    // Attach the file the action is already scoped to (and any known
    // diagnostics for it) directly in the prompt, rather than making the
    // agent spend its first turn calling read_file for something the UI
    // already has open — one fewer model round trip per action, and it's
    // exactly the "current file + diagnostics" context the AI is meant to
    // work from without re-sending the whole project.
    const content = fs.exists(activePath) ? fs.read(activePath) : null
    const diagnostics = diagnosticsByPath[activePath] ?? []
    const parts = [instruction]
    if (content !== null) parts.push(`--- ${activePath} ---\n${content}`)
    if (diagnostics.length > 0) {
      parts.push(`Known diagnostics in this file:\n${diagnostics.map((d) => `- line ${d.line}: [${d.severity}] ${d.message}`).join('\n')}`)
    }
    requestAiAction(parts.join('\n\n'))
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        {/* Text label hidden below sm: on a narrow phone topbar this button
            sits next to the project title, Run, and status badge with no
            room to spare — without this it forced the (ellipsis-eligible)
            title down to 1-2 characters to make room, since it's the only
            neighbor allowed to shrink. Icon-only still opens the same menu. */}
        <Button variant="ghost" size="sm" disabled={!activePath} aria-label="AI Actions">
          <Zap size={14} /> <span className="hidden sm:inline">AI Actions</span>
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className={menuContentClass}>
          {ACTIONS.map((action) => (
            <DropdownMenu.Item key={action.id} onSelect={() => trigger(action.prompt)} className={menuItemClass}>
              <action.icon size={14} /> {action.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
