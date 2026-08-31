# RLS tests

These are real, executable SQL tests for the Row Level Security policies in
`supabase/migrations/`. They run against a plain local Postgres instance —
no Supabase CLI or Docker required — and were used to verify the presence
authorization fix and the team-invitation RLS policies for real, not just
by reading the SQL.

## Running them

```bash
createdb forge_rls_test
psql -d forge_rls_test -v ON_ERROR_STOP=1 -f supabase/tests/00_local_test_setup.sql
psql -d forge_rls_test -v ON_ERROR_STOP=1 -f ../migrations/0001_init.sql   # one expected error, see below
psql -d forge_rls_test -v ON_ERROR_STOP=1 -f ../migrations/0002_invitation_accept.sql
psql -d forge_rls_test -v ON_ERROR_STOP=1 -f ../migrations/0003_realtime_presence_authorization.sql
psql -d forge_rls_test -v ON_ERROR_STOP=1 -f ../migrations/0004_membership_privilege_fix.sql
psql -d forge_rls_test -v ON_ERROR_STOP=1 -f ../migrations/0005_project_team_sharing.sql
psql -d forge_rls_test -v ON_ERROR_STOP=1 -f 01_presence_authorization.test.sql
psql -d forge_rls_test -v ON_ERROR_STOP=1 -f 02_invitation_acceptance.test.sql
psql -d forge_rls_test -v ON_ERROR_STOP=1 -f 03_membership_privilege.test.sql
psql -d forge_rls_test -v ON_ERROR_STOP=1 -f 04_project_team_sharing.test.sql
dropdb forge_rls_test
```

Each `.test.sql` file seeds its own fixture data and is independent — run
them against separate fresh databases (drop/recreate between files) rather
than accumulating state from one into the next.

`0001_init.sql` throws one expected error — `publication "supabase_realtime"
does not exist` — because logical-replication publications are a Supabase
platform concept this local Postgres doesn't have. It doesn't affect any
RLS policy and can be ignored; every other statement in every migration
applies cleanly.

Each `.test.sql` file ends by raising an exception if any assertion failed
(non-zero exit) or a `NOTICE` if everything passed, so it's CI-friendly:
non-zero `psql` exit code means a real regression.

## What this does and doesn't prove

`00_local_test_setup.sql` replicates the two things our RLS policies
actually depend on:

- `auth.uid()` / `auth.jwt()` — Supabase's well-documented local-testing
  definitions (read the current user's claims from a session GUC). These
  are exactly what production Supabase runs, so any test built on them is
  a faithful test of the real policy logic.
- `realtime.messages` / `realtime.topic()` — a **best-effort stand-in**
  for Supabase Realtime Authorization's schema, based on its public docs
  and the `extension`/`private`-channel concepts already present in the
  `@supabase/realtime-js` client this app uses. This is **not** Supabase's
  real Realtime engine. It proves the authorization *predicate* in
  `0003_realtime_presence_authorization.sql` (does `can_access_project()`
  correctly gate a `presence:project:<uuid>` topic for
  owner/team-member/viewer/outsider/public) is correct — it does not prove
  Supabase's actual Realtime server enforces it the same way in production.
  That needs a smoke test against a real Supabase project once one is
  connected (see the main README's Realtime Authorization section).

## Files

- `01_presence_authorization.test.sql` — owner, team roles (owner/admin/
  developer/viewer), and an outsider against private/team/public projects,
  plus a malformed-topic injection attempt.
- `02_invitation_acceptance.test.sql` — an invitee accepting their own
  invitation with the correct role, and three escalation attempts (role
  smuggling, team redirect, self-insert with no invitation at all) that
  must all be rejected.
- `03_membership_privilege.test.sql` — an admin cannot self-promote to
  owner, remove the owner, promote another member to admin, or invite
  someone as admin/owner; an owner can still do all of those.
- `04_project_team_sharing.test.sql` — Teams↔Projects integration
  (migration 0005): owner attaches/detaches a project, every team role's
  resulting read/write access (including presence, reusing the same
  `realtime.messages` fixture as test 01), an outsider and an
  unauthenticated user denied even knowing the project's UUID, a team
  admin blocked from managing sharing while still able to edit the project
  otherwise, an owner blocked from sharing into a team they don't belong
  to, and access revoked immediately on detachment or membership removal.
