-- Forge IDE — initial schema
-- Run via: supabase db push  (or paste into the SQL editor of your project)

create extension if not exists "pgcrypto";

-- ── profiles ────────────────────────────────────────────────────────────
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles are readable by any authenticated user"
  on profiles for select
  to authenticated
  using (true);

create policy "users manage their own profile"
  on profiles for all
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ── teams ───────────────────────────────────────────────────────────────
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type team_role as enum ('owner', 'admin', 'developer', 'viewer');

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
  select exists (
    select 1 from team_members where team_id = _team_id and user_id = auth.uid()
  );
$$;

create or replace function team_role_of(_team_id uuid)
returns team_role language sql stable security definer as $$
  select role from team_members where team_id = _team_id and user_id = auth.uid();
$$;

create policy "team members can read their team" on teams
  for select to authenticated using (is_team_member(id));
create policy "owners manage their team" on teams
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "team members can read membership" on team_members
  for select to authenticated using (is_team_member(team_id));
create policy "owners/admins manage membership" on team_members
  for all to authenticated
  using (team_role_of(team_id) in ('owner', 'admin'))
  with check (team_role_of(team_id) in ('owner', 'admin'));

create policy "team members can read invitations" on team_invitations
  for select to authenticated using (is_team_member(team_id) or email = auth.jwt() ->> 'email');
create policy "owners/admins manage invitations" on team_invitations
  for all to authenticated
  using (team_role_of(team_id) in ('owner', 'admin'))
  with check (team_role_of(team_id) in ('owner', 'admin'));

-- ── projects ────────────────────────────────────────────────────────────
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  template_id text not null default 'blank',
  owner_id uuid not null references auth.users (id) on delete cascade,
  team_id uuid references teams (id) on delete set null,
  visibility text not null default 'private' check (visibility in ('private', 'team', 'public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_owner_idx on projects (owner_id);
create index if not exists projects_team_idx on projects (team_id);

create table if not exists project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  path text not null,
  kind text not null check (kind in ('file', 'directory')),
  content text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, path)
);

create index if not exists project_files_project_idx on project_files (project_id);

alter table projects enable row level security;
alter table project_files enable row level security;

create or replace function can_access_project(_project_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from projects p
    where p.id = _project_id
      and (
        p.owner_id = auth.uid()
        or p.visibility = 'public'
        or (p.team_id is not null and is_team_member(p.team_id))
      )
  );
$$;

create or replace function can_edit_project(_project_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from projects p
    where p.id = _project_id
      and (
        p.owner_id = auth.uid()
        or (p.team_id is not null and team_role_of(p.team_id) in ('owner', 'admin', 'developer'))
      )
  );
$$;

create policy "read accessible projects" on projects
  for select to authenticated using (can_access_project(id));
create policy "owners manage their projects" on projects
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "team editors update team projects" on projects
  for update to authenticated using (can_edit_project(id)) with check (can_edit_project(id));

create policy "read files of accessible projects" on project_files
  for select to authenticated using (can_access_project(project_id));
create policy "editors write files" on project_files
  for insert to authenticated with check (can_edit_project(project_id));
create policy "editors update files" on project_files
  for update to authenticated using (can_edit_project(project_id)) with check (can_edit_project(project_id));
create policy "editors delete files" on project_files
  for delete to authenticated using (can_edit_project(project_id));

-- ── comments ────────────────────────────────────────────────────────────
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

create policy "read comments on accessible projects" on comments
  for select to authenticated using (can_access_project(project_id));
create policy "editors write comments" on comments
  for insert to authenticated with check (can_edit_project(project_id) and author_id = auth.uid());
create policy "authors manage their comments" on comments
  for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "authors delete their comments" on comments
  for delete to authenticated using (author_id = auth.uid());

-- ── activities ──────────────────────────────────────────────────────────
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

create policy "read activity on accessible projects" on activities
  for select to authenticated using (
    (project_id is not null and can_access_project(project_id))
    or (team_id is not null and is_team_member(team_id))
  );
create policy "editors write activity" on activities
  for insert to authenticated with check (actor_id = auth.uid());

-- ── user settings ───────────────────────────────────────────────────────
create table if not exists user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  editor jsonb not null default '{}'::jsonb,
  appearance jsonb not null default '{}'::jsonb,
  ai jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table user_settings enable row level security;

create policy "users manage their own settings" on user_settings
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── AI provider connections (server-held keys, never exposed to other users) ──
create table if not exists connections (
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('openai', 'anthropic', 'gemini', 'openai-compatible')),
  encrypted_api_key text not null,
  base_url text,
  created_at timestamptz not null default now(),
  primary key (user_id, provider)
);

alter table connections enable row level security;

-- Deliberately no SELECT policy exposing encrypted_api_key to the client;
-- only the service-role Edge Function (ai-agent) reads this table.
create policy "users manage existence of their own connections" on connections
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── updated_at triggers ─────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_set_updated_at before update on projects
  for each row execute function set_updated_at();
create trigger project_files_set_updated_at before update on project_files
  for each row execute function set_updated_at();
create trigger profiles_set_updated_at before update on profiles
  for each row execute function set_updated_at();
create trigger teams_set_updated_at before update on teams
  for each row execute function set_updated_at();

-- ── new user bootstrap ──────────────────────────────────────────────────
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, display_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), new.raw_user_meta_data->>'avatar_url');
  insert into user_settings (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── realtime ────────────────────────────────────────────────────────────
alter publication supabase_realtime add table comments;
alter publication supabase_realtime add table activities;
