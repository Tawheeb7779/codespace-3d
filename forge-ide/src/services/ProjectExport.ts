import JSZip from 'jszip'
import { FileSystemService } from '@/services/FileSystemService'
import { InvalidPathError, normalizeProjectPath } from '@/lib/paths'
import type { Project } from '@/types/project'

export async function exportProjectAsZip(project: Project): Promise<Blob> {
  const fs = await FileSystemService.load(project.id)
  const zip = new JSZip()
  for (const node of fs.list()) {
    if (node.kind === 'file') {
      zip.file(node.path, node.content ?? '')
    }
  }
  return zip.generateAsync({ type: 'blob' })
}

export interface ImportResult {
  imported: number
  skipped: Array<{ path: string; reason: string }>
}

/**
 * Imports a ZIP into a fresh project's file system. Every entry path is
 * normalized through the same guard used everywhere else in the VFS, so a
 * malicious archive with `../../etc/passwd`-style entries can't escape the
 * project (ZIP path traversal — spec §36).
 */
export async function importZipIntoProject(file: File | Blob, targetProjectId: string): Promise<ImportResult> {
  const zip = await JSZip.loadAsync(file)
  const fs = new FileSystemService(targetProjectId)
  const files: Array<{ path: string; content: string }> = []
  const skipped: ImportResult['skipped'] = []

  const entries = Object.values(zip.files)
  for (const entry of entries) {
    if (entry.dir) continue
    try {
      const normalized = normalizeProjectPath(entry.name)
      const content = await entry.async('string')
      files.push({ path: normalized, content })
    } catch (err) {
      skipped.push({ path: entry.name, reason: err instanceof InvalidPathError ? err.message : 'unreadable entry' })
    }
  }

  await fs.seed(files)
  return { imported: files.length, skipped }
}
