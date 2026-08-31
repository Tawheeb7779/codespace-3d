-- Project Tasks: a real per-project task list (Forge IDE spec §feature 12).
-- Reuses can_access_project/can_edit_project from 0001_init.sql — no new
-- authorization concept, same rule as every other project-scoped table.

create table if not exists project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  -- Free-text rather than a foreign key to auth.users: a task can be
  -- assigned to anyone the team names, without requiring the assignee to
  -- already be a project collaborator to record who it's for.
  assignee text,
  due_date date,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_tasks_project_idx on project_tasks (project_id);

alter table project_tasks enable row level security;

create policy "read tasks of accessible projects" on project_tasks
  for select to authenticated using (can_access_project(project_id));
create policy "editors create tasks" on project_tasks
  for insert to authenticated with check (can_edit_project(project_id) and created_by = auth.uid());
create policy "editors update tasks" on project_tasks
  for update to authenticated using (can_edit_project(project_id)) with check (can_edit_project(project_id));
create policy "editors delete tasks" on project_tasks
  for delete to authenticated using (can_edit_project(project_id));

create trigger project_tasks_set_updated_at before update on project_tasks
  for each row execute function set_updated_at();
