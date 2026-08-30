-- Regression test for migration 0004: closes a real privilege-escalation
-- vulnerability in 0001's team_members/team_invitations policies (verified
-- against a live Postgres instance before the fix: an admin could promote
-- themselves to owner, delete the real owner, or invite an accomplice as
-- admin/owner). Run after 00_local_test_setup.sql and migrations 0001-0004
-- — see README.md.

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'owner@example.com'),
  ('00000000-0000-0000-0000-000000000002', 'admin@example.com'),
  ('00000000-0000-0000-0000-000000000003', 'developer@example.com');

insert into teams (id, name, owner_id) values
  ('10000000-0000-0000-0000-000000000001', 'Acme', '00000000-0000-0000-0000-000000000001');

insert into team_members (team_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'owner'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'admin'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'developer');

create or replace procedure as_user(_user uuid) language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', _user::text, 'email', (select email from auth.users where id = _user))::text, true);
  set local role authenticated;
end;
$$;

create temporary table priv_results (case_name text, expected text, actual text);
grant insert, select, update, delete on priv_results to authenticated;
grant select, insert, update, delete on team_members, team_invitations to authenticated;

-- 1) Admin cannot self-promote to owner.
do $$
declare blocked boolean := false; begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000002', 'email', 'admin@example.com')::text, true);
  set local role authenticated;
  begin
    update team_members set role = 'owner' where team_id = '10000000-0000-0000-0000-000000000001' and user_id = '00000000-0000-0000-0000-000000000002';
    if not found then blocked := true; end if;
  exception when others then blocked := true; end;
  reset role;
  insert into priv_results values ('admin cannot self-promote to owner', 'true', blocked::text);
end $$;

-- 2) Admin cannot delete the real owner's membership row.
do $$
declare blocked boolean := false; begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000002', 'email', 'admin@example.com')::text, true);
  set local role authenticated;
  begin
    delete from team_members where team_id = '10000000-0000-0000-0000-000000000001' and user_id = '00000000-0000-0000-0000-000000000001';
    if not found then blocked := true; end if;
  exception when others then blocked := true; end;
  reset role;
  insert into priv_results values ('admin cannot remove the owner', 'true', blocked::text);
end $$;

-- 3) Admin cannot promote a developer to admin.
do $$
declare blocked boolean := false; begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000002', 'email', 'admin@example.com')::text, true);
  set local role authenticated;
  begin
    update team_members set role = 'admin' where team_id = '10000000-0000-0000-0000-000000000001' and user_id = '00000000-0000-0000-0000-000000000003';
    if not found then blocked := true; end if;
  exception when others then blocked := true; end;
  reset role;
  insert into priv_results values ('admin cannot promote a developer to admin', 'true', blocked::text);
end $$;

-- 4) Admin CAN still manage an ordinary member (developer -> viewer).
do $$ begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000002', 'email', 'admin@example.com')::text, true);
  set local role authenticated;
  update team_members set role = 'viewer' where team_id = '10000000-0000-0000-0000-000000000001' and user_id = '00000000-0000-0000-0000-000000000003';
  reset role;
  insert into priv_results select 'admin can still change an ordinary member''s role', '1',
    count(*)::text from team_members where user_id = '00000000-0000-0000-0000-000000000003' and role = 'viewer';
end $$;

-- 5) Admin cannot create an 'admin'-role invitation (the side-channel).
do $$
declare blocked boolean := false; begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000002', 'email', 'admin@example.com')::text, true);
  set local role authenticated;
  begin
    insert into team_invitations (team_id, email, role, invited_by) values
      ('10000000-0000-0000-0000-000000000001', 'accomplice@example.com', 'admin', '00000000-0000-0000-0000-000000000002');
  exception when others then blocked := true; end;
  reset role;
  insert into priv_results values ('admin cannot invite someone as admin', 'true', blocked::text);
end $$;

-- 6) Admin CAN still create an ordinary invitation.
do $$
declare blocked boolean := false; begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000002', 'email', 'admin@example.com')::text, true);
  set local role authenticated;
  begin
    insert into team_invitations (team_id, email, role, invited_by) values
      ('10000000-0000-0000-0000-000000000001', 'newdev@example.com', 'developer', '00000000-0000-0000-0000-000000000002');
  exception when others then blocked := true; end;
  reset role;
  insert into priv_results values ('admin can still invite an ordinary member', 'false', blocked::text);
end $$;

-- 7) Owner CAN still promote a member to admin directly.
do $$ begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000001', 'email', 'owner@example.com')::text, true);
  set local role authenticated;
  update team_members set role = 'admin' where team_id = '10000000-0000-0000-0000-000000000001' and user_id = '00000000-0000-0000-0000-000000000003';
  reset role;
  insert into priv_results select 'owner can still promote a member to admin', '1',
    count(*)::text from team_members where user_id = '00000000-0000-0000-0000-000000000003' and role = 'admin';
end $$;

-- 8) Owner CAN still create an 'admin'-role invitation.
do $$ begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000001', 'email', 'owner@example.com')::text, true);
  set local role authenticated;
  insert into team_invitations (team_id, email, role, invited_by) values
    ('10000000-0000-0000-0000-000000000001', 'trusted@example.com', 'admin', '00000000-0000-0000-0000-000000000001');
  reset role;
  insert into priv_results select 'owner can still invite someone as admin', '1',
    count(*)::text from team_invitations where email = 'trusted@example.com' and role = 'admin';
end $$;

select case_name, expected, actual, case when expected = actual then 'PASS' else 'FAIL' end as result
from priv_results order by case_name;

do $$
declare failures int;
begin
  select count(*) into failures from priv_results where expected != actual;
  if failures > 0 then
    raise exception '% membership-privilege test(s) failed', failures;
  end if;
  raise notice 'All membership privilege tests passed.';
end
$$;
