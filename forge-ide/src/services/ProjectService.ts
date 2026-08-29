import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import { idbGet, idbSet } from '@/lib/idbStore'
import { FileSystemService } from '@/services/FileSystemService'
import { getTemplate } from '@/features/projects/templates'
import type { Project, ProjectVisibility } from '@/types/project'

const LOCAL_INDEX_KEY = 'local-projects-index'

export interface CreateProjectInput {
  name: string
  description?: string
  templateId: string
  teamId?: string | null
  visibility?: ProjectVisibility
}

function randomId(): string {
  return crypto.randomUUID()
}

async function readLocalIndex(): Promise<Project[]> {
  return (await idbGet<Project[]>('settings', LOCAL_INDEX_KEY)) ?? []
}

async function writeLocalIndex(projects: Project[]): Promise<void> {
  await idbSet('settings', LOCAL_INDEX_KEY, projects)
}

/**
 * Cloud-backed when Supabase is configured; otherwise a genuine local-only
 * implementation backed by IndexedDB (no cloud sync, no teams/collab —
 * clearly surfaced in the UI as "Local mode"). Never returns fake/demo data.
 */
export const ProjectService = {
  isCloud: isSupabaseConfigured,

  async list(userId: string | null): Promise<Project[]> {
    if (supabase && userId) {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false })
      if (error) throw error
      return data.map(mapRow)
    }
    return readLocalIndex()
  },

  async get(id: string): Promise<Project | null> {
    if (supabase) {
      const { data, error } = await supabase.from('projects').select('*').eq('id', id).maybeSingle()
      if (error) throw error
      return data ? mapRow(data) : null
    }
    const projects = await readLocalIndex()
    return projects.find((p) => p.id === id) ?? null
  },

  async create(input: CreateProjectInput, ownerId: string | null): Promise<Project> {
    const template = getTemplate(input.templateId)
    if (!template) throw new Error(`Unknown template "${input.templateId}"`)

    if (supabase && ownerId) {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: input.name,
          description: input.description ?? null,
          template_id: input.templateId,
          owner_id: ownerId,
          team_id: input.teamId ?? null,
          visibility: input.visibility ?? 'private',
        })
        .select('*')
        .single()
      if (error) throw error
      const project = mapRow(data)
      const files = template.files.map((f) => ({ path: f.path, content: f.content }))
      const { error: filesError } = await supabase.from('project_files').insert(
        files.map((f) => ({ project_id: project.id, path: f.path, kind: 'file', content: f.content })),
      )
      if (filesError) throw filesError
      return project
    }

    const now = new Date().toISOString()
    const project: Project = {
      id: randomId(),
      name: input.name,
      description: input.description ?? null,
      templateId: input.templateId,
      ownerId: ownerId ?? 'local',
      teamId: null,
      visibility: 'private',
      createdAt: now,
      updatedAt: now,
    }
    const projects = await readLocalIndex()
    projects.unshift(project)
    await writeLocalIndex(projects)

    const fs = new FileSystemService(project.id)
    await fs.seed(template.files)
    return project
  },

  async rename(id: string, name: string): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from('projects').update({ name }).eq('id', id)
      if (error) throw error
      return
    }
    const projects = await readLocalIndex()
    const project = projects.find((p) => p.id === id)
    if (project) {
      project.name = name
      project.updatedAt = new Date().toISOString()
      await writeLocalIndex(projects)
    }
  },

  async duplicate(id: string): Promise<Project> {
    const source = await this.get(id)
    if (!source) throw new Error('Project not found')
    const created = await this.create(
      { name: `${source.name} (copy)`, description: source.description ?? undefined, templateId: source.templateId },
      source.ownerId === 'local' ? null : source.ownerId,
    )
    const sourceFs = await FileSystemService.load(id)
    const targetFs = await FileSystemService.load(created.id)
    await targetFs.seed(sourceFs.list().filter((n) => n.kind === 'file').map((n) => ({ path: n.path, content: n.content ?? '' })))
    return created
  },

  async delete(id: string): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from('projects').delete().eq('id', id)
      if (error) throw error
      return
    }
    const projects = await readLocalIndex()
    await writeLocalIndex(projects.filter((p) => p.id !== id))
  },
}

interface ProjectRow {
  id: string
  name: string
  description: string | null
  template_id: string
  owner_id: string
  team_id: string | null
  visibility: ProjectVisibility
  created_at: string
  updated_at: string
}

function mapRow(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    templateId: row.template_id,
    ownerId: row.owner_id,
    teamId: row.team_id,
    visibility: row.visibility,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
