-- Regression test for migration 0010: SQL Studio's run_readonly_query must
-- be read-only in fact, not just by the shape of the submitted SQL.
--
-- Verified against a live Postgres 16 instance BEFORE the fix: with only
-- 0007 applied, `SELECT sneaky_write()` — a single statement, starting with
-- SELECT, surviving the subquery wrapper — ran without error and emptied the
-- target table through a function the UI presents as read-only. In a real
-- project the same call reaches any function the caller may execute,
-- including `security definer` ones.
--
-- Run after 00_local_test_setup.sql and migrations 0001-0010 — see README.md.

create table if not exists rq_victim (id int primary key, note text);
truncate rq_victim;
insert into rq_victim values (1, 'original'), (2, 'original');

-- An ordinary write-performing function, the kind real projects are full of.
create or replace function rq_sneaky_write() returns int language plpgsql as $$
begin
  delete from rq_victim;
  return 42;
end;
$$;

do $t$
declare
  blocked boolean;
  remaining int;
  rows_read int;
begin
  ---------------------------------------------------------------- vector 1
  -- A write hidden inside a function called from a plain SELECT.
  blocked := false;
  begin
    perform * from run_readonly_query('SELECT rq_sneaky_write() AS x');
  exception when others then
    blocked := true;
  end;
  if not blocked then
    raise exception 'FAIL: SELECT rq_sneaky_write() was allowed to run';
  end if;

  select count(*) into remaining from rq_victim;
  if remaining <> 2 then
    raise exception 'FAIL: read-only query deleted rows (% left, expected 2)', remaining;
  end if;

  ---------------------------------------------------------------- vector 2
  -- A data-modifying CTE.
  blocked := false;
  begin
    perform * from run_readonly_query('WITH g AS (DELETE FROM rq_victim RETURNING *) SELECT * FROM g');
  exception when others then
    blocked := true;
  end;
  if not blocked then
    raise exception 'FAIL: data-modifying CTE was allowed to run';
  end if;

  select count(*) into remaining from rq_victim;
  if remaining <> 2 then
    raise exception 'FAIL: CTE deleted rows (% left, expected 2)', remaining;
  end if;

  ---------------------------------------------------------- controls (reads)
  -- The fix must not break the feature it protects.
  select count(*) into rows_read from run_readonly_query('SELECT 1 AS ok');
  if rows_read <> 1 then
    raise exception 'FAIL: plain SELECT returned % rows, expected 1', rows_read;
  end if;

  select count(*) into rows_read from run_readonly_query('SELECT * FROM rq_victim');
  if rows_read <> 2 then
    raise exception 'FAIL: table SELECT returned % rows, expected 2', rows_read;
  end if;

  select count(*) into rows_read from run_readonly_query('WITH t AS (SELECT * FROM rq_victim) SELECT * FROM t');
  if rows_read <> 2 then
    raise exception 'FAIL: read-only CTE returned % rows, expected 2', rows_read;
  end if;

  raise notice 'PASS: writes blocked at the transaction level, reads unaffected';
end;
$t$;

drop function rq_sneaky_write();
drop table rq_victim;
