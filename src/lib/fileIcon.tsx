import { FileCode2, FileJson, FileText, FileType, Image as ImageIcon } from 'lucide-react'
import { extname } from '@/lib/paths'

const CODE_EXTS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.go', '.rs',
  '.php', '.rb', '.kt', '.swift', '.dart', '.lua', '.r', '.pl', '.sh', '.ps1', '.sql', '.graphql',
])
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'])

export function FileIcon({ path, size = 14 }: { path: string; size?: number }) {
  const ext = extname(path).toLowerCase()
  if (ext === '.json') return <FileJson size={size} className="text-signal-amber" />
  if (IMAGE_EXTS.has(ext)) return <ImageIcon size={size} className="text-signal-violet" />
  if (ext === '.md' || ext === '.mdx') return <FileText size={size} className="text-graphite-400" />
  if (CODE_EXTS.has(ext) || ext === '.html' || ext === '.css') return <FileCode2 size={size} className="text-ember-400" />
  return <FileType size={size} className="text-graphite-500" />
}
