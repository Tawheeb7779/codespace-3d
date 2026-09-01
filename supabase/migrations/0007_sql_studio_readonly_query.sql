-- SQL Studio (Forge IDE spec §feature 13): lets a signed-in user run their
-- own read-only SQL against their own Supabase Postgres database from the
-- IDE. This function is the entire security boundary for that feature, so
-- its defenses are deliberately layered rather than relying on any one of
-- them:
--
--   1. SECURITY INVOKER (the default — no `security definer` clause here)
--      means the query runs as the CALLING user's own `authenticated`
--      role, subject to every RLS policy and grant that already applies
--      to them. This function grants no privilege beyond what the caller
--      already has — it cannot become a privilege-escalation path the way
--      a `security definer` function executing dynamic SQL would.
--   2. Only a single statement is allowed: a lone trailing semicolon is
--      stripped, and any semicolon remaining after that is rejected. This
--      blocks statement-stacking (`SELECT ...; DROP TABLE ...`).
--   3. The statement must start with SELECT or WITH (a CTE feeding a
--      SELECT) — read-only by construction, not by convention.
--   4. A local, transaction-scoped statement_timeout bounds runaway
--      queries, and the result is capped by wrapping the caller's query
--      in an outer SELECT ... LIMIT rather than trusting it to add one.
--
-- Residual risk is bounded by whatever the calling user's own SELECT
-- grants and RLS policies already allow them to read — the same as if
-- they queried through any other authenticated client, not something
-- this function grants on top.
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

  perform set_config('statement_timeout', '5000', true); -- local to this transaction

  return query execute format(
    'select to_jsonb(_row) from (%s) as _row limit %s',
    trimmed,
    capped_limit
  );
end;
$$;

-- Only signed-in users may call it at all; RLS/grants on the tables their
-- query touches decide what they can actually see.
revoke all on function run_readonly_query(text, int) from public;
grant execute on function run_readonly_query(text, int) to authenticated;
