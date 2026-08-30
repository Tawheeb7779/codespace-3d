-- Regression test for migration 0005: Teams <-> Projects integration.
-- Covers project sharing (attach/detach), the resulting access changes for
-- team roles, and that only the owner may control sharing.
-- Run after 00_local_test_setup.sql and migrations 0001-0005 — see README.md.

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'owner@example.com'),
  ('00000000-0000-0000-0000-000000000002', 'admin@example.com'),
  ('00000000-0000-0000-0000-000000000003', 'developer@example.com'),
  ('00000000-0000-0000-0000-000000000004', 'viewer@example.com'),
  ('00000000-0000-0000-0000-000000000005', 'outsider@example.com'),
  ('00000000-0000-0000-0000-000000000006', 'other-team-owner@example.com');

insert into teams (id, name, owner_id) values
  ('10000000-0000-0000-0000-000000000001', 'Acme', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002', 'Other Co', '00000000-0000-0000-0000-000000000006');

insert into team_members (team_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'owner'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'admin'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'developer'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'viewer'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000006', 'owner');

-- A private, solo project owned by the Acme owner.
insert into projects (id, name, owner_id, team_id, visibility) values
  ('20000000-0000-0000-0000-000000000001', 'Solo Project', '00000000-0000-0000-0000-000000000001', null, 'private');

create or replace procedure as_user(_user uuid) language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', _user::text, 'email', (select email from auth.users where id = _user))::text, true);
  set local role authenticated;
end;
$$;

create temporary table share_results (case_name text, expected text, actual text);
grant select, insert, update on share_results to authenticated;
grant select, insert, update, delete on projects, project_files to authenticated;

-- Presence (0003) reuses can_access_project(), so this same fixture proves
-- Phase 8: presence for a project follows team sharing with zero changes
-- to the presence policy itself.
insert into realtime.messages (topic, extension) values
  ('presence:project:20000000-0000-0000-0000-000000000001', 'presence');

create or replace function test_presence_visible(_user uuid, _topic text) returns boolean
language plpgsql as $$
declare visible boolean;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', _user::text, 'email', (select email from auth.users where id = _user))::text, true);
  perform set_config('realtime.topic', _topic, true);
  set local role authenticated;
  select exists(select 1 from realtime.messages where topic = _topic) into visible;
  reset role;
  return visible;
end;
$$;

-- 1) Owner attaches the project to their team — must succeed.
do $$ begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000001', 'email', 'owner@example.com')::text, true);
  set local role authenticated;
  update projects set team_id = '10000000-0000-0000-0000-000000000001', visibility = 'team' where id = '20000000-0000-0000-0000-000000000001';
  reset role;
  insert into share_results select 'owner can attach project to their team', '1',
    count(*)::text from projects where id = '20000000-0000-0000-0000-000000000001' and team_id = '10000000-0000-0000-0000-000000000001';
end $$;

-- 2) After attach: authorized team roles can read the project (owner/admin/developer/viewer).
do $$
declare u uuid; visible int; name_ text;
begin
  foreach u in array array[
    '00000000-0000-0000-0000-000000000001'::uuid, -- owner
    '00000000-0000-0000-0000-000000000002'::uuid, -- admin
    '00000000-0000-0000-0000-000000000003'::uuid, -- developer
    '00000000-0000-0000-0000-000000000004'::uuid  -- viewer
  ]
  loop
    select email into name_ from auth.users where id = u;
    perform set_config('request.jwt.claims', json_build_object('sub', u::text, 'email', name_)::text, true);
    set local role authenticated;
    select count(*) into visible from projects where id = '20000000-0000-0000-0000-000000000001';
    reset role;
    insert into share_results values ('team role (' || name_ || ') can read shared project', '1', visible::text);
    insert into share_results values ('team role (' || name_ || ') can access presence for shared project', 'true',
      test_presence_visible(u, 'presence:project:20000000-0000-0000-0000-000000000001')::text);
  end loop;
end $$;

insert into share_results select 'outsider cannot access presence for team project', 'false',
  test_presence_visible('00000000-0000-0000-0000-000000000005', 'presence:project:20000000-0000-0000-0000-000000000001')::text;

-- 3) Outsider (no relation to the team) cannot read the now-shared project, even knowing its UUID.
do $$ begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000005', 'email', 'outsider@example.com')::text, true);
  set local role authenticated;
  insert into share_results select 'outsider cannot read team project by UUID', '0',
    count(*)::text from projects where id = '20000000-0000-0000-0000-000000000001';
  reset role;
end $$;

-- 4) Unauthenticated (no JWT at all) cannot read it either.
do $$ begin
  perform set_config('request.jwt.claims', '', true);
  set local role authenticated;
  insert into share_results select 'unauthenticated cannot read team project', '0',
    count(*)::text from projects where id = '20000000-0000-0000-0000-000000000001';
  reset role;
end $$;

-- 5) Viewer can read project_files but cannot write them (can_edit_project excludes viewer).
do $$
declare blocked boolean := false;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000004', 'email', 'viewer@example.com')::text, true);
  set local role authenticated;
  begin
    insert into project_files (project_id, path, kind, content) values ('20000000-0000-0000-0000-000000000001', 'viewer.txt', 'file', 'nope');
    if not found then blocked := true; end if;
  exception when others then blocked := true; end;
  reset role;
  insert into share_results values ('viewer cannot write project files', 'true', blocked::text);
end $$;

-- 6) Developer CAN write project_files (can_edit_project includes developer).
do $$ begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000003', 'email', 'developer@example.com')::text, true);
  set local role authenticated;
  insert into project_files (project_id, path, kind, content) values ('20000000-0000-0000-0000-000000000001', 'dev.txt', 'file', 'ok');
  reset role;
  insert into share_results select 'developer can write project files', '1',
    count(*)::text from project_files where project_id = '20000000-0000-0000-0000-000000000001' and path = 'dev.txt';
end $$;

-- 7) Team admin CANNOT change team_id or visibility (would-be owner-level "manage sharing"),
--    even though admin already has UPDATE access to the row for ordinary columns.
do $$
declare blocked boolean := false;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000002', 'email', 'admin@example.com')::text, true);
  set local role authenticated;
  begin
    update projects set team_id = null where id = '20000000-0000-0000-0000-000000000001';
  exception when others then blocked := true; end;
  reset role;
  insert into share_results values ('team admin cannot detach project (sharing is owner-only)', 'true', blocked::text);
end $$;

-- 7b) ...but admin CAN still rename the project (ordinary column, unrelated to sharing).
do $$ begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000002', 'email', 'admin@example.com')::text, true);
  set local role authenticated;
  update projects set name = 'Renamed by admin' where id = '20000000-0000-0000-0000-000000000001';
  reset role;
  insert into share_results select 'admin can still rename the project', '1',
    count(*)::text from projects where id = '20000000-0000-0000-0000-000000000001' and name = 'Renamed by admin';
end $$;

-- 8) Owner cannot share the project with a team they are not a member of.
do $$
declare blocked boolean := false;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000001', 'email', 'owner@example.com')::text, true);
  set local role authenticated;
  begin
    update projects set team_id = '10000000-0000-0000-0000-000000000002' where id = '20000000-0000-0000-0000-000000000001';
  exception when others then blocked := true; end;
  reset role;
  insert into share_results values ('owner cannot share project with a team they are not in', 'true', blocked::text);
end $$;

-- 9) Owner detaches the project — team members lose access, owner keeps it.
do $$ begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000001', 'email', 'owner@example.com')::text, true);
  set local role authenticated;
  update projects set team_id = null, visibility = 'private' where id = '20000000-0000-0000-0000-000000000001';
  reset role;
  insert into share_results select 'detach: team_id cleared', '0',
    count(*)::text from projects where id = '20000000-0000-0000-0000-000000000001' and team_id is not null;
end $$;

do $$
declare v int;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000003', 'email', 'developer@example.com')::text, true);
  set local role authenticated;
  select count(*) into v from projects where id = '20000000-0000-0000-0000-000000000001';
  reset role;
  insert into share_results values ('after detach: former team developer loses access', '0', v::text);
end $$;

do $$
declare v int;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000001', 'email', 'owner@example.com')::text, true);
  set local role authenticated;
  select count(*) into v from projects where id = '20000000-0000-0000-0000-000000000001';
  reset role;
  insert into share_results values ('after detach: owner keeps access', '1', v::text);
end $$;

insert into share_results select 'after detach: former team developer loses presence access', 'false',
  test_presence_visible('00000000-0000-0000-0000-000000000003', 'presence:project:20000000-0000-0000-0000-000000000001')::text;
insert into share_results select 'after detach: owner keeps presence access', 'true',
  test_presence_visible('00000000-0000-0000-0000-000000000001', 'presence:project:20000000-0000-0000-0000-000000000001')::text;

-- 10) Team membership change: remove the developer from the team mid-way
--     through a fresh share, and confirm they lose access immediately.
do $$ begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000001', 'email', 'owner@example.com')::text, true);
  set local role authenticated;
  update projects set team_id = '10000000-0000-0000-0000-000000000001', visibility = 'team' where id = '20000000-0000-0000-0000-000000000001';
  reset role;
end $$;

do $$
declare v int;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000003', 'email', 'developer@example.com')::text, true);
  set local role authenticated;
  select count(*) into v from projects where id = '20000000-0000-0000-0000-000000000001';
  reset role;
  insert into share_results values ('re-shared: developer has access again', '1', v::text);
end $$;

delete from team_members where team_id = '10000000-0000-0000-0000-000000000001' and user_id = '00000000-0000-0000-0000-000000000003';

do $$
declare v int;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000003', 'email', 'developer@example.com')::text, true);
  set local role authenticated;
  select count(*) into v from projects where id = '20000000-0000-0000-0000-000000000001';
  reset role;
  insert into share_results values ('removed team member loses project access', '0', v::text);
end $$;

-- 11) INSERT-time check: a user cannot directly create a brand-new project
--     pre-attached to a team they aren't a member of (the same integrity
--     rule as #8, but for INSERT rather than UPDATE — a distinct code path
--     in the trigger, since OLD doesn't exist on insert).
do $$
declare blocked boolean := false;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000005', 'email', 'outsider@example.com')::text, true);
  set local role authenticated;
  begin
    insert into projects (id, name, owner_id, team_id, visibility) values
      ('20000000-0000-0000-0000-000000000099', 'Injected Project', '00000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'team');
  exception when others then blocked := true; end;
  reset role;
  insert into share_results values ('cannot insert a new project pre-attached to a foreign team', 'true', blocked::text);
end $$;

-- ...but a user CAN create a new project already attached to their own team.
do $$ begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000001', 'email', 'owner@example.com')::text, true);
  set local role authenticated;
  insert into projects (id, name, owner_id, team_id, visibility) values
    ('20000000-0000-0000-0000-000000000098', 'Born Shared', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'team');
  reset role;
  insert into share_results select 'can insert a new project pre-attached to your own team', '1',
    count(*)::text from projects where id = '20000000-0000-0000-0000-000000000098' and team_id = '10000000-0000-0000-0000-000000000001';
end $$;

select case_name, expected, actual, case when expected = actual then 'PASS' else 'FAIL' end as result
from share_results order by case_name;

do $$
declare failures int;
begin
  select count(*) into failures from share_results where expected != actual;
  if failures > 0 then
    raise exception '% project/team sharing test(s) failed', failures;
  end if;
  raise notice 'All project-team sharing tests passed.';
end
$$;
