/**
 * Single source of truth for every keyboard shortcut in the app, so the
 * reference page (KeyboardShortcutsPage) can never drift into documenting
 * bindings that don't exist. Anything registered in useGlobalShortcuts.ts
 * or MonacoEditor.tsx's own addCommand should have an entry here too.
 */
export interface ShortcutEntry {
  keys: string[]
  description: string
}

export interface ShortcutGroup {
  category: string
  items: ShortcutEntry[]
}

const MOD = navigator.platform.toLowerCase().includes('mac') ? '⌘' : 'Ctrl'

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    category: 'Navigate',
    items: [
      { keys: [MOD, 'K'], description: 'Open the command palette' },
      { keys: [MOD, 'P'], description: 'Quick open a file (same palette)' },
      { keys: [MOD, 'Shift', 'P'], description: 'Open the command palette' },
      { keys: [MOD, 'Shift', 'F'], description: 'Search across the project' },
    ],
  },
  {
    category: 'Layout',
    items: [
      { keys: [MOD, 'B'], description: 'Toggle the sidebar' },
      { keys: [MOD, '`'], description: 'Toggle the terminal' },
    ],
  },
  {
    category: 'Editor',
    items: [
      { keys: [MOD, 'S'], description: 'Save the active file' },
      { keys: ['Esc'], description: 'Close the command palette or an open dialog' },
    ],
  },
]
