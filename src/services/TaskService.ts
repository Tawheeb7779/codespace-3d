import { supabase } from '@/lib/supabaseClient'
import { idbGet, idbSet } from '@/lib/idbStore'
import type { Task, CreateTaskInput, TaskStatus } from '@/types/task'

function randomId(): string {
  return crypto.randomUUID()
}

async function readLocalTasks(projectId: string): Promise<Task[]> {
  return (await idbGet<Task[]>('tasks', projectId)) ?? []
}

async function writeLocalTasks(projectId: string, tasks: Task[]): Promise<void> {
  await idbSet('tasks', projectId, tasks)
}

/**
 * Cloud-backed (project_tasks table, migration 0006) when Supabase is
 * configured; otherwise a genuine local-only implementation backed by
 * IndexedDB, same dual-mode pattern as ProjectService. Never fake data —
 * an empty project has an empty task list either way.
 */
export const TaskService = {
  async list(projectId: string): Promise<Task[]> {
    if (supabase) {
      const { data, error } = await supabase
        .from('project_tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data.map(mapRow)
    }
    return readLocalTasks(projectId)
  },

  async create(projectId: string, input: CreateTaskInput, createdBy: string | null): Promise<Task> {
    if (supabase && createdBy) {
      const { data, error } = await supabase
        .from('project_tasks')
        .insert({
          project_id: projectId,
          title: input.title,
          description: input.description ?? null,
          priority: input.priority ?? 'medium',
          assignee: input.assignee ?? null,
          due_date: input.dueDate ?? null,
          created_by: createdBy,
        })
        .select('*')
        .single()
      if (error) throw error
      return mapRow(data)
    }

    const now = new Date().toISOString()
    const task: Task = {
      id: randomId(),
      projectId,
      title: input.title,
      description: input.description ?? null,
      status: 'todo',
      priority: input.priority ?? 'medium',
      assignee: input.assignee ?? null,
      dueDate: input.dueDate ?? null,
      createdBy: createdBy ?? 'local',
      createdAt: now,
      updatedAt: now,
    }
    const tasks = await readLocalTasks(projectId)
    tasks.unshift(task)
    await writeLocalTasks(projectId, tasks)
    return task
  },

  async setStatus(projectId: string, id: string, status: TaskStatus): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from('project_tasks').update({ status }).eq('id', id)
      if (error) throw error
      return
    }
    const tasks = await readLocalTasks(projectId)
    const task = tasks.find((t) => t.id === id)
    if (task) {
      task.status = status
      task.updatedAt = new Date().toISOString()
      await writeLocalTasks(projectId, tasks)
    }
  },

  async update(projectId: string, id: string, patch: Partial<CreateTaskInput>): Promise<void> {
    if (supabase) {
      const { error } = await supabase
        .from('project_tasks')
        .update({
          ...(patch.title !== undefined ? { title: patch.title } : {}),
          ...(patch.description !== undefined ? { description: patch.description } : {}),
          ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
          ...(patch.assignee !== undefined ? { assignee: patch.assignee } : {}),
          ...(patch.dueDate !== undefined ? { due_date: patch.dueDate } : {}),
        })
        .eq('id', id)
      if (error) throw error
      return
    }
    const tasks = await readLocalTasks(projectId)
    const task = tasks.find((t) => t.id === id)
    if (task) {
      Object.assign(task, {
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
        ...(patch.assignee !== undefined ? { assignee: patch.assignee } : {}),
        ...(patch.dueDate !== undefined ? { dueDate: patch.dueDate } : {}),
      })
      task.updatedAt = new Date().toISOString()
      await writeLocalTasks(projectId, tasks)
    }
  },

  async remove(projectId: string, id: string): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from('project_tasks').delete().eq('id', id)
      if (error) throw error
      return
    }
    const tasks = await readLocalTasks(projectId)
    await writeLocalTasks(projectId, tasks.filter((t) => t.id !== id))
  },
}

interface TaskRow {
  id: string
  project_id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: Task['priority']
  assignee: string | null
  due_date: string | null
  created_by: string
  created_at: string
  updated_at: string
}

function mapRow(row: TaskRow): Task {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    assignee: row.assignee,
    dueDate: row.due_date,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
