-- SQL Studio hardening: make "read-only" an engine guarantee, not a regex.
--
-- Migration 0007 rejected anything not starting with SELECT/WITH and blocked
-- statement stacking, then wrapped the query as a subquery. That combination
-- turns out to stop the obvious data-modifying-CTE attack — but only by
-- accident (Postgres itself refuses `WITH ... (DELETE ...)` below the top
-- level), and it does NOT stop the simpler vector:
--
--     SELECT some_function_that_writes()
--
-- which is a single statement, starts with SELECT, and survives being
-- wrapped in a subquery. Reproduced against 0007 on Postgres 16: a plain
-- `SELECT sneaky_write()` where `sneaky_write()` does `DELETE FROM victim`
-- ran without error and emptied the table. In a real Supabase project the
-- same call reaches any function the caller can execute — including
-- `security definer` helpers, which is how a "read-only" console becomes a
-- way to run privileged code.
--
-- The fix is to stop reasoning about what the SQL text looks like and let
-- the server enforce the property we actually want. `transaction_read_only`
-- set locally makes the surrounding transaction reject every write —
-- INSERT/UPDATE/DELETE/DDL, whether written inline, hidden inside a
-- function body, or reached through a CTE — with
-- "cannot execute ... in a read-only transaction".
--
-- The textual checks from 0007 are kept as a fast, friendlier first pass
-- (a clear "only SELECT is allowed" beats a transaction-level error for the
-- common typo), but they are no longer the security boundary.
create or replace function run_readonly_query(query text, row_limit int default 500)
returns setof jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  trimmed text := btrim(query);
  capped_limit int := least(greatest(coalesce(row_limit, 500), 1), 500);
begin
  -- Strip exactly one trailing semicolon (and any trailing whitespace
  -- after it), then reject if another one remains anywhere.
  trimmed := regexp_replace(trimmed, ';\s*$', '');
  if position(';' in trimmed) > 0 then
    raise exception 'Only a single SQL statement is allowed.';
  end if;

  if trimmed = '' then
    raise exception 'Query is empty.';
  end if;

  if trimmed !~* '^(select|with)\M' then
    raise exception 'Only read-only SELECT (or WITH ... SELECT) queries are allowed.';
  end if;

  -- The actual boundary. Local to this transaction, so it neither leaks into
  -- the caller's session nor affects anything else on the connection.
  perform set_config('transaction_read_only', 'on', true);
  perform set_config('statement_timeout', '5000', true);

  return query execute format(
    'select to_jsonb(_row) from (%s) as _row limit %s',
    trimmed,
    capped_limit
  );
end;
$$;

revoke all on function run_readonly_query(text, int) from public;
grant execute on function run_readonly_query(text, int) to authenticated;
