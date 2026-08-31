import { extname, basename } from '@/lib/paths'

/**
 * Maps a file to a Monaco language id. Covers every language Monaco ships
 * a grammar for out of the box (spec §12); a handful of listed languages
 * (TOML, Makefile) don't have a built-in Monaco grammar, so they fall back
 * to plaintext rather than fake syntax highlighting.
 */
const EXTENSION_MAP: Record<string, string> = {
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.sass': 'scss',
  '.less': 'less',
  '.js': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.mts': 'typescript',
  '.tsx': 'typescript',
  '.json': 'json',
  '.jsonc': 'json',
  '.xml': 'xml',
  '.svg': 'xml',
  '.md': 'markdown',
  '.mdx': 'markdown',
  '.py': 'python',
  '.java': 'java',
  '.c': 'c',
  '.h': 'c',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.hpp': 'cpp',
  '.cs': 'csharp',
  '.go': 'go',
  '.rs': 'rust',
  '.php': 'php',
  '.rb': 'ruby',
  '.kt': 'kotlin',
  '.kts': 'kotlin',
  '.swift': 'swift',
  '.dart': 'dart',
  '.lua': 'lua',
  '.r': 'r',
  '.pl': 'perl',
  '.sh': 'shell',
  '.bash': 'shell',
  '.zsh': 'shell',
  '.ps1': 'powershell',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.sql': 'sql',
  '.graphql': 'graphql',
  '.gql': 'graphql',
  '.toml': 'plaintext',
  '.ini': 'ini',
  '.dockerfile': 'dockerfile',
  '.txt': 'plaintext',
}

const FILENAME_MAP: Record<string, string> = {
  Dockerfile: 'dockerfile',
  Makefile: 'plaintext',
  'package.json': 'json',
  '.gitignore': 'plaintext',
  '.env': 'plaintext',
}

export function languageForPath(path: string): string {
  const name = basename(path)
  if (FILENAME_MAP[name]) return FILENAME_MAP[name]
  const ext = extname(path).toLowerCase()
  return EXTENSION_MAP[ext] ?? 'plaintext'
}
