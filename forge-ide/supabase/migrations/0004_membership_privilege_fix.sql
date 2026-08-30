-- 0001's "owners/admins manage membership" policy let anyone CURRENTLY
-- owner/admin write ANY row in team_members to ANY role, with no
-- restriction on which row or what role it's set to. Verified against a
-- real Postgres instance that this lets an 'admin':
--   1. Promote themselves straight to 'owner'
--   2. Delete the actual owner's membership row entirely
-- i.e. any admin can unilaterally take over the team. This is a real
-- privilege-escalation vulnerability, not a theoretical one.
--
-- Fix: an owner keeps full control (it's their team). An admin may only
-- add/edit/remove members whose role is 'developer' or 'viewer' — an admin
-- can never touch a row that is currently 'owner'/'admin', and can never
-- set a row's role to 'owner'/'admin' (so an admin can't promote anyone,
-- including themselves, into owner/admin territory, and can't demote or
-- remove another owner/admin).

drop policy "owners/admins manage membership" on team_members;

create policy "owners manage all membership" on team_members
  for all to authenticated
  using (team_role_of(team_id) = 'owner')
  with check (team_role_of(team_id) = 'owner');

create policy "admins manage ordinary members" on team_members
  for all to authenticated
  using (team_role_of(team_id) = 'admin' and role not in ('owner', 'admin'))
  with check (team_role_of(team_id) = 'admin' and role not in ('owner', 'admin'));

-- Same escalation, reachable through a side door: 0001 let any admin
-- create a team_invitations row with role='admin'. 0002's accept-insert
-- policy honors whatever role the accepted invitation names, regardless of
-- who created it — so an admin could invite an accomplice as 'admin' and
-- have them self-insert as admin on accept, working around the fix above
-- entirely. Same shape of fix: admins may only manage invitations for
-- 'developer'/'viewer'; only an owner may invite/manage an owner or admin.

drop policy "owners/admins manage invitations" on team_invitations;

create policy "owners manage all invitations" on team_invitations
  for all to authenticated
  using (team_role_of(team_id) = 'owner')
  with check (team_role_of(team_id) = 'owner');

create policy "admins manage ordinary invitations" on team_invitations
  for all to authenticated
  using (team_role_of(team_id) = 'admin' and role not in ('owner', 'admin'))
  with check (team_role_of(team_id) = 'admin' and role not in ('owner', 'admin'));
