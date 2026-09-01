-- Verifies migration 0003: presence access for a project must follow the
-- exact same access rules as the project's own data (can_access_project).
-- Run after 00_local_test_setup.sql and migrations 0001-0003 — see README.md.

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'owner@example.com'),
  ('00000000-0000-0000-0000-000000000002', 'admin@example.com'),
  ('00000000-0000-0000-0000-000000000003', 'developer@example.com'),
  ('00000000-0000-0000-0000-000000000004', 'viewer@example.com'),
  ('00000000-0000-0000-0000-000000000005', 'outsider@example.com');

insert into teams (id, name, owner_id) values
  ('10000000-0000-0000-0000-000000000001', 'Acme', '00000000-0000-0000-0000-000000000001');

insert into team_members (team_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'owner'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'admin'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'developer'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'viewer');

insert into projects (id, name, owner_id, team_id, visibility) values
  ('20000000-0000-0000-0000-000000000001', 'Private Solo Project', '00000000-0000-0000-0000-000000000001', null, 'private'),
  ('20000000-0000-0000-0000-000000000002', 'Team Project', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'team'),
  ('20000000-0000-0000-0000-000000000003', 'Public Project', '00000000-0000-0000-0000-000000000001', null, 'public');

insert into realtime.messages (topic, extension) values
  ('presence:project:20000000-0000-0000-0000-000000000001', 'presence'),
  ('presence:project:20000000-0000-0000-0000-000000000002', 'presence'),
  ('presence:project:20000000-0000-0000-0000-000000000003', 'presence');

create or replace function test_presence_visible(_user uuid, _topic text) returns boolean
language plpgsql as $$
declare
  visible boolean;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', _user::text, 'email', (select email from auth.users where id = _user))::text, true);
  perform set_config('realtime.topic', _topic, true);
  set local role authenticated;
  select exists(select 1 from realtime.messages where topic = _topic) into visible;
  reset role;
  return visible;
end;
$$;

create temporary table results (case_name text, expected boolean, actual boolean);

-- Private project (owner-only, no team)
insert into results select 'private: owner can access presence', true,
  test_presence_visible('00000000-0000-0000-0000-000000000001', 'presence:project:20000000-0000-0000-0000-000000000001');
insert into results select 'private: outsider cannot access presence', false,
  test_presence_visible('00000000-0000-0000-0000-000000000005', 'presence:project:20000000-0000-0000-0000-000000000001');
insert into results select 'private: user from an unrelated team cannot access presence', false,
  test_presence_visible('00000000-0000-0000-0000-000000000004', 'presence:project:20000000-0000-0000-0000-000000000001');

-- Team project (owner + admin + developer + viewer, all on the owning team)
insert into results select 'team: owner can access presence', true,
  test_presence_visible('00000000-0000-0000-0000-000000000001', 'presence:project:20000000-0000-0000-0000-000000000002');
insert into results select 'team: authorized team member (admin) can access presence', true,
  test_presence_visible('00000000-0000-0000-0000-000000000002', 'presence:project:20000000-0000-0000-0000-000000000002');
insert into results select 'team: authorized team member (developer) can access presence', true,
  test_presence_visible('00000000-0000-0000-0000-000000000003', 'presence:project:20000000-0000-0000-0000-000000000002');
insert into results select 'team: viewer can access presence per read permissions', true,
  test_presence_visible('00000000-0000-0000-0000-000000000004', 'presence:project:20000000-0000-0000-0000-000000000002');
insert into results select 'team: outsider cannot access presence', false,
  test_presence_visible('00000000-0000-0000-0000-000000000005', 'presence:project:20000000-0000-0000-0000-000000000002');

-- Public project
insert into results select 'public: unrelated authenticated user can access presence', true,
  test_presence_visible('00000000-0000-0000-0000-000000000005', 'presence:project:20000000-0000-0000-0000-000000000003');

-- Malformed topic must not error and must not leak anything (also exercises
-- that the policy's substring/cast can't be abused as an injection vector)
insert into results select 'malformed topic yields no access, no error', false,
  test_presence_visible('00000000-0000-0000-0000-000000000001', 'presence:project:not-a-uuid; drop table teams;--');

select case_name, expected, actual, case when expected = actual then 'PASS' else 'FAIL' end as result
from results order by case_name;

do $$
declare
  failures int;
begin
  select count(*) into failures from results where expected != actual;
  if failures > 0 then
    raise exception '% presence authorization test(s) failed', failures;
  end if;
  raise notice 'All presence authorization tests passed.';
end
$$;
