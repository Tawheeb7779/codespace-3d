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
      if (filesError) {
        // These are two separate statements, not a transaction — if the
        // second fails, don't leave a permanent, empty, unrecoverable
        // project behind for the user to find on their next dashboard
        // load. Best-effort: if the cleanup delete itself fails, the
        // original error is still what the caller sees.
        await supabase.from('projects').delete().eq('id', project.id)
        throw filesError
      }
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
    const sourceFiles = sourceFs.list().filter((n) => n.kind === 'file').map((n) => ({ path: n.path, content: n.content ?? '' }))

    const targetFs = await FileSystemService.load(created.id)
    await targetFs.seed(sourceFiles)

    if (supabase && created.ownerId !== 'local') {
      // create() seeded this new cloud project's `project_files` from the
      // *template* (it has no way to know this create() call is really a
      // duplicate) — replace those rows with the actual source content so
      // Supabase itself reflects the duplicate, not just this browser's
      // local cache. Without this, the source's real edits never reach
      // the cloud copy: another device (or this one after IndexedDB is
      // cleared) would see the bare template instead of the duplicate.
      const { error: deleteError } = await supabase.from('project_files').delete().eq('project_id', created.id)
      if (deleteError) throw deleteError
      if (sourceFiles.length > 0) {
        const { error: insertError } = await supabase
          .from('project_files')
          .insert(sourceFiles.map((f) => ({ project_id: created.id, path: f.path, kind: 'file', content: f.content })))
        if (insertError) throw insertError
      }
    }

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

  /**
   * Shares a project with a team, or moves it to a different one. Requires
   * Supabase — team sharing is a cloud-only concept, same as teams
   * themselves (spec: teams need a shared backend). Only the project owner
   * can succeed here; the server enforces this too (migration 0005's
   * `projects_guard_sharing` trigger), so a non-owner's request fails here
   * with a real error rather than the UI ever assuming success.
   */
  async attachToTeam(id: string, teamId: string): Promise<Project> {
    if (!supabase) throw new Error('Team sharing requires Supabase to be configured.')
    const { data, error } = await supabase
      .from('projects')
      .update({ team_id: teamId, visibility: 'team' })
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return mapRow(data)
  },

  async detachFromTeam(id: string): Promise<Project> {
    if (!supabase) throw new Error('Team sharing requires Supabase to be configured.')
    const { data, error } = await supabase
      .from('projects')
      .update({ team_id: null, visibility: 'private' })
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return mapRow(data)
  },

  /** Projects shared with a team — visible to any member per the same RLS as everything else. */
  async listForTeam(teamId: string): Promise<Project[]> {
    if (!supabase) return []
    const { data, error } = await supabase.from('projects').select('*').eq('team_id', teamId)
    if (error) throw error
    return data.map(mapRow)
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
