# Forge IDE

A standalone, browser-based development platform: a real Monaco editor, an
in-browser Node.js runtime, an AI coding agent with real file/run tools,
Git, and team collaboration — built as its own independent project (it does
not depend on, import from, or modify any other repository).

This README states exactly what is **real**, what needs **external
configuration**, what is **limited**, and what is **planned** — nothing here
is faked to look more finished than it is.

## Feature status

| Area | Status | Notes |
|---|---|---|
| Landing page, docs, legal pages | **Real** | Fully static, all links resolve to real in-app routes. |
| Auth (email/password) | **Config required** | Needs a Supabase project. Falls back to a genuine **local mode** (IndexedDB-only projects, no account) when unconfigured — never a fake login. |
| Auth (Google / GitHub OAuth) | **Config required** | Needs the provider configured in your Supabase project's Auth settings. |
| Dashboard, project CRUD, templates | **Real** | Works in both cloud and local mode. |
| ZIP import/export | **Real** | Path-traversal-safe (tested). |
| Monaco editor, tabs, autosave, command palette | **Real** | 30+ languages get real Monaco syntax highlighting; a few listed in the spec (TOML, Makefile) have no built-in Monaco grammar and fall back to plaintext rather than fake highlighting. |
| File explorer, project-wide search | **Real** | |
| In-browser runtime (terminal, run, preview) | **Real, requires network** | Uses StackBlitz's WebContainer API, which loads a hosted runtime from `stackblitz.com` at boot. Verified working end-to-end against a real project in this build's browser QA where that domain was reachable; on a network/firewall that blocks it, the app now surfaces a clear timeout error (not a silent hang) instead of pretending to run. Execution is real only for JS/TS/Node/web projects — other languages (Python, Java, C++, etc.) get real editing but not in-browser execution. |
| Git (status/diff/stage/commit/branch/history) | **Real** | A real `isomorphic-git` repository per project, over a browser-native fs adapter — no server round trip. |
| GitHub repository import/push | **Planned** | Needs a CORS proxy or server-side git operations; not implemented. |
| AI coding agent | **Config required** | Needs Supabase (the provider call is proxied through a Supabase Edge Function so API keys never reach the browser) and an API key for OpenAI, Anthropic, or Gemini, added in Settings → AI. The tool-calling loop, file read/write/search, run/build, and the diff-based change review are all real once configured. |
| Teams, roles, invitations | **Config required** | Needs Supabase; enforced server-side via Postgres RLS, not just a frontend check. |
| Real-time presence | **Config required** | Needs Supabase Realtime; shows genuinely connected users, never fabricated ones. |
| Comments on files/lines | **Planned** | The `comments` table and RLS policies exist in the schema; no UI yet. |
| Deployment (Vercel/Netlify/AWS) | **Planned** | Not implemented — would need its own OAuth + API integration per provider. |

## Tech stack

React 19 · TypeScript · Vite 8 · Tailwind CSS v4 · Zustand · Monaco Editor ·
xterm.js · `@webcontainer/api` · `isomorphic-git` · Supabase (Postgres, Auth,
Realtime, Edge Functions) · Radix UI primitives · Vitest.

## Project structure

```
src/
  app/            # App shell: error boundary, auth gate, theme effect
  pages/          # Route-level pages (landing, auth, dashboard, workspace, settings, teams)
  layouts/        # Shared page chrome (auth layout, dashboard layout)
  features/       # Feature modules: editor, explorer, terminal, runtime,
                  # preview, ai, git, collaboration, projects, command-palette
  services/       # Framework-free logic: FileSystemService, GitService,
                  # WebContainerService, ProjectService, AuthService, ...
  stores/         # Zustand stores (auth, editor, runtime, settings, UI)
  lib/            # Pure utilities (path safety, language map, Monaco/Buffer setup)
  types/          # Shared TypeScript types
supabase/
  migrations/     # SQL schema + Row Level Security policies
  functions/      # Edge Functions: ai-agent (provider proxy), connections-save
```

## Getting started

```bash
npm install
npm run dev
```

Without any environment variables set, the app runs in **local mode**:
the dashboard and full IDE (editor, runtime, terminal, Git) work using
IndexedDB-only projects in your browser. Auth, teams, AI, and cloud sync
show a clear "needs setup" notice instead of pretending to work.

### Enabling cloud features (Supabase)

1. Create a project at [supabase.com](https://supabase.com).
2. Copy your project URL and anon/public key from Project Settings → API.
3. Copy `.env.example` to `.env.local` and fill in:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=xxxx
   ```
4. Run the schema migration: open the SQL editor in your Supabase project
   and paste the contents of `supabase/migrations/0001_init.sql`, or use
   the Supabase CLI: `supabase db push`.
5. Enable Realtime for the project (Database → Replication) if not already
   on — the migration adds `comments` and `activities` to the
   `supabase_realtime` publication; presence uses ephemeral Realtime
   channels and needs no extra setup.
6. (Optional) Configure OAuth providers under Authentication → Providers:
   - **Google**: create OAuth credentials in Google Cloud Console, add the
     redirect URL Supabase shows you, paste the client ID/secret into
     Supabase.
   - **GitHub**: create an OAuth App in GitHub Developer Settings, same
     redirect-URL exchange.
7. Set the redirect URLs in Supabase Auth settings to include
   `http://localhost:5173/auth/callback` (dev) and your deployed URL.
8. Deploy the two Edge Functions (needed for the AI agent):
   ```bash
   supabase functions deploy ai-agent
   supabase functions deploy connections-save
   supabase secrets set AI_KEY_ENCRYPTION_SECRET=$(openssl rand -base64 32)
   ```
   `AI_KEY_ENCRYPTION_SECRET` is the server-only key used to encrypt
   users' AI provider API keys at rest — never commit it, never expose it
   to the client.

### Enabling the AI agent

Once Supabase and the Edge Functions above are set up, sign in, open
**Settings → AI**, pick a provider (Anthropic, OpenAI, Gemini, or an
OpenAI-compatible endpoint) and paste your own API key for that provider.
The key is sent once to `connections-save`, encrypted, and stored — the
browser never sees it again.

### The in-browser runtime (WebContainer)

Running a project, using the terminal, and live preview all go through
`@webcontainer/api`, which needs:
- **Cross-origin isolation** (COOP/COEP headers) — already configured in
  `vite.config.ts` for `npm run dev` and `npm run preview`. If you deploy
  behind your own server/CDN, you must set these two headers yourself:
  ```
  Cross-Origin-Embedder-Policy: require-corp
  Cross-Origin-Opener-Policy: same-origin
  ```
- **Network access to `stackblitz.com`**, which hosts the actual runtime.
  On a network/firewall that blocks it, Forge IDE shows a clear error
  after a timeout rather than hanging silently.
- For some production domains, StackBlitz may require the domain to be
  registered with them for WebContainer usage — see their docs if you hit
  authorization errors in production.

## Testing

```bash
npm test          # Vitest — path safety, virtual file system, ZIP import,
                   # run/package-manager detection, explorer tree building
npx tsc -b         # TypeScript, no emit
npm run build      # Production build
```

All of the above are green in this repository. Browser QA (landing,
dashboard, project creation, editor, terminal, Git commit flow, AI panel
config states, responsive layouts at 1440×900 / 768×1024 / 390×844) was
run against a real Chromium browser during development — see "Known
limitations" below for what that QA could and couldn't verify in this
particular environment.

## Known limitations

- **WebContainer requires real network access to stackblitz.com.** The
  runtime, terminal, and preview code is implemented against the real
  `@webcontainer/api` and was exercised in browser QA; whether it actually
  boots depends on your network being able to reach that domain. A 20s
  timeout with a clear error message covers the case where it can't.
- **Only JS/TS/Node/web projects execute in-browser.** Python, Java, Go,
  Rust, etc. get full editing support (syntax highlighting, Monaco
  features) but no in-browser execution — there is no in-browser runtime
  for those languages. This is stated in the UI, not hidden.
- **GitHub repository import/push, deployment integrations (Vercel/
  Netlify/AWS), and file/line comments are not implemented** — see the
  feature table above.
- **AES-GCM key encryption uses a single server-side secret** rather than
  a managed KMS/HSM. Reasonable for a self-hosted deployment; a
  multi-tenant SaaS should move this to a proper secrets manager.
- **No automated drag-and-drop file reordering** in the explorer — files
  are moved/renamed via the context menu instead.
- **The Monaco/WebContainer/isomorphic-git bundle is large** (loaded only
  when a project is opened, not on the landing/dashboard bundle, but still
  a multi-MB chunk) — inherent to bundling a full code editor and Node
  runtime client-side rather than a further optimization opportunity.

## Environment variables

See `.env.example`. All `VITE_*` variables are public (bundled into the
client); nothing server-only is ever prefixed with `VITE_`. Server-only
secrets (`SUPABASE_SERVICE_ROLE_KEY`, `AI_KEY_ENCRYPTION_SECRET`) are set
as Supabase Edge Function secrets, never in a client `.env` file.

## Security notes

- Every file path (explorer, AI tools, ZIP import) is normalized and
  validated against traversal (`../`, absolute paths, backslash tricks,
  control characters) before touching the virtual file system — see
  `src/lib/paths.ts` and its test suite.
- `.git/` is a reserved path the ordinary file API refuses to touch
  directly; only the Git subsystem's dedicated adapter can write there.
- Row Level Security is enabled on every Supabase table; a user can only
  read/write projects and teams they own or belong to — enforced in
  Postgres, not just hidden in the UI.
- AI provider API keys are encrypted at rest and only decrypted inside the
  `ai-agent` Edge Function to make the provider call; they are never sent
  back to the browser after being saved.
