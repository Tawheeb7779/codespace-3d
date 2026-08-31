import { useEffect, useState } from 'react'
import { CheckCircle2, Circle, CircleDot, ListTodo, Plus, Trash2 } from 'lucide-react'
import { clsx } from 'clsx'
import { useWorkspace } from '@/features/workspace/WorkspaceContext'
import { useAuthStore } from '@/stores/authStore'
import { TaskService } from '@/services/TaskService'
import type { Task, TaskStatus, CreateTaskInput } from '@/types/task'
import { NewTaskDialog } from '@/features/tasks/NewTaskDialog'
import { Spinner, EmptyState } from '@/components/ui/misc'
import { toast } from '@/stores/toastStore'
import { ActivityService } from '@/services/ActivityService'

const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'done']
const STATUS_LABEL: Record<TaskStatus, string> = { todo: 'To do', in_progress: 'In progress', done: 'Done' }
const STATUS_ICON: Record<TaskStatus, typeof Circle> = { todo: Circle, in_progress: CircleDot, done: CheckCircle2 }
const PRIORITY_COLOR: Record<Task['priority'], string> = {
  low: 'bg-graphite-700 text-graphite-300',
  medium: 'bg-signal-amber/15 text-signal-amber',
  high: 'bg-signal-red/15 text-signal-red',
}

function nextStatus(status: TaskStatus): TaskStatus {
  const i = STATUS_ORDER.indexOf(status)
  return STATUS_ORDER[(i + 1) % STATUS_ORDER.length]
}

export function TasksPanel() {
  const { project } = useWorkspace()
  const user = useAuthStore((s) => s.user)
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  async function refresh() {
    try {
      setTasks(await TaskService.list(project.id))
    } catch (err) {
      toast.error('Could not load tasks', err instanceof Error ? err.message : undefined)
      setTasks([])
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id])

  async function handleCreate(input: CreateTaskInput) {
    try {
      await TaskService.create(project.id, input, user?.id ?? null)
      void ActivityService.log(project.id, user?.id ?? null, 'task_created', { title: input.title })
      await refresh()
    } catch (err) {
      toast.error('Could not create task', err instanceof Error ? err.message : undefined)
    }
  }

  async function handleCycleStatus(task: Task) {
    const status = nextStatus(task.status)
    setTasks((prev) => prev?.map((t) => (t.id === task.id ? { ...t, status } : t)) ?? prev)
    try {
      await TaskService.setStatus(project.id, task.id, status)
      if (status === 'done') void ActivityService.log(project.id, user?.id ?? null, 'task_completed', { title: task.title })
    } catch (err) {
      toast.error('Could not update task', err instanceof Error ? err.message : undefined)
      refresh()
    }
  }

  async function handleDelete(task: Task) {
    if (!confirm(`Delete "${task.title}"?`)) return
    setTasks((prev) => prev?.filter((t) => t.id !== task.id) ?? prev)
    try {
      await TaskService.remove(project.id, task.id)
    } catch (err) {
      toast.error('Could not delete task', err instanceof Error ? err.message : undefined)
      refresh()
    }
  }

  if (tasks === null) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 py-2.5">
        <span className="type-label text-graphite-600">Tasks</span>
        <button
          onClick={() => setDialogOpen(true)}
          aria-label="New task"
          title="New task"
          className="rounded-md p-1.5 text-graphite-500 transition-colors hover:bg-surface-hover hover:text-graphite-100"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-1.5 pb-2">
        {tasks.length === 0 ? (
          <EmptyState icon={ListTodo} title="No tasks" description="Create a task to start tracking work on this project." />
        ) : (
          STATUS_ORDER.map((status) => {
            const group = tasks.filter((t) => t.status === status)
            if (group.length === 0) return null
            return (
              <div key={status} className="mb-2">
                <p className="px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-graphite-600">
                  {STATUS_LABEL[status]} · {group.length}
                </p>
                {group.map((task) => {
                  const StatusIcon = STATUS_ICON[task.status]
                  const overdue = task.dueDate && task.status !== 'done' && new Date(task.dueDate) < new Date(new Date().toDateString())
                  return (
                    <div key={task.id} className="group flex items-start gap-2 rounded-lg px-2.5 py-1.5 hover:bg-surface-hover">
                      <button
                        onClick={() => handleCycleStatus(task)}
                        aria-label={`Cycle status (currently ${STATUS_LABEL[task.status]})`}
                        className="mt-0.5 shrink-0 text-graphite-500 hover:text-ember-400"
                      >
                        <StatusIcon size={15} className={task.status === 'done' ? 'text-signal-green' : ''} />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={clsx('truncate text-[0.8125rem]', task.status === 'done' ? 'text-graphite-600 line-through' : 'text-graphite-200')}>
                          {task.title}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span className={clsx('rounded px-1.5 py-0.5 text-[0.625rem] font-medium capitalize', PRIORITY_COLOR[task.priority])}>
                            {task.priority}
                          </span>
                          {task.assignee && <span className="text-[0.6875rem] text-graphite-500">{task.assignee}</span>}
                          {task.dueDate && (
                            <span className={clsx('text-[0.6875rem]', overdue ? 'text-signal-red' : 'text-graphite-500')}>
                              {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(task)}
                        aria-label={`Delete ${task.title}`}
                        className="reveal-on-hover shrink-0 rounded p-1 text-graphite-600 opacity-0 hover:bg-signal-red/12 hover:text-signal-red group-hover:opacity-100"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )
          })
        )}
      </div>

      <NewTaskDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreate={handleCreate} />
    </div>
  )
}
