-- ============================================================================
-- Upgrade an EXISTING, pre-Forge Supabase database to the schema Forge IDE's
-- current code expects — run this BEFORE (re-)applying 0001 through 0010.
--
-- Why this exists: this repository's migrations (0001-0010) assume they are
-- creating `profiles`/`projects`/`project_files` from nothing. A live
-- database that predates this repo's current schema can already have those
-- three tables (plus a `project_members` table with no equivalent in any
-- Forge migration) in an incompatible shape:
--
--   OLD                          TARGET (this repo's 0001_init.sql)
--   ----------------------------  ----------------------------------------
--   projects.id            text   projects.id                        uuid
--   projects.user_id       uuid   projects.owner_id                  uuid
--   projects.template      text   projects.template_id               text
--   (missing)                     projects.team_id                   uuid
--   (missing)                     projects.created_at         timestamptz
--   (missing)                     projects.updated_at         timestamptz
--   projects.visibility     text  projects.visibility (+ CHECK, NOT NULL)
--
--   project_files.id        text  project_files.id                   uuid
--   project_files.project_id text project_files.project_id           uuid
--   project_files.name, .language,  -- kept, but unused by current code
--     .is_folder, .parent_id
--   (missing)                     project_files.kind    ('file'/'directory')
--   (missing)                     project_files.updated_at    timestamptz
--   (no uniqueness constraint)    unique (project_id, path)
--
--   project_members          --   no equivalent table in this repo's schema
--   (sharing is team-based: projects.team_id + team_members, added by 0005)
--
--   profiles: already a superset of the target (extra username/plan/role
--   columns the current app never reads or writes) — no structural change.
--
-- This is exactly why "Could not find the 'owner_id' column of 'projects' in
-- the schema cache" happens: ProjectService.create() inserts
-- {name, description, template_id, owner_id, team_id, visibility} — a shape
-- that does not exist yet on this database.
--
-- SAFETY MODEL
--   - Every one of the 4 pre-existing tables is snapshotted verbatim into a
--     `_pre_0011_backup_<table>` table before anything touches it. Nothing
--     is dropped: `_pre_0011_backup_*` tables are left in place afterward
--     for you to diff against or drop yourself once you've verified the
--     result — this migration never drops them for you.
--   - `id`/`project_id` values that are not already valid UUID text are
--     remapped through a persisted mapping table
--     (`_pre_0011_project_id_map`), not discarded — old identifiers used in
--     your own external records/logs can still be looked up against it.
--   - project_files.name / .language / .is_folder / .parent_id are KEPT
--     (unused by current code, but not data this migration owns to delete).
--   - project_members is NOT touched, renamed, or dropped by this file at
--     all. There is no 1:1 target equivalent (Forge shares projects via a
--     team, not a per-project membership row) — see
--     0012_upgrade_legacy_database_post.sql, which runs AFTER 0001-0010
--     have created `teams`/`team_members`, for an OPTIONAL, reviewable way
--     to carry that data into the new model. Skip 0012 entirely and
--     project_members simply remains, untouched, as a historical table.
--   - Anything this migration cannot resolve safely (an orphaned
--     project_files row whose project_id matches no project; a duplicate
--     (project_id, path) pair that would violate the target's uniqueness
--     constraint) is reported with RAISE EXCEPTION and the full offending
--     rows, and the migration stops — it never silently drops or guesses.
--     Resolve what it reports, then re-run.
--
-- WHAT THIS FILE DELIBERATELY DOES NOT DO
--   - It does not enable RLS or create any policy on these tables — 0001
--     does that, and needs the columns this file produces to exist first.
--     Whatever RLS state these tables are in today is left exactly as
--     found, EXCEPT that every existing policy on profiles/projects/
--     project_files is dropped (by whatever name it has — see the DO block
--     below) so that 0001-0010's `create policy` statements (which assume
--     a clean slate) don't fail on a name collision, and so no policy
--     written against the OLD column names (`user_id`, `template`)
--     survives to silently no-op or error post-rename. This is a policy
--     REPLACEMENT, not a weakening: 0001-0010 lay down the full, current,
--     already-security-reviewed policy set on the very next statements you
--     run. Run 0011 and 0001-0010 back-to-back in one sitting so these
--     tables spend as little time as possible without their final policies.
--   - It does not create teams, team_members, project_tasks, connections,
--     or any other net-new table/function/trigger — those are exactly
--     what 0001-0010 already create (with `create table if not exists` /
--     `create or replace function`), and this repo's migrations are the
--     authoritative, tested source for that DDL. Duplicating it here would
--     just be a second, unreviewed copy that could drift from the real one.
--
-- ORDER OF OPERATIONS FOR YOUR SUPABASE PROJECT
--   1. Run this file (0011_upgrade_legacy_database_pre.sql).
--   2. Run 0001_init.sql through 0010_sql_studio_enforce_read_only.sql, in
--      order, exactly as committed in this repo.
--   3. Run 0012_upgrade_legacy_database_post.sql (its first statement — the
--      projects.team_id -> teams FK — is required; the project_members
--      synthesis in the rest of that file is optional, see its own header).
--   4. Verify Create Project in the running app.
--
-- ATOMICITY: this whole file runs as one transaction (BEGIN ... COMMIT
-- below). Confirmed by actually triggering one of the RAISE EXCEPTION
-- guards below against a real Postgres instance without this wrapper: the
-- script aborted, but every ALTER TABLE that had already run stayed
-- committed — `projects` was left with the new uuid `id` column but the
-- script never got to `project_files`, a genuinely broken intermediate
-- state, not a safe no-op. With the transaction wrapper, the same failure
-- rolls back completely and the database is exactly as it was before you
-- ran this file. Do not run this file's statements one-by-one outside a
-- transaction, and do not run it via a tool that auto-commits each
-- statement.
-- ============================================================================

begin;

do $$
begin
  raise notice '=== Row counts BEFORE upgrade ===';
  raise notice 'profiles: %', (select count(*) from profiles);
  raise notice 'projects: %', (select count(*) from projects);
  raise notice 'project_files: %', (select count(*) from project_files);
  raise notice 'project_members: %', (select count(*) from project_members);
end $$;

-- ---------------------------------------------------------------- backups
create table if not exists _pre_0011_backup_profiles as table profiles;
create table if not exists _pre_0011_backup_projects as table projects;
create table if not exists _pre_0011_backup_project_files as table project_files;
create table if not exists _pre_0011_backup_project_members as table project_members;

-- --------------------------------------------------- drop pre-existing
-- policies on the 3 tables this file restructures (by whatever name they
-- currently have), so 0001-0010's `create policy` statements apply
-- cleanly next and nothing old survives referencing a renamed column.
-- project_members is untouched by this migration, so its policies (if any)
-- are deliberately left alone.
do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where tablename in ('profiles', 'projects', 'project_files')
  loop
    execute format('drop policy %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    raise notice 'dropped pre-existing policy % on %', pol.policyname, pol.tablename;
  end loop;
end $$;

-- =====================================================================
-- profiles: already a superset of the target shape (id, display_name,
-- avatar_url, created_at, updated_at) — no column rename/retype needed.
-- The extra username/plan/role columns are simply not touched by any
-- current Forge code path; they are preserved as-is.
-- =====================================================================
do $$
begin
  if exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'display_name' and is_nullable = 'YES') then
    update profiles set display_name = '' where display_name is null;
    -- Only tighten to NOT NULL if that's actually safe now — never force a
    -- constraint that would itself fail against real data.
    if not exists (select 1 from profiles where display_name is null) then
      alter table profiles alter column display_name set not null;
      alter table profiles alter column display_name set default '';
    end if;
  end if;
end $$;

-- =====================================================================
-- projects
-- =====================================================================

-- A persisted map from every existing (however-shaped) projects.id to its
-- target uuid — built once, reused for both `projects.id` itself and every
-- table that references it (`project_files.project_id`), so relationships
-- survive identically whether the old id already happened to look like a
-- uuid or not. Left in the database afterward as an audit trail.
--
-- Crucially, when old_id is ALREADY valid UUID text, new_id is that exact
-- same value, not a freshly generated one — verified locally: an earlier
-- version of this migration always generated a fresh random uuid
-- regardless, which silently changed the id (and therefore the /projects/:id
-- URL) of every project whose id was already a real, working uuid, for no
-- reason. Only ids that genuinely cannot be a uuid (e.g. a nanoid-style
-- string) get remapped to a new one.
create or replace function _pre_0011_try_uuid(t text) returns uuid
language plpgsql immutable as $$
begin
  return t::uuid;
exception when others then
  return null;
end;
$$;

create table if not exists _pre_0011_project_id_map (
  old_id text primary key,
  new_id uuid not null
);

insert into _pre_0011_project_id_map (old_id, new_id)
select id, coalesce(_pre_0011_try_uuid(id), gen_random_uuid())
from projects
on conflict (old_id) do nothing;

drop function _pre_0011_try_uuid(text);

alter table projects add column if not exists _new_id uuid;
update projects p set _new_id = m.new_id from _pre_0011_project_id_map m where m.old_id = p.id;

-- Normalize data BEFORE the NOT NULL/CHECK constraints below are added, so
-- adding them can't fail against pre-existing rows — and so nothing is
-- silently rejected later without an explanation here.
do $$
declare
  bad_name_count int;
  bad_visibility_count int;
begin
  select count(*) into bad_name_count from projects where name is null or btrim(name) = '';
  if bad_name_count > 0 then
    update projects set name = 'Untitled Project' where name is null or btrim(name) = '';
    raise notice 'projects: % row(s) had a null/empty name, set to "Untitled Project"', bad_name_count;
  end if;

  select count(*) into bad_visibility_count from projects where visibility is null or visibility not in ('private', 'team', 'public');
  if bad_visibility_count > 0 then
    raise notice 'projects: % row(s) had a null or unrecognized visibility, defaulted to "private": %',
      bad_visibility_count,
      (select string_agg(format('id=%s visibility=%s', id, coalesce(visibility, 'NULL')), ', ') from projects where visibility is null or visibility not in ('private', 'team', 'public'));
    update projects set visibility = 'private' where visibility is null or visibility not in ('private', 'team', 'public');
  end if;
end $$;

alter table projects add column if not exists template_id text;
update projects set template_id = coalesce(nullif(btrim(template), ''), 'blank') where template_id is null;
alter table projects alter column template_id set not null;
alter table projects alter column template_id set default 'blank';

alter table projects add column if not exists owner_id uuid;
update projects set owner_id = user_id where owner_id is null;
alter table projects alter column owner_id set not null;

alter table projects add column if not exists team_id uuid;

alter table projects add column if not exists created_at timestamptz;
update projects set created_at = now() where created_at is null;
alter table projects alter column created_at set not null;
alter table projects alter column created_at set default now();

alter table projects add column if not exists updated_at timestamptz;
update projects set updated_at = coalesce(created_at, now()) where updated_at is null;
alter table projects alter column updated_at set not null;
alter table projects alter column updated_at set default now();

alter table projects alter column name set not null;
alter table projects alter column visibility set not null;
alter table projects alter column visibility set default 'private';

-- Swap the primary key column from the old text id to the new uuid one.
do $$
declare
  pk_name text;
begin
  select tc.constraint_name into pk_name
  from information_schema.table_constraints tc
  where tc.table_name = 'projects' and tc.constraint_type = 'PRIMARY KEY';
  if pk_name is not null then
    execute format('alter table projects drop constraint %I', pk_name);
  end if;
end $$;

alter table projects drop column id;
alter table projects rename column _new_id to id;
alter table projects add primary key (id);
alter table projects alter column id set default gen_random_uuid();

alter table projects drop column user_id;
alter table projects drop column template;

alter table projects add constraint projects_visibility_check check (visibility in ('private', 'team', 'public'));

-- The owner_id -> auth.users FK is safe to add now (auth.users always
-- exists). The team_id -> teams FK cannot be added yet: `teams` doesn't
-- exist until 0001 runs. That FK is added by
-- 0012_upgrade_legacy_database_post.sql's first statement instead, which
-- runs after 0001-0010.
alter table projects add constraint projects_owner_id_fkey foreign key (owner_id) references auth.users (id) on delete cascade;

create index if not exists projects_owner_idx on projects (owner_id);
create index if not exists projects_team_idx on projects (team_id);

-- =====================================================================
-- project_files
-- =====================================================================

-- Orphans first: a project_files row whose project_id matches no project
-- would silently vanish (or worse, error obscurely) once project_id
-- becomes a NOT NULL, FK-enforced uuid column. Reported, not deleted.
do $$
declare
  orphan_count int;
  orphan_list text;
begin
  -- Checked against the id map (not projects.id directly), because
  -- project_files.project_id still holds its ORIGINAL (pre-rename) values
  -- at this point — the map is the only thing that already relates old
  -- and new ids.
  select count(*), string_agg(format('id=%s project_id=%s path=%s', f.id, f.project_id, f.path), '; ')
    into orphan_count, orphan_list
    from project_files f
    where not exists (select 1 from _pre_0011_project_id_map m where m.old_id = f.project_id);

  if orphan_count > 0 then
    raise exception 'project_files: % row(s) reference a project_id with no matching project — resolve these manually (delete them, or fix their project_id) and re-run: %', orphan_count, orphan_list;
  end if;
end $$;

-- Duplicates second: the target schema's unique(project_id, path)
-- constraint would fail to apply if any already exist. Reported, not
-- deleted — you decide which one of a duplicate pair is the real one.
do $$
declare
  dup_count int;
  dup_list text;
begin
  select count(*), string_agg(format('project_id=%s path=%s (%s rows)', project_id, path, cnt), '; ')
    into dup_count, dup_list
    from (
      select project_id, path, count(*) as cnt
      from project_files
      group by project_id, path
      having count(*) > 1
    ) d;
  if dup_count > 0 then
    raise exception 'project_files: % (project_id, path) pair(s) are duplicated, which the target schema forbids — resolve these manually and re-run: %', dup_count, dup_list;
  end if;
end $$;

alter table project_files add column if not exists _new_id uuid default gen_random_uuid();
alter table project_files add column if not exists _new_project_id uuid;
update project_files f set _new_project_id = m.new_id from _pre_0011_project_id_map m where m.old_id = f.project_id;

alter table project_files add column if not exists kind text;
update project_files set kind = case when is_folder then 'directory' else 'file' end where kind is null;
alter table project_files alter column kind set not null;

-- Heads-up, not a hard stop: this migration assumes `path` already holds
-- the full, slash-joined relative path the app expects (e.g. "src/App.tsx")
-- rather than a bare filename reconstructed via `parent_id`. That has been
-- true of every schema this repo has shipped. If it is NOT true of your
-- data, files will still exist afterward but the editor's file tree may
-- show them flattened at the root — spot-check one nested file's `path`
-- value after this migration to confirm it reads as a full path.
do $$
declare
  suspect_count int;
begin
  select count(*) into suspect_count
  from project_files
  where parent_id is not null and position('/' in path) = 0 and kind = 'file';
  if suspect_count > 0 then
    raise notice 'project_files: % file row(s) have a parent_id but no "/" in path — verify these are not meant to be nested (see the comment above this block)', suspect_count;
  end if;
end $$;

alter table project_files add column if not exists updated_at timestamptz;
update project_files set updated_at = coalesce(created_at, now()) where updated_at is null;
alter table project_files alter column updated_at set not null;
alter table project_files alter column updated_at set default now();
alter table project_files alter column created_at set not null;
alter table project_files alter column created_at set default now();

do $$
declare
  pk_name text;
begin
  select tc.constraint_name into pk_name
  from information_schema.table_constraints tc
  where tc.table_name = 'project_files' and tc.constraint_type = 'PRIMARY KEY';
  if pk_name is not null then
    execute format('alter table project_files drop constraint %I', pk_name);
  end if;
end $$;

alter table project_files drop column id;
alter table project_files rename column _new_id to id;
alter table project_files add primary key (id);
alter table project_files alter column id set default gen_random_uuid();

alter table project_files drop column project_id;
alter table project_files rename column _new_project_id to project_id;
alter table project_files alter column project_id set not null;

alter table project_files alter column path set not null;
alter table project_files add constraint project_files_kind_check check (kind in ('file', 'directory'));
alter table project_files add constraint project_files_project_id_fkey foreign key (project_id) references projects (id) on delete cascade;
alter table project_files add constraint project_files_project_id_path_key unique (project_id, path);

create index if not exists project_files_project_idx on project_files (project_id);

do $$
begin
  raise notice '=== Row counts AFTER upgrade (must match BEFORE) ===';
  raise notice 'profiles: %', (select count(*) from profiles);
  raise notice 'projects: %', (select count(*) from projects);
  raise notice 'project_files: %', (select count(*) from project_files);
  raise notice 'project_members: % (untouched by this migration)', (select count(*) from project_members);
end $$;

commit;
