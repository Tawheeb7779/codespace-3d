-- Real-time presence (src/features/collaboration/usePresence.ts) subscribes
-- to a channel named `presence:project:<projectId>`. Until now that channel
-- was a plain (non-private) Supabase Realtime channel: any authenticated
-- client that knew or guessed a project's UUID could subscribe to it and see
-- who else is active, regardless of whether they can actually access that
-- project. The UUID isn't a real secret — this is a genuine authorization
-- gap, not something obscurity was ever meant to cover.
--
-- Fix: Supabase Realtime Authorization. The client now opens this channel
-- with `{ config: { private: true } }`, which makes Supabase check Row
-- Level Security on `realtime.messages` before allowing the subscription —
-- the same enforcement mechanism already used for every other table here,
-- reusing the exact `can_access_project()` predicate from 0001 (ownership,
-- team membership, or public visibility) so presence can never be more
-- permissive than the project data it describes.
--
-- NOTE ON VERIFICATION: this follows Supabase's documented Realtime
-- Authorization pattern (RLS on `realtime.messages`, `extension = 'presence'`,
-- `realtime.topic()`), but has not been exercised against a live Supabase
-- project — this repo's sandbox cannot reach Supabase's network. The
-- underlying access predicate (`can_access_project`) is exercised by a real,
-- executed local-Postgres test suite (see supabase/tests/); the
-- Realtime-specific plumbing (`realtime.messages`, `realtime.topic()`) is
-- Supabase's own infrastructure and should be smoke-tested once this
-- project is connected to a real Supabase instance (subscribe as an
-- unauthorized user to a private project's presence channel and confirm
-- the subscription is refused).

alter table realtime.messages enable row level security;

create policy "presence access follows project access"
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension = 'presence'
    and realtime.topic() ~ '^presence:project:[0-9a-fA-F-]{36}$'
    and can_access_project(substring(realtime.topic() from 'presence:project:(.+)$')::uuid)
  );
