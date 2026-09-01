-- ============================================================================
-- Run this AFTER 0011_upgrade_legacy_database_pre.sql AND 0001_init.sql
-- through 0010_sql_studio_enforce_read_only.sql have all been applied.
--
-- Part 1 (required): adds the projects.team_id -> teams(id) foreign key.
-- 0011 could not add it — `teams` didn't exist yet at that point — and
-- 0001's own `references teams (id)` clause only fires when CREATE TABLE
-- actually creates `projects`, which it didn't here (the table already
-- existed, so that whole statement no-opped). Without this, team_id is a
-- plain uuid column with no referential integrity at the database level;
-- the application and RLS trigger (0005's enforce_project_sharing_owner_only)
-- already prevent setting it to a non-team, but the FK closes the gap for
-- any future direct database access too.
--
-- Part 2 (OPTIONAL — read before running): the old `project_members` table
-- (per-project user + role, no team concept) has no equivalent in this
-- repo's schema, where sharing is team-based: a project has at most one
-- `team_id`, and access comes from `team_members` on that team. There is
-- no lossless, mechanical 1:1 translation between "N users individually
-- attached to one project" and "a project attached to one team" — doing it
-- at all is a real product decision, not a pure schema mapping. This part
-- makes that decision as safely as possible: for every project that has
-- `project_members` rows, it creates ONE NEW team named after the project,
-- makes the project's owner that team's owner, adds every project_member
-- as a team member with their role carried across, and attaches the
-- project to that team. Effects visible in the app: those users start
-- showing up in the Teams page, and see a new team named "<project name>
-- Team" they didn't create themselves.
--
-- `project_members` itself is never modified, renamed, or dropped by
-- this file — it remains exactly as it was, permanently, whether or not
-- you run Part 2.
--
-- Role mapping (old project_members.role -> team_role): the old role
-- vocabulary is unknown (this repo has never defined it), so common
-- synonyms are mapped to the closest equivalent and anything unrecognized
-- maps to the LEAST privileged role ('viewer') rather than guessing up —
-- review `_pre_0012_role_mapping_report` after running Part 2 and
-- `updateMemberRole` in the Teams page for anyone who needs a different
-- role than they were auto-assigned.
--
-- Part 2 is skippable: if you'd rather decide sharing manually per project
-- from the Teams page yourself, stop after Part 1 and never run Part 2 at
-- all — project_members will simply sit unused, unaffected, and undeleted.
--
-- Like 0011, this whole file runs as one transaction: if anything in Part 2
-- fails partway through, Part 1's FK addition rolls back with it rather
-- than being left applied on its own. Re-run the whole file after fixing
-- whatever caused the failure.
-- ============================================================================

begin;

-- ------------------------------------------------------------ Part 1
alter table projects add constraint projects_team_id_fkey foreign key (team_id) references teams (id) on delete set null;

-- ------------------------------------------------------------ Part 2
-- Comment out this entire DO block (or just don't run this file's Part 2)
-- to skip project_members migration entirely.
do $$
declare
  proj record;
  new_team_id uuid;
  member record;
  mapped_role team_role;
begin
  create table if not exists _pre_0012_role_mapping_report (
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
    join _pre_0011_backup_project_members pm on pm.project_id in (
      select old_id from _pre_0011_project_id_map where new_id = p.id
    )
  loop
    insert into teams (name, owner_id) values (proj.name || ' Team', proj.owner_id)
    returning id into new_team_id;

    insert into team_members (team_id, user_id, role) values (new_team_id, proj.owner_id, 'owner')
    on conflict do nothing;

    for member in
      select pm.user_id, pm.role
      from _pre_0011_backup_project_members pm
      where pm.project_id in (select old_id from _pre_0011_project_id_map where new_id = proj.id)
    loop
      if member.user_id = proj.owner_id then
        continue; -- already added as owner above
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

      insert into team_members (team_id, user_id, role) values (new_team_id, member.user_id, mapped_role)
      on conflict (team_id, user_id) do nothing;

      insert into _pre_0012_role_mapping_report (project_id, project_name, new_team_id, member_user_id, old_role, mapped_role)
      values (proj.id, proj.name, new_team_id, member.user_id, member.role, mapped_role);
    end loop;

    update projects set team_id = new_team_id, visibility = 'team' where id = proj.id;

    raise notice 'created team "% Team" (%) for project % from % legacy project_members row(s)',
      proj.name, new_team_id, proj.id,
      (select count(*) from _pre_0011_backup_project_members pm where pm.project_id in (select old_id from _pre_0011_project_id_map where new_id = proj.id));
  end loop;

  if not exists (select 1 from _pre_0012_role_mapping_report) then
    raise notice 'Part 2: no project_members rows found to migrate — nothing created.';
  else
    raise notice 'Part 2: see _pre_0012_role_mapping_report for exactly which user got which role on which new team.';
  end if;
end $$;

commit;
