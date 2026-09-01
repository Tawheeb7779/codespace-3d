-- Minimal local stand-ins for the parts of a real Supabase project our
-- migrations depend on (auth.*, realtime.*). This is NOT Supabase itself —
-- it exists only so the actual migration files (0001/0002/0003, unmodified)
-- can be applied and their RLS policies exercised against a real Postgres
-- engine. See README.md in this directory for what this does and doesn't
-- prove.

create extension if not exists pgcrypto;

create schema if not exists auth;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);

-- Supabase's own well-documented local-testing definitions: read the
-- current request's JWT claims from a session-local GUC.
create or replace function auth.uid() returns uuid
language sql stable
as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
$$;

create or replace function auth.jwt() returns jsonb
language sql stable
as $$
  select nullif(current_setting('request.jwt.claims', true), '')::jsonb
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end
$$;

grant usage on schema public to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;

create schema if not exists realtime;

-- Best-effort approximation of Supabase's realtime.messages table (real
-- column names — topic, extension — per Supabase's published Realtime
-- Authorization examples), for locally testing the policy in
-- 0003_realtime_presence_authorization.sql. Not the real Realtime engine.
create table realtime.messages (
  id bigserial primary key,
  topic text not null,
  extension text not null default 'presence'
);

create or replace function realtime.topic() returns text
language sql stable
as $$ select current_setting('realtime.topic', true) $$;

grant usage on schema realtime to authenticated;
grant select on realtime.messages to authenticated;
