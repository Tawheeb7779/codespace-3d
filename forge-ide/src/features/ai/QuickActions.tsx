import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Bug, FileText, Gauge, Shield, Sparkles, TestTube2, Wand2, Zap } from 'lucide-react'
import { useEditorStore } from '@/stores/editorStore'
import { useWorkspaceUiStore } from '@/stores/workspaceUiStore'
import { Button } from '@/components/ui/Button'

const ACTIONS = [
  { id: 'explain', label: 'Explain', icon: FileText, prompt: (path: string) => `Explain what the code in ${path} does.` },
  { id: 'fix', label: 'Fix', icon: Bug, prompt: (path: string) => `Find and fix any bugs in ${path}. Run the project afterward to verify.` },
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

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="ghost" size="sm" disabled={!activePath}>
          <Zap size={14} /> AI Actions
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" className="z-40 min-w-48 rounded-lg border border-graphite-800 bg-graphite-850 p-1 shadow-xl">
          {ACTIONS.map((action) => (
            <DropdownMenu.Item
              key={action.id}
              onSelect={() => activePath && requestAiAction(action.prompt(activePath))}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-graphite-200 outline-none hover:bg-graphite-800"
            >
              <action.icon size={14} /> {action.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
