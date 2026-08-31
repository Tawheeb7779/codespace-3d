-- Regression test for migration 0002: an invitee must be able to accept
-- their own invitation, but must not be able to use that same statement to
-- smuggle a different role or team_id, and a user with no invitation at all
-- must not be able to self-insert into team_members.
-- Run after 00_local_test_setup.sql and migrations 0001-0003 — see README.md.

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'owner@example.com'),
  ('00000000-0000-0000-0000-000000000005', 'outsider@example.com'),
  ('00000000-0000-0000-0000-000000000006', 'invitee@example.com'),
  ('00000000-0000-0000-0000-000000000007', 'escalator@example.com');

insert into teams (id, name, owner_id) values
  ('10000000-0000-0000-0000-000000000001', 'Acme', '00000000-0000-0000-0000-000000000001'),
  -- A second, real team the escalator has no relationship to — used below to
  -- prove the trigger itself blocks a team_id redirect, not an incidental
  -- foreign-key violation from pointing at a nonexistent id.
  ('10000000-0000-0000-0000-000000000099', 'Other Co', '00000000-0000-0000-0000-000000000005');

insert into team_members (team_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'owner');

insert into team_invitations (id, team_id, email, role, invited_by, status) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'invitee@example.com', 'admin', '00000000-0000-0000-0000-000000000001', 'pending'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'escalator@example.com', 'viewer', '00000000-0000-0000-0000-000000000001', 'pending');

create or replace procedure as_user(_user uuid) language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', _user::text, 'email', (select email from auth.users where id = _user))::text, true);
  set local role authenticated;
end;
$$;

create temporary table esc_results (case_name text, expected text, actual text);
grant insert, select on esc_results to authenticated;
grant select on team_invitations, team_members, teams to authenticated;

-- 1) Invitee accepts their own invitation exactly as invited (role=admin) — must succeed.
begin;
  call as_user('00000000-0000-0000-0000-000000000006'); -- invitee@example.com
  update team_invitations set status = 'accepted' where id = '30000000-0000-0000-0000-000000000001';
  insert into esc_results values ('invitee can accept their own invitation', '1',
    (select count(*)::text from team_invitations where id = '30000000-0000-0000-0000-000000000001' and status = 'accepted'));
commit;

begin;
  call as_user('00000000-0000-0000-0000-000000000006');
  insert into team_members (team_id, user_id, role) values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000006', 'admin');
  insert into esc_results values ('invitee can join with the exact invited role', '1',
    (select count(*)::text from team_members where user_id = '00000000-0000-0000-0000-000000000006' and role = 'admin'));
commit;

-- 2) Escalator tries to accept-and-escalate to 'owner' in one statement — must fail.
do $$
declare
  blocked boolean := false;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000007', 'email', 'escalator@example.com')::text, true);
  set local role authenticated;
  begin
    update team_invitations set status = 'accepted', role = 'owner' where id = '30000000-0000-0000-0000-000000000002';
  exception when others then
    blocked := true;
  end;
  reset role;
  insert into esc_results values ('invitee cannot escalate role during accept', 'true', blocked::text);
end
$$;

-- 3) Escalator tries to redirect the same invitation to a different (real) team — must fail.
do $$
declare
  blocked boolean := false;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000007', 'email', 'escalator@example.com')::text, true);
  set local role authenticated;
  begin
    update team_invitations set status = 'accepted', team_id = '10000000-0000-0000-0000-000000000099' where id = '30000000-0000-0000-0000-000000000002';
  exception when others then
    blocked := true;
  end;
  reset role;
  insert into esc_results values ('invitee cannot redirect invitation to another team', 'true', blocked::text);
end
$$;

-- 4) A random outsider with no invitation at all tries to self-insert into team_members — must fail.
do $$
declare
  blocked boolean := false;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000005', 'email', 'outsider@example.com')::text, true);
  set local role authenticated;
  begin
    insert into team_members (team_id, user_id, role) values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000005', 'owner');
  exception when others then
    blocked := true;
  end;
  reset role;
  insert into esc_results values ('outsider with no invitation cannot self-insert into team_members', 'true', blocked::text);
end
$$;

select case_name, expected, actual, case when expected = actual then 'PASS' else 'FAIL' end as result
from esc_results order by case_name;

do $$
declare
  failures int;
begin
  select count(*) into failures from esc_results where expected != actual;
  if failures > 0 then
    raise exception '% invitation/escalation test(s) failed', failures;
  end if;
  raise notice 'All invitation-acceptance / role-escalation tests passed.';
end
$$;
