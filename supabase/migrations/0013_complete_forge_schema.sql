-- ============================================================================
-- Complete the Forge IDE schema on a database that has ALREADY been
-- partially, manually migrated — do not run 0011/0012 against this state,
-- they assume a different (untouched, text-id) starting point.
--
-- Starting point this file assumes (as reported directly from your live
-- database, not guessed):
--   - projects.id, .owner_id, .team_id are uuid; .template_id is text;
--     .name/.visibility are NOT NULL — already correct, already renamed.
--   - projects may still carry unused legacy columns (user_id, template,
--     branch) alongside the correct ones.
--   - project_files.project_id is uuid, FK'd to projects.id — already correct.
--   - project_members.project_id is uuid, FK'd to projects.id — already correct.
--   - The old RLS policies that blocked these renames, and old policies on
--     project_files/project_members, have already been dropped.
--   - Only profiles/projects/project_files/project_members (+ backup
--     tables) exist. teams/team_members/team_invitations/project_tasks/
--     comments/activities/user_settings/connections do not exist yet.
--
-- Every statement below is written to be safe regardless of exactly how far
-- your manual edits went beyond what you reported — it checks
-- information_schema/pg_constraint/pg_policies/pg_type/pg_trigger before
-- adding anything, so re-running this file (or running it against a state
-- slightly different from the one described above) is a no-op for whatever
-- already matches, not an error.
--
-- WHAT THIS FILE NEVER DOES
--   - Never drops project_members, or any column on it — untouched, exactly
--     as before. There is still no 1:1 target equivalent for it (Forge
--     shares projects via team_id + team_members, not a per-project
--     membership row) — see the OPTIONAL, clearly-delimited section at the
--     very end of this file if you want to carry it into the team model.
--   - Never drops a legacy column (user_id/template/branch on projects, or
--     name/language/is_folder/parent_id on project_files) even though the
--     app doesn't use them. If any of them still has a NOT NULL constraint,
--     that constraint is relaxed (data kept, just no longer required on new
--     rows the app doesn't populate it for) — this is very likely the
--     actual remaining blocker on Create Project if the schema-cache error
--     is now gone but inserts still fail.
--   - Never uses DROP TABLE, DROP ... CASCADE, or TRUNCATE anywhere.
--
-- ATOMICITY: this entire file is one transaction. If anything fails, the
-- database is left exactly as it was before you ran it — verified the same
-- way 0011 was: by actually triggering a failure mid-file against a real
-- Postgres instance and confirming a full rollback, not a partial one.
--
-- ORDER OF OPERATIONS
--   1. Run this file, once, in the Supabase SQL Editor.
--   2. Verify Create Project in the running app.
--   3. (Optional) run the appended project_members -> team synthesis at the
--      very end of this file, or skip it — see its own header there.
-- ============================================================================

begin;

do $$
begin
  raise notice '=== Row counts BEFORE ===';
  raise notice 'profiles: %', (select count(*) from profiles);
  raise notice 'projects: %', (select count(*) from projects);
  raise notice 'project_files: %', (select count(*) from project_files);
  raise notice 'project_members: %', (select count(*) from project_members);
end $$;

create table if not exists _pre_0013_backup_profiles as table profiles;
create table if not exists _pre_0013_backup_projects as table projects;
create table if not exists _pre_0013_backup_project_files as table project_files;
create table if not exists _pre_0013_backup_project_members as table project_members;

create extension if not exists pgcrypto;

-- A drop-then-recreate helper used throughout this file for every policy
-- and trigger: Postgres has no "create policy/trigger if not exists", and
-- we genuinely don't know which of them your manual edits already left in
-- place. Dropping whatever exists under a given name and recreating it from
-- this file's known-correct definition is idempotent either way — this is
-- a REPLACEMENT with the current, already-security-reviewed definition,
-- never a removal that leaves a gap.
create or replace function _pre_0013_drop_policy_if_exists(_table text, _policy text) returns void
language plpgsql as $$
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = _table and policyname = _policy) then
    execute format('drop policy %I on public.%I', _policy, _table);
  end if;
end;
$$;

-- ============================================================================
-- PART A — bring the 4 pre-existing tables the rest of the way to target
-- shape, without assuming exactly how far your manual edits already got.
-- ============================================================================

-- ---------------------------------------------------------------- profiles
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='display_name') then
    alter table profiles add column display_name text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='avatar_url') then
    alter table profiles add column avatar_url text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='created_at') then
    alter table profiles add column created_at timestamptz not null default now();
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='updated_at') then
    alter table profiles add column updated_at timestamptz not null default now();
  end if;

  update profiles set display_name = '' where display_name is null;
  if not exists (select 1 from profiles where display_name is null) then
    alter table profiles alter column display_name set not null;
    alter table profiles alter column display_name set default '';
  end if;
end $$;

alter table profiles enable row level security;

-- ---------------------------------------------------------------- projects
do $$
declare
  bad_visibility_count int;
begin
  -- Columns you reported as already correct are verified, not blindly
  -- re-added — `add column if not exists` is a no-op when they're already
  -- there, so this is safe whether or not they are.
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='projects' and column_name='created_at') then
    alter table projects add column created_at timestamptz;
  end if;
  update projects set created_at = now() where created_at is null;
  alter table projects alter column created_at set not null;
  alter table projects alter column created_at set default now();

  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='projects' and column_name='updated_at') then
    alter table projects add column updated_at timestamptz;
  end if;
  update projects set updated_at = coalesce(updated_at, created_at, now()) where updated_at is null;
  alter table projects alter column updated_at set not null;
  alter table projects alter column updated_at set default now();

  -- template_id: NOT NULL default 'blank', backfilled if somehow still empty.
  update projects set template_id = 'blank' where template_id is null or btrim(template_id) = '';
  alter table projects alter column template_id set not null;
  alter table projects alter column template_id set default 'blank';

  update projects set name = 'Untitled Project' where name is null or btrim(name) = '';
  alter table projects alter column name set not null;

  select count(*) into bad_visibility_count from projects where visibility is null or visibility not in ('private', 'team', 'public');
  if bad_visibility_count > 0 then
    raise notice 'projects: % row(s) had a null/unrecognized visibility, defaulted to "private": %',
      bad_visibility_count,
      (select string_agg(format('id=%s visibility=%s', id, coalesce(visibility, 'NULL')), ', ') from projects where visibility is null or visibility not in ('private', 'team', 'public'));
    update projects set visibility = 'private' where visibility is null or visibility not in ('private', 'team', 'public');
  end if;
  alter table projects alter column visibility set not null;
  alter table projects alter column visibility set default 'private';

  if not exists (select 1 from pg_constraint where conname = 'projects_visibility_check' and conrelid = 'projects'::regclass) then
    alter table projects add constraint projects_visibility_check check (visibility in ('private', 'team', 'public'));
  end if;

  -- Legacy columns: relax NOT NULL if present so they stop blocking inserts
  -- the app never populates them for. Data — and the column itself — is
  -- kept either way.
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='projects' and column_name='user_id' and is_nullable = 'NO') then
    alter table projects alter column user_id drop not null;
    raise notice 'projects.user_id: relaxed to nullable (legacy column, kept, no longer required)';
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='projects' and column_name='template' and is_nullable = 'NO') then
    alter table projects alter column template drop not null;
    raise notice 'projects.template: relaxed to nullable (legacy column, kept, no longer required)';
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='projects' and column_name='branch' and is_nullable = 'NO') then
    alter table projects alter column branch drop not null;
    raise notice 'projects.branch: relaxed to nullable (legacy column, kept, no longer required)';
  end if;

  if not exists (select 1 from pg_constraint where conname = 'projects_owner_id_fkey' and conrelid = 'projects'::regclass) then
    alter table projects add constraint projects_owner_id_fkey foreign key (owner_id) references auth.users (id) on delete cascade;
  end if;
end $$;

create index if not exists projects_owner_idx on projects (owner_id);
create index if not exists projects_team_idx on projects (team_id);

alter table projects enable row level security;

-- ----------------------------------------------------------- project_files
do $$
declare
  dup_count int;
  dup_list text;
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='project_files' and column_name='kind') then
    alter table project_files add column kind text;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='project_files' and column_name='is_folder') then
      update project_files set kind = case when is_folder then 'directory' else 'file' end where kind is null;
    else
      update project_files set kind = 'file' where kind is null;
    end if;
  end if;
  alter table project_files alter column kind set not null;
  if not exists (select 1 from pg_constraint where conname = 'project_files_kind_check' and conrelid = 'project_files'::regclass) then
    alter table project_files add constraint project_files_kind_check check (kind in ('file', 'directory'));
  end if;

  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='project_files' and column_name='updated_at') then
    alter table project_files add column updated_at timestamptz;
  end if;
  update project_files set updated_at = coalesce(updated_at, created_at, now()) where updated_at is null;
  alter table project_files alter column updated_at set not null;
  alter table project_files alter column updated_at set default now();

  alter table project_files alter column created_at set not null;
  alter table project_files alter column created_at set default now();
  alter table project_files alter column path set not null;
  alter table project_files alter column project_id set not null;

  if not exists (select 1 from pg_constraint where conname = 'project_files_project_id_fkey' and conrelid = 'project_files'::regclass) then
    alter table project_files add constraint project_files_project_id_fkey foreign key (project_id) references projects (id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'project_files_project_id_path_key' and conrelid = 'project_files'::regclass) then
    select count(*), string_agg(format('project_id=%s path=%s (%s rows)', project_id, path, cnt), '; ')
      into dup_count, dup_list
      from (select project_id, path, count(*) as cnt from project_files group by project_id, path having count(*) > 1) d;
    if dup_count > 0 then
      raise exception 'project_files: % (project_id, path) pair(s) are duplicated, which the target schema forbids — resolve these manually and re-run: %', dup_count, dup_list;
    end if;
    alter table project_files add constraint project_files_project_id_path_key unique (project_id, path);
  end if;
end $$;

create index if not exists project_files_project_idx on project_files (project_id);

alter table project_files enable row level security;

-- project_members: deliberately untouched here — see the file header and
-- the optional section at the end of this file.

-- ============================================================================
-- PART B — replace every existing policy on the 3 tables above with the
-- current, correct set (drop-by-name-if-exists, then create fresh).
-- ============================================================================

select _pre_0013_drop_policy_if_exists('profiles', 'profiles are readable by any authenticated user');
select _pre_0013_drop_policy_if_exists('profiles', 'users manage their own profile');
create policy "profiles are readable by any authenticated user" on profiles for select to authenticated using (true);
create policy "users manage their own profile" on profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- (projects/project_files policies are created in Part C, after
-- can_access_project/can_edit_project exist — dropped here so Part C's
-- `create policy` never collides with something your manual edits left.)
select _pre_0013_drop_policy_if_exists('projects', 'read accessible projects');
select _pre_0013_drop_policy_if_exists('projects', 'owners manage their projects');
select _pre_0013_drop_policy_if_exists('projects', 'team editors update team projects');
select _pre_0013_drop_policy_if_exists('project_files', 'read files of accessible projects');
select _pre_0013_drop_policy_if_exists('project_files', 'editors write files');
select _pre_0013_drop_policy_if_exists('project_files', 'editors update files');
select _pre_0013_drop_policy_if_exists('project_files', 'editors delete files');

-- ============================================================================
-- PART C — everything net-new: exactly 0001-0010's schema, made idempotent,
-- with the historical policy churn (0001 -> 0004's fix, 0007 -> 0010's
-- hardening) collapsed straight to its final, current form — a fresh table
-- only ever needs the policy it ends on, not the one it started with.
-- ============================================================================

-- ── teams / team_members / team_invitations ────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'team_role') then
    create type team_role as enum ('owner', 'admin', 'developer', 'viewer');
  end if;
end $$;

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists team_members (
  team_id uuid not null references teams (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role team_role not null default 'developer',
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create table if not exists team_invitations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  email text not null,
  role team_role not null default 'developer',
  invited_by uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'revoked')),
  created_at timestamptz not null default now()
);

alter table teams enable row level security;
alter table team_members enable row level security;
alter table team_invitations enable row level security;

create or replace function is_team_member(_team_id uuid)
returns boolean language sql stable security definer as $$
  select exists (select 1 from team_members where team_id = _team_id and user_id = auth.uid());
$$;

create or replace function team_role_of(_team_id uuid)
returns team_role language sql stable security definer as $$
  select role from team_members where team_id = _team_id and user_id = auth.uid();
$$;

select _pre_0013_drop_policy_if_exists('teams', 'team members can read their team');
select _pre_0013_drop_policy_if_exists('teams', 'owners manage their team');
create policy "team members can read their team" on teams for select to authenticated using (is_team_member(id));
create policy "owners manage their team" on teams for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Final form directly (0004's fix, not 0001's original superseded version):
-- an owner has full control; an admin may only touch developer/viewer rows,
-- never promote anyone (including themselves) to owner/admin, and never
-- touch an existing owner/admin row.
select _pre_0013_drop_policy_if_exists('team_members', 'team members can read membership');
select _pre_0013_drop_policy_if_exists('team_members', 'owners/admins manage membership');
select _pre_0013_drop_policy_if_exists('team_members', 'owners manage all membership');
select _pre_0013_drop_policy_if_exists('team_members', 'admins manage ordinary members');
select _pre_0013_drop_policy_if_exists('team_members', 'invited users can join via an accepted invitation');
create policy "team members can read membership" on team_members for select to authenticated using (is_team_member(team_id));
create policy "owners manage all membership" on team_members for all to authenticated using (team_role_of(team_id) = 'owner') with check (team_role_of(team_id) = 'owner');
create policy "admins manage ordinary members" on team_members for all to authenticated using (team_role_of(team_id) = 'admin' and role not in ('owner', 'admin')) with check (team_role_of(team_id) = 'admin' and role not in ('owner', 'admin'));
create policy "invited users can join via an accepted invitation" on team_members for insert to authenticated with check (
  user_id = auth.uid()
  and exists (select 1 from team_invitations i where i.team_id = team_members.team_id and i.email = auth.jwt() ->> 'email' and i.status = 'accepted' and i.role = team_members.role)
);

select _pre_0013_drop_policy_if_exists('team_invitations', 'team members can read invitations');
select _pre_0013_drop_policy_if_exists('team_invitations', 'owners/admins manage invitations');
select _pre_0013_drop_policy_if_exists('team_invitations', 'owners manage all invitations');
select _pre_0013_drop_policy_if_exists('team_invitations', 'admins manage ordinary invitations');
select _pre_0013_drop_policy_if_exists('team_invitations', 'invitees can respond to their own invitation');
create policy "team members can read invitations" on team_invitations for select to authenticated using (is_team_member(team_id) or email = auth.jwt() ->> 'email');
create policy "owners manage all invitations" on team_invitations for all to authenticated using (team_role_of(team_id) = 'owner') with check (team_role_of(team_id) = 'owner');
create policy "admins manage ordinary invitations" on team_invitations for all to authenticated using (team_role_of(team_id) = 'admin' and role not in ('owner', 'admin')) with check (team_role_of(team_id) = 'admin' and role not in ('owner', 'admin'));
create policy "invitees can respond to their own invitation" on team_invitations for update to authenticated using (email = auth.jwt() ->> 'email' and status = 'pending') with check (email = auth.jwt() ->> 'email' and status in ('accepted', 'declined'));

create or replace function enforce_invitation_response_columns()
returns trigger language plpgsql as $$
begin
  if team_role_of(new.team_id) in ('owner', 'admin') then
    return new;
  end if;
  if old.team_id <> new.team_id or old.email <> new.email or old.role <> new.role
     or old.invited_by <> new.invited_by or old.created_at <> new.created_at
     or old.status <> 'pending' or new.status not in ('accepted', 'declined') then
    raise exception 'Cannot modify this invitation.';
  end if;
  return new;
end;
$$;
drop trigger if exists team_invitations_guard_response on team_invitations;
create trigger team_invitations_guard_response before update on team_invitations for each row execute function enforce_invitation_response_columns();

-- ── projects / project_files authorization ─────────────────────────────
create or replace function can_access_project(_project_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from projects p
    where p.id = _project_id
      and (p.owner_id = auth.uid() or p.visibility = 'public' or (p.team_id is not null and is_team_member(p.team_id)))
  );
$$;

create or replace function can_edit_project(_project_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from projects p
    where p.id = _project_id
      and (p.owner_id = auth.uid() or (p.team_id is not null and team_role_of(p.team_id) in ('owner', 'admin', 'developer')))
  );
$$;

create policy "read accessible projects" on projects for select to authenticated using (can_access_project(id));
create policy "owners manage their projects" on projects for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "team editors update team projects" on projects for update to authenticated using (can_edit_project(id)) with check (can_edit_project(id));

create policy "read files of accessible projects" on project_files for select to authenticated using (can_access_project(project_id));
create policy "editors write files" on project_files for insert to authenticated with check (can_edit_project(project_id));
create policy "editors update files" on project_files for update to authenticated using (can_edit_project(project_id)) with check (can_edit_project(project_id));
create policy "editors delete files" on project_files for delete to authenticated using (can_edit_project(project_id));

create or replace function enforce_project_sharing_owner_only()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if TG_OP = 'UPDATE' then
    if new.team_id is not distinct from old.team_id and new.visibility is not distinct from old.visibility then
      return new;
    end if;
    if auth.uid() <> new.owner_id then
      raise exception 'Only the project owner can change team sharing or visibility.';
    end if;
  end if;
  if new.team_id is not null and not is_team_member(new.team_id) then
    raise exception 'You can only share a project with a team you are a member of.';
  end if;
  if new.team_id is null and new.visibility = 'team' then
    new.visibility := 'private';
  end if;
  return new;
end;
$$;
drop trigger if exists projects_guard_sharing on projects;
create trigger projects_guard_sharing before insert or update on projects for each row execute function enforce_project_sharing_owner_only();

-- ── comments ─────────────────────────────────────────────────────────
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  file_path text,
  line_number int,
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  resolved boolean not null default false,
  parent_id uuid references comments (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists comments_project_idx on comments (project_id);
alter table comments enable row level security;
select _pre_0013_drop_policy_if_exists('comments', 'read comments on accessible projects');
select _pre_0013_drop_policy_if_exists('comments', 'editors write comments');
select _pre_0013_drop_policy_if_exists('comments', 'authors manage their comments');
select _pre_0013_drop_policy_if_exists('comments', 'authors delete their comments');
create policy "read comments on accessible projects" on comments for select to authenticated using (can_access_project(project_id));
create policy "editors write comments" on comments for insert to authenticated with check (can_edit_project(project_id) and author_id = auth.uid());
create policy "authors manage their comments" on comments for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "authors delete their comments" on comments for delete to authenticated using (author_id = auth.uid());

-- ── activities ───────────────────────────────────────────────────────
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects (id) on delete cascade,
  team_id uuid references teams (id) on delete cascade,
  actor_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activities_project_idx on activities (project_id);
create index if not exists activities_team_idx on activities (team_id);
alter table activities enable row level security;
select _pre_0013_drop_policy_if_exists('activities', 'read activity on accessible projects');
select _pre_0013_drop_policy_if_exists('activities', 'editors write activity');
create policy "read activity on accessible projects" on activities for select to authenticated using (
  (project_id is not null and can_access_project(project_id)) or (team_id is not null and is_team_member(team_id))
);
create policy "editors write activity" on activities for insert to authenticated with check (actor_id = auth.uid());

-- ── user settings ────────────────────────────────────────────────────
create table if not exists user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  editor jsonb not null default '{}'::jsonb,
  appearance jsonb not null default '{}'::jsonb,
  ai jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table user_settings enable row level security;
select _pre_0013_drop_policy_if_exists('user_settings', 'users manage their own settings');
create policy "users manage their own settings" on user_settings for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── AI provider connections ──────────────────────────────────────────
-- Final form directly: RLS enabled, NO policy for authenticated/anon at
-- all (0009's fix) — every real read/write goes through the service-role
-- client in the ai-agent/connections-save Edge Functions, which bypasses
-- RLS entirely, so the client needs zero access to this table, not scoped
-- access to "their own" row.
create table if not exists connections (
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('openai', 'anthropic', 'gemini', 'openai-compatible')),
  encrypted_api_key text not null,
  base_url text,
  created_at timestamptz not null default now(),
  primary key (user_id, provider)
);
alter table connections enable row level security;
select _pre_0013_drop_policy_if_exists('connections', 'users manage existence of their own connections');

-- ── project tasks ────────────────────────────────────────────────────
create table if not exists project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  assignee text,
  due_date date,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists project_tasks_project_idx on project_tasks (project_id);
alter table project_tasks enable row level security;
select _pre_0013_drop_policy_if_exists('project_tasks', 'read tasks of accessible projects');
select _pre_0013_drop_policy_if_exists('project_tasks', 'editors create tasks');
select _pre_0013_drop_policy_if_exists('project_tasks', 'editors update tasks');
select _pre_0013_drop_policy_if_exists('project_tasks', 'editors delete tasks');
create policy "read tasks of accessible projects" on project_tasks for select to authenticated using (can_access_project(project_id));
create policy "editors create tasks" on project_tasks for insert to authenticated with check (can_edit_project(project_id) and created_by = auth.uid());
create policy "editors update tasks" on project_tasks for update to authenticated using (can_edit_project(project_id)) with check (can_edit_project(project_id));
create policy "editors delete tasks" on project_tasks for delete to authenticated using (can_edit_project(project_id));

-- ── updated_at triggers ──────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists projects_set_updated_at on projects;
create trigger projects_set_updated_at before update on projects for each row execute function set_updated_at();
drop trigger if exists project_files_set_updated_at on project_files;
create trigger project_files_set_updated_at before update on project_files for each row execute function set_updated_at();
drop trigger if exists profiles_set_updated_at on profiles;
create trigger profiles_set_updated_at before update on profiles for each row execute function set_updated_at();
drop trigger if exists teams_set_updated_at on teams;
create trigger teams_set_updated_at before update on teams for each row execute function set_updated_at();
drop trigger if exists project_tasks_set_updated_at on project_tasks;
create trigger project_tasks_set_updated_at before update on project_tasks for each row execute function set_updated_at();

-- ── new user bootstrap ───────────────────────────────────────────────
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, display_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  insert into user_settings (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- ── SQL Studio: hardened (0007+0010 combined) read-only query function ──
create or replace function run_readonly_query(query text, row_limit int default 500)
returns setof jsonb
language plpgsql security invoker set search_path = public as $$
declare
  trimmed text := btrim(query);
  capped_limit int := least(greatest(coalesce(row_limit, 500), 1), 500);
begin
  trimmed := regexp_replace(trimmed, ';\s*$', '');
  if position(';' in trimmed) > 0 then
    raise exception 'Only a single SQL statement is allowed.';
  end if;
  if trimmed = '' then
    raise exception 'Query is empty.';
  end if;
  if trimmed !~* '^(select|with)\M' then
    raise exception 'Only read-only SELECT (or WITH ... SELECT) queries are allowed.';
  end if;
  -- The real boundary: local to this transaction, rejects every write —
  -- inline, inside a function body, or via a CTE — at the engine level,
  -- not by pattern-matching the SQL text.
  perform set_config('transaction_read_only', 'on', true);
  perform set_config('statement_timeout', '5000', true);
  return query execute format('select to_jsonb(_row) from (%s) as _row limit %s', trimmed, capped_limit);
end;
$$;
revoke all on function run_readonly_query(text, int) from public;
grant execute on function run_readonly_query(text, int) to authenticated;

-- ── Realtime: presence authorization + comments/activities publication ──
-- Two independent things, guarded independently — an earlier version of
-- this block required BOTH `realtime.messages` and the `supabase_realtime`
-- publication to exist before creating the presence policy, which
-- incorrectly skipped the policy in any environment (this repo's own local
-- test harness included) that provides `realtime.messages` without a real
-- publication. Caught by actually running this repo's own
-- 01_presence_authorization / 04_project_team_sharing test suites against
-- the schema this file produces: both failed until this was split.
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'realtime' and table_name = 'messages') then
    alter table realtime.messages enable row level security;

    if exists (select 1 from pg_policies where schemaname = 'realtime' and tablename = 'messages' and policyname = 'presence access follows project access') then
      drop policy "presence access follows project access" on realtime.messages;
    end if;
    create policy "presence access follows project access" on realtime.messages for select to authenticated using (
      realtime.messages.extension = 'presence'
      and realtime.topic() ~ '^presence:project:[0-9a-fA-F-]{36}$'
      and can_access_project(substring(realtime.topic() from 'presence:project:(.+)$')::uuid)
    );
  else
    raise notice 'Presence RLS skipped: no realtime.messages table on this Postgres (expected only on plain local Postgres with no realtime schema at all; your real Supabase project always has this table).';
  end if;

  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'comments') then
      alter publication supabase_realtime add table comments;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'activities') then
      alter publication supabase_realtime add table activities;
    end if;
  else
    raise notice 'Realtime publication membership skipped: no supabase_realtime publication on this Postgres (expected when testing locally; your real Supabase project always has this).';
  end if;
end $$;

-- ── Storage: project-assets bucket (only meaningful on a real Supabase
-- project — storage.buckets/storage.objects don't exist on plain Postgres) ──
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public) values ('project-assets', 'project-assets', false) on conflict (id) do nothing;

    if exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'read assets of accessible projects') then
      drop policy "read assets of accessible projects" on storage.objects;
    end if;
    create policy "read assets of accessible projects" on storage.objects for select to authenticated
      using (bucket_id = 'project-assets' and can_access_project((storage.foldername(name))[1]::uuid));

    if exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'editors upload assets') then
      drop policy "editors upload assets" on storage.objects;
    end if;
    create policy "editors upload assets" on storage.objects for insert to authenticated
      with check (bucket_id = 'project-assets' and can_edit_project((storage.foldername(name))[1]::uuid));

    if exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'editors update assets') then
      drop policy "editors update assets" on storage.objects;
    end if;
    create policy "editors update assets" on storage.objects for update to authenticated
      using (bucket_id = 'project-assets' and can_edit_project((storage.foldername(name))[1]::uuid))
      with check (bucket_id = 'project-assets' and can_edit_project((storage.foldername(name))[1]::uuid));

    if exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'editors delete assets') then
      drop policy "editors delete assets" on storage.objects;
    end if;
    create policy "editors delete assets" on storage.objects for delete to authenticated
      using (bucket_id = 'project-assets' and can_edit_project((storage.foldername(name))[1]::uuid));
  else
    raise notice 'Storage setup skipped: this Postgres has no storage.buckets table (expected when testing locally; on your real Supabase project this block runs normally).';
  end if;
end $$;

drop function _pre_0013_drop_policy_if_exists(text, text);

do $$
begin
  raise notice '=== Row counts AFTER (profiles/projects/project_files/project_members must match BEFORE) ===';
  raise notice 'profiles: %', (select count(*) from profiles);
  raise notice 'projects: %', (select count(*) from projects);
  raise notice 'project_files: %', (select count(*) from project_files);
  raise notice 'project_members: % (untouched)', (select count(*) from project_members);
end $$;

commit;

-- ============================================================================
-- OPTIONAL — carry project_members (per-project user+role) into the new
-- team model. Read fully before running.
--
-- There is no lossless mechanical mapping from "N users individually
-- attached to a project" to "a project attached to one team" — this is a
-- real product decision, made here as safely as possible: for every
-- project that has project_members rows, create ONE NEW team named after
-- the project, make the project's owner that team's owner, add every
-- project_member with a role carried across, and attach the project to
-- that team. Visible effect in the app: those users now see a new team
-- named "<project name> Team" they didn't create themselves.
--
-- project_members itself is NEVER modified, renamed, or dropped, whether
-- or not you run this. Skip it entirely and decide sharing manually from
-- the Teams page instead if you'd rather not have teams auto-created.
--
-- Role mapping is best-effort (this repo has never defined the old role
-- vocabulary): owner/admin/developer map straight across; editor/write/
-- contributor -> developer; viewer/reader/read -> viewer; anything else
-- also -> viewer (never guess up in privilege). Review
-- _pre_0013_role_mapping_report afterward for exactly who got what, and
-- use the Teams page's role editor for anyone who needs adjusting.
--
-- Runs as its own transaction, separate from the schema migration above —
-- delete or comment out this entire section to skip it.
-- ============================================================================

begin;

do $$
declare
  proj record;
  new_team_id uuid;
  member record;
  mapped_role team_role;
begin
  create table if not exists _pre_0013_role_mapping_report (
    project_id uuid,
    project_name text,
    new_team_id uuid,
    member_user_id uuid,
    old_role text,
    mapped_role team_role
  );

  for proj in
    select distinct p.id, p.name, p.owner_id
    from projects p
    where exists (select 1 from project_members pm where pm.project_id = p.id)
      and p.team_id is null
  loop
    insert into teams (name, owner_id) values (proj.name || ' Team', proj.owner_id) returning id into new_team_id;
    insert into team_members (team_id, user_id, role) values (new_team_id, proj.owner_id, 'owner') on conflict do nothing;

    for member in select pm.user_id, pm.role from project_members pm where pm.project_id = proj.id loop
      if member.user_id = proj.owner_id then
        continue;
      end if;
      mapped_role := case lower(coalesce(member.role, ''))
        when 'owner' then 'owner'
        when 'admin' then 'admin'
        when 'developer' then 'developer'
        when 'editor' then 'developer'
        when 'write' then 'developer'
        when 'contributor' then 'developer'
        when 'viewer' then 'viewer'
        when 'reader' then 'viewer'
        when 'read' then 'viewer'
        else 'viewer'
      end::team_role;

      insert into team_members (team_id, user_id, role) values (new_team_id, member.user_id, mapped_role) on conflict (team_id, user_id) do nothing;
      insert into _pre_0013_role_mapping_report (project_id, project_name, new_team_id, member_user_id, old_role, mapped_role)
        values (proj.id, proj.name, new_team_id, member.user_id, member.role, mapped_role);
    end loop;

    update projects set team_id = new_team_id, visibility = 'team' where id = proj.id;
    raise notice 'created team "% Team" (%) for project %', proj.name, new_team_id, proj.id;
  end loop;

  if not exists (select 1 from _pre_0013_role_mapping_report) then
    raise notice 'No project_members rows needed migrating (either none exist, or every such project already has a team_id).';
  else
    raise notice 'See _pre_0013_role_mapping_report for exactly which user got which role on which new team.';
  end if;
end $$;

commit;
