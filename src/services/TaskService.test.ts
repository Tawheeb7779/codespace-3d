import { beforeEach, describe, expect, it } from 'vitest'
import { TaskService } from './TaskService'

// No VITE_SUPABASE_URL/ANON_KEY in the test env, so `supabase` is null and
// every call below exercises the local (IndexedDB-backed, mocked in
// src/test/setup.ts) branch — the same branch a local-mode project uses.
describe('TaskService (local mode)', () => {
  const projectId = 'test-project'

  beforeEach(async () => {
    for (const t of await TaskService.list(projectId)) {
      await TaskService.remove(projectId, t.id)
    }
  })

  it('creates a task defaulting to todo status', async () => {
    const task = await TaskService.create(projectId, { title: 'Write tests' }, 'local-user')
    expect(task.status).toBe('todo')
    expect(task.priority).toBe('medium')
    expect(task.title).toBe('Write tests')

    const list = await TaskService.list(projectId)
    expect(list.map((t) => t.id)).toContain(task.id)
  })

  it('lists newest-first', async () => {
    const first = await TaskService.create(projectId, { title: 'First' }, null)
    await new Promise((r) => setTimeout(r, 2))
    const second = await TaskService.create(projectId, { title: 'Second' }, null)
    const list = await TaskService.list(projectId)
    expect(list[0].id).toBe(second.id)
    expect(list[1].id).toBe(first.id)
  })

  it('setStatus updates status and updatedAt', async () => {
    const task = await TaskService.create(projectId, { title: 'Ship it' }, null)
    await TaskService.setStatus(projectId, task.id, 'done')
    const [updated] = await TaskService.list(projectId)
    expect(updated.status).toBe('done')
    expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(task.createdAt).getTime())
  })

  it('update patches only the given fields', async () => {
    const task = await TaskService.create(projectId, { title: 'Original', assignee: 'Alex' }, null)
    await TaskService.update(projectId, task.id, { title: 'Renamed' })
    const [updated] = await TaskService.list(projectId)
    expect(updated.title).toBe('Renamed')
    expect(updated.assignee).toBe('Alex') // untouched
  })

  it('remove deletes the task', async () => {
    const task = await TaskService.create(projectId, { title: 'Temp' }, null)
    await TaskService.remove(projectId, task.id)
    const list = await TaskService.list(projectId)
    expect(list.find((t) => t.id === task.id)).toBeUndefined()
  })

  it('keeps tasks scoped per project', async () => {
    await TaskService.create(projectId, { title: 'In project A' }, null)
    await TaskService.create('other-project', { title: 'In project B' }, null)
    const listA = await TaskService.list(projectId)
    expect(listA.every((t) => t.projectId === projectId)).toBe(true)
    expect(listA.some((t) => t.title === 'In project B')).toBe(false)
  })
})
