-- Regression test for migration 0014: closes a real bug where creating a
-- team was completely broken end to end (RLS rejected the creator's own
-- first team_members insert, since team_role_of() returns NULL before any
-- membership row exists — see 0014's header for the full trace). Run after
-- 00_local_test_setup.sql and migrations 0001-0005, 0014 — see README.md.

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'alice@example.com'),
  ('00000000-0000-0000-0000-000000000002', 'bob@example.com');

insert into teams (id, name, owner_id) values
  ('20000000-0000-0000-0000-000000000001', 'Alice Team', '00000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', 'Bob Team', '00000000-0000-0000-0000-000000000002');

create temporary table bootstrap_results (case_name text, expected text, actual text);
grant insert, select on bootstrap_results to authenticated;
grant select, insert on team_members to authenticated;

-- 1) A team's owner CAN insert themselves as its first ('owner') member —
--    the exact insert TeamService.create() performs.
do $$
declare ok boolean := false; begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000001', 'email', 'alice@example.com')::text, true);
  set local role authenticated;
  begin
    insert into team_members (team_id, user_id, role) values
      ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'owner');
    ok := true;
  exception when others then ok := false; end;
  reset role;
  insert into bootstrap_results values ('owner can bootstrap their own team membership', 'true', ok::text);
end $$;

-- 2) A DIFFERENT user cannot use this policy to seat themselves into a
--    team they don't own.
do $$
declare blocked boolean := false; begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000002', 'email', 'bob@example.com')::text, true);
  set local role authenticated;
  begin
    insert into team_members (team_id, user_id, role) values
      ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'owner');
  exception when others then blocked := true; end;
  reset role;
  insert into bootstrap_results values ('non-owner cannot bootstrap membership into someone else''s team', 'true', blocked::text);
end $$;

-- 3) The team's own owner cannot use THIS policy to seat someone else in
--    (still gated on user_id = auth.uid()) — a second, unrelated owner
--    bootstrapping their own, separate team must still work independently.
do $$
declare ok boolean := false; begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000002', 'email', 'bob@example.com')::text, true);
  set local role authenticated;
  begin
    insert into team_members (team_id, user_id, role) values
      ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'owner');
    ok := true;
  exception when others then ok := false; end;
  reset role;
  insert into bootstrap_results values ('a second, unrelated owner can independently bootstrap their own team', 'true', ok::text);
end $$;

-- 4) A user with no team of their own cannot use this policy to seat
--    themselves into someone else's team with a non-owner role either.
do $$
declare blocked boolean := false; begin
  insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000003', 'carol@example.com') on conflict do nothing;
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000003', 'email', 'carol@example.com')::text, true);
  set local role authenticated;
  begin
    insert into team_members (team_id, user_id, role) values
      ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'admin');
  exception when others then blocked := true; end;
  reset role;
  insert into bootstrap_results values ('non-owner cannot self-insert with a non-owner role either', 'true', blocked::text);
end $$;

select case_name, expected, actual, case when expected = actual then 'PASS' else 'FAIL' end as result
from bootstrap_results order by case_name;

do $$
declare failures int;
begin
  select count(*) into failures from bootstrap_results where expected != actual;
  if failures > 0 then
    raise exception '% team-bootstrap-membership test(s) failed', failures;
  end if;
  raise notice 'All team bootstrap membership tests passed.';
end
$$;
