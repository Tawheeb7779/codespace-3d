import { Atom, Code2, File, FileCode2, Globe, Server } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * Templates already carry an `icon` slug (see templates.ts) that nothing
 * rendered — this is the missing other half, kept separate so the data file
 * stays framework-agnostic (no JSX) while the UI gets a real icon per
 * template instead of every card looking identical.
 */
const TEMPLATE_ICONS: Record<string, LucideIcon> = {
  file: File,
  globe: Globe,
  react: Atom,
  code: Code2,
  server: Server,
  python: FileCode2,
}

export function templateIcon(slug: string): LucideIcon {
  return TEMPLATE_ICONS[slug] ?? File
}
