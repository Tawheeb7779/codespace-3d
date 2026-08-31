export type FileKind = 'file' | 'directory'

export interface FileNode {
  path: string // normalized, POSIX-style, relative to project root, no leading slash
  kind: FileKind
  content?: string // present for files; undefined for directories
  createdAt: string
  updatedAt: string
}

export interface ProjectTemplateFile {
  path: string
  content: string
}

export interface ProjectTemplate {
  id: string
  name: string
  description: string
  language: string
  icon: string
  /** Whether `npm run dev` / a dev server can actually execute via WebContainer. */
  runnable: boolean
  files: ProjectTemplateFile[]
}

export type ProjectVisibility = 'private' | 'team' | 'public'

export interface Project {
  id: string
  name: string
  description: string | null
  templateId: string
  ownerId: string
  teamId: string | null
  visibility: ProjectVisibility
  createdAt: string
  updatedAt: string
}
