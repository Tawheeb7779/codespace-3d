-- Teams <-> Projects integration.
--
-- 0001 already modeled this relationship fully: projects.team_id and
-- projects.visibility exist, and can_access_project()/can_edit_project() —
-- used everywhere a project or its files are read or written, including
-- Realtime presence authorization (0003) — already gate access by team
-- membership when team_id is set. Nothing about read/write access needed
-- to change. What was actually missing was a UI path to set team_id at
-- all, and a real gap in *who* is allowed to set it:
--
-- "team editors update team projects" (0001) lets any team admin or
-- developer UPDATE the whole `projects` row, with no column restriction —
-- including team_id and visibility. That means an admin or developer could
-- already reassign a shared project to a different team, or flip it
-- public, unilaterally. Sharing/unsharing a project should be the owner's
-- call, the same way only a team owner controls the admin/owner roster
-- (0004) — an admin does not get owner-level authority just by having
-- write access to project files.
--
-- Fix: a trigger (same column-pinning pattern as 0002's team_invitations
-- guard) that lets only the project owner change team_id/visibility on an
-- existing project, and only onto a team they are themselves a member of.
-- Every other column (name, description, ...) stays governed by the
-- existing policies, unrestricted by this trigger.
--
-- The "must be a member of the team you're sharing into" rule has to be
-- checked on INSERT too, not just UPDATE: "owners manage their projects"
-- only ever required owner_id = auth.uid() at creation, with no check on
-- team_id at all — so without this, any authenticated user could directly
-- insert a brand-new project with team_id set to a team they don't belong
-- to, injecting it into that team's shared project list for every member
-- to see, without the team's cooperation. Ownership itself needs no extra
-- check at INSERT time (the existing "owners manage their projects" policy
-- already guarantees new.owner_id = auth.uid() or the insert fails).

-- security definer (with a pinned search_path, since it runs with elevated
-- privilege): a plain invoker-rights trigger body calling auth.uid()
-- directly needs schema-level privilege on `auth` that `authenticated`
-- doesn't have — which is exactly why 0002's trigger went through
-- team_role_of() (itself security definer) instead of auth.uid() directly.
create or replace function enforce_project_sharing_owner_only()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  -- A null auth.uid() means there's no end-user request at all (a
  -- service-role/superuser context — migrations, admin scripts, seeding) —
  -- that context already bypasses every RLS policy in this schema by
  -- design, so this trigger defers to it too rather than rejecting
  -- legitimate administrative writes that were never reachable by an
  -- ordinary authenticated user anyway.
  if auth.uid() is null then
    return new;
  end if;

  if TG_OP = 'UPDATE' then
    -- team_id/visibility are the only columns this trigger cares about;
    -- untouched, there's nothing to check (mirrors 0002's guard). team_id
    -- can be null, so this needs null-safe equality, not plain `=`.
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

  -- A project isn't meaningfully "team" visibility once detached; 'public'
  -- is a separate, explicit choice and is left alone.
  if new.team_id is null and new.visibility = 'team' then
    new.visibility := 'private';
  end if;

  return new;
end;
$$;

create trigger projects_guard_sharing
  before insert or update on projects
  for each row execute function enforce_project_sharing_owner_only();
