-- Fixes a real gap in 0001: an invited user has no team_members row yet, so
-- the existing "owners/admins manage membership"/"owners/admins manage
-- invitations" policies (which require team_role_of() to already return
-- 'owner'/'admin') silently reject the invitee's own accept/decline —
-- TeamService.respondToInvitation would fail with an RLS violation for
-- anyone who isn't already an owner/admin of the team they're joining.
--
-- These are additive policies (permissive, OR-combined with the existing
-- ones per Postgres RLS semantics) — they grant nothing beyond letting an
-- invitee act on their own invitation by email, and self-insert into
-- team_members only once that invitation is accepted and only with the
-- exact role it specifies. No existing policy is changed or weakened.

create policy "invitees can respond to their own invitation" on team_invitations
  for update to authenticated
  using (email = auth.jwt() ->> 'email' and status = 'pending')
  with check (email = auth.jwt() ->> 'email' and status in ('accepted', 'declined'));

create policy "invited users can join via an accepted invitation" on team_members
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from team_invitations i
      where i.team_id = team_members.team_id
        and i.email = auth.jwt() ->> 'email'
        and i.status = 'accepted'
        and i.role = team_members.role
    )
  );

-- The UPDATE policy above only constrains `status`, `email`, and old status
-- being 'pending' — nothing stops an invitee from also smuggling a changed
-- `role` or `team_id` into the same statement (RLS has no built-in way to
-- pin other columns to their pre-update values). Since team_members' own
-- insert policy trusts team_invitations.role/team_id, that gap would let an
-- invitee grant themselves 'owner' on an arbitrary team. This trigger closes
-- it regardless of which policy let the UPDATE through: anyone who isn't
-- already an owner/admin of the team may only flip a pending invitation's
-- own status to accepted/declined — every other column, and every other
-- transition, is rejected.
create or replace function enforce_invitation_response_columns()
returns trigger language plpgsql as $$
begin
  if team_role_of(new.team_id) in ('owner', 'admin') then
    return new;
  end if;
  if old.team_id <> new.team_id
     or old.email <> new.email
     or old.role <> new.role
     or old.invited_by <> new.invited_by
     or old.created_at <> new.created_at
     or old.status <> 'pending'
     or new.status not in ('accepted', 'declined') then
    raise exception 'Cannot modify this invitation.';
  end if;
  return new;
end;
$$;

create trigger team_invitations_guard_response
  before update on team_invitations
  for each row execute function enforce_invitation_response_columns();
