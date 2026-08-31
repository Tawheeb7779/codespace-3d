-- ============================================================================
-- Fixes a real, verified bug: creating a team is completely broken end to
-- end, on every path this repo ships (0001-0010 sequential, 0011->0012->
-- 0013, or 0013 alone).
--
-- TeamService.create() (src/services/TeamService.ts) inserts a `teams` row
-- (succeeds — the caller is its own owner_id, satisfying "owners manage
-- their team"), then inserts a `team_members` row for
-- {team_id, user_id: owner, role: 'owner'}. At that exact moment no
-- team_members row exists yet for this team, so team_role_of(team_id) — the
-- function every pre-existing team_members policy conditions on — returns
-- NULL for this caller. `NULL = 'owner'` and `NULL = 'admin'` are both not
-- true, and the one INSERT-capable policy that doesn't go through
-- team_role_of ("invited users can join via an accepted invitation")
-- requires a team_invitations row the creator obviously doesn't have
-- either. Every applicable policy rejects the insert, so a newly created
-- team can never get its first member: the creator's own team is
-- unusable, and every other team feature (invite, project sharing, member
-- management) is unreachable behind team_role_of()/is_team_member(),
-- neither of which a memberless team ever satisfies.
--
-- Verified against a real Postgres instance with 0001-0010 applied: the
-- exact insert TeamService.create() performs is rejected by RLS as the
-- team's own owner. No migration (0001, 0004, or 0013) has ever added a
-- bootstrap path or a trigger that auto-inserts the creator — this is a
-- missing policy, not a frontend bug. TeamService.create()'s two-step
-- insert is exactly what the intended semantics call for.
--
-- Fix: one narrowly-scoped INSERT policy that only ever lets a user insert
-- THEMSELVES, as 'owner', into a team they already own per `teams.owner_id`
-- (established independently, at team-creation time). It cannot be used to
-- add anyone else, set any other role, or touch an existing row (INSERT
-- only) — so it adds no privilege beyond "a team's owner may seat
-- themselves as its first member." Idempotent and safe to run on top of
-- any of this repo's prior migration paths.
-- ============================================================================

drop policy if exists "owners can bootstrap their own membership" on team_members;

create policy "owners can bootstrap their own membership" on team_members
  for insert to authenticated
  with check (
    role = 'owner'
    and user_id = auth.uid()
    and exists (select 1 from teams t where t.id = team_id and t.owner_id = auth.uid())
  );
