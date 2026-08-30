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
| Auth (Google / GitHub OAuth) | **Config required** | Fully implemented against Supabase Auth using the Authorization Code + PKCE flow, including the callback, cancellation, error and session-restore paths. The buttons perform a real OAuth redirect. It cannot complete a sign-in until you create the OAuth apps and enable the providers in Supabase — see [OAuth setup](#google--github-oauth-setup). |
| Dashboard, project CRUD, templates | **Real** | Works in both cloud and local mode. |
| ZIP import/export | **Real** | Path-traversal-safe (tested). |
| Monaco editor, tabs, autosave, command palette | **Real** | 30+ languages get real Monaco syntax highlighting; a few listed in the spec (TOML, Makefile) have no built-in Monaco grammar and fall back to plaintext rather than fake highlighting. |
| File explorer, project-wide search | **Real** | |
| In-browser runtime (terminal, run, preview) | **Real, requires network** | Uses StackBlitz's WebContainer API, which loads a hosted runtime from `stackblitz.com` at boot. Verified working end-to-end against a real project in this build's browser QA where that domain was reachable; on a network/firewall that blocks it, the app now surfaces a clear timeout error (not a silent hang) instead of pretending to run. Execution is real only for JS/TS/Node/web projects — other languages (Python, Java, C++, etc.) get real editing but not in-browser execution. |
| Git (status/diff/stage/commit/branch/history) | **Real** | A real `isomorphic-git` repository per project, over a browser-native fs adapter — no server round trip. |
| GitHub repository import/push | **Planned** | Needs a CORS proxy or server-side git operations; not implemented. |
| AI coding agent | **Config required** | Needs Supabase (the provider call is proxied through a Supabase Edge Function so API keys never reach the browser) and an API key for OpenAI, Anthropic, or Gemini, added in Settings → AI. The tool-calling loop, file read/write/search, run/build, and the diff-based change review are all real once configured. |
| Teams, roles, invitations | **Config required** | Needs Supabase; enforced server-side via Postgres RLS, not just a frontend check. |
| Real-time presence | **Config required** | Needs Supabase Realtime; shows genuinely connected users, never fabricated ones. Presence channels are keyed by (unguessable UUID) project ID, not gated by Realtime Authorization — anyone with the ID could join the channel and see who's active, though not read any file content (that stays behind Postgres RLS). Tightening this needs Supabase's Realtime Authorization feature enabled per-project. |
| Comments on files/lines | **Planned** | The `comments` table and RLS policies exist in the schema; no UI yet. |
| Static hosting (Vercel/Netlify/any CDN) | **Real** | It's a standard Vite SPA build (`npm run build` → `dist/`); `public/_headers` and `vercel.json` ship the COOP/COEP headers WebContainer needs for Netlify/Cloudflare Pages and Vercel. Other hosts (AWS CloudFront/S3, etc.) need those two headers set at the CDN/server layer — see [WebContainer](#the-in-browser-runtime-webcontainer). |
| One-click "Deploy my project" integration (Vercel/Netlify/AWS APIs) | **Planned** | Not implemented — would need its own OAuth + API integration per provider, distinct from hosting Forge IDE itself. |

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
4. Run the schema migrations: open the SQL editor in your Supabase project
   and paste the contents of each file in `supabase/migrations/`, in
   filename order, or use the Supabase CLI: `supabase db push`.
5. Enable Realtime for the project (Database → Replication) if not already
   on — the migration adds `comments` and `activities` to the
   `supabase_realtime` publication; presence uses ephemeral Realtime
   channels and needs no extra setup.
6. Configure Google and GitHub sign-in — see [OAuth setup](#google--github-oauth-setup)
   below.
7. Deploy the two Edge Functions (needed for the AI agent):
   ```bash
   supabase functions deploy ai-agent
   supabase functions deploy connections-save
   supabase secrets set AI_KEY_ENCRYPTION_SECRET=$(openssl rand -base64 32)
   ```
   `AI_KEY_ENCRYPTION_SECRET` is the server-only key used to encrypt
   users' AI provider API keys at rest — never commit it, never expose it
   to the client.

### Google / GitHub OAuth setup

Sign-in with Google and GitHub is implemented and wired to Supabase Auth,
but like any OAuth integration it can't work until you register the
applications and hand Supabase the credentials. Nothing here belongs in
your `.env` file — OAuth client secrets are stored in Supabase, never in
the client bundle.

Two URLs matter, and mixing them up is the usual cause of a failed
callback:

| URL | Where it goes | Value |
|---|---|---|
| **Provider callback** | Google Cloud Console / GitHub — the provider redirects here | `https://<your-project-ref>.supabase.co/auth/v1/callback` |
| **App redirect** | Supabase → URL Configuration — where Supabase sends the user afterwards | `http://localhost:5173/auth/callback` (dev), `https://your-domain.com/auth/callback` (prod) |

The provider always calls back to **Supabase**, not to this app. Supabase
then redirects into the app's `/auth/callback` route.

**Google**

1. In [Google Cloud Console](https://console.cloud.google.com/), create (or
   select) a project, then go to **APIs & Services → OAuth consent screen**
   and configure it. For non-Workspace accounts choose **External**; while
   it is in "Testing" you must add each tester's Google account under
   **Test users** or their sign-in will be refused.
2. Go to **APIs & Services → Credentials → Create Credentials → OAuth client
   ID**, choose **Web application**.
3. Under **Authorized redirect URIs**, add exactly:
   `https://<your-project-ref>.supabase.co/auth/v1/callback`
4. Copy the **Client ID** and **Client secret**.
5. In Supabase: **Authentication → Providers → Google** → enable, paste the
   client ID and secret, save.

**GitHub**

1. Go to GitHub **Settings → Developer settings → OAuth Apps → New OAuth App**
   (or an organization's equivalent).
2. Set **Authorization callback URL** to exactly:
   `https://<your-project-ref>.supabase.co/auth/v1/callback`
3. Create the app, then **Generate a new client secret** and copy both the
   **Client ID** and the secret (the secret is shown once).
4. In Supabase: **Authentication → Providers → GitHub** → enable, paste the
   client ID and secret, save.
5. GitHub OAuth Apps allow only one callback URL. For separate dev and
   production Supabase projects, register a separate OAuth App per project.

**Supabase redirect allow-list (required for both)**

In **Authentication → URL Configuration**:
- Set **Site URL** to your production origin (e.g. `https://your-domain.com`).
- Add these to **Redirect URLs**:
  ```
  http://localhost:5173/auth/callback
  https://your-domain.com/auth/callback
  ```
  Supabase rejects any redirect target that isn't on this list, which is
  what stops an attacker redirecting your users elsewhere after login. The
  app additionally validates its own `?next=` path so a tampered value
  can't bounce a signed-in user off-origin (see
  `src/features/auth/redirect.ts` and its tests).

If your dev server runs on a different port than 5173, use that port in
both the Redirect URLs list and your testing.

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
  `vite.config.ts` for `npm run dev` and `npm run preview`, in `public/_headers`
  for Netlify/Cloudflare Pages, and in `vercel.json` for Vercel, so those two
  hosts need no extra setup. If you deploy behind your own server/CDN
  (including AWS — CloudFront/S3 has no repo-level config file for this),
  set these two headers yourself on every response:
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

## 21st.dev CLI (UI component search/install)

[`@21st-dev/cli`](https://21st.dev) is installed as a dev dependency for
searching and pulling in UI components from 21st.dev's registry. It's a
tool for the person developing this repo, not something the app itself
depends on at runtime.

```bash
npx 21st login          # opens your browser, saves a token to your machine
npx 21st search "..."   # search components/themes/templates
npx 21st add author/slug   # install a published component
```

`login` needs a real browser and a reachable `localhost` callback, so it
only works on your own machine — it cannot complete inside a headless
CI job or a remote/sandboxed session (there's no browser to redirect,
and the loopback callback isn't reachable from outside the container).
For those, skip login and authenticate per-command instead:

```bash
API_KEY_21ST=<your key> npx 21st <command>
# or
npx 21st <command> --api-key <your key>
```

Get a key at <https://21st.dev/mcp>. `TWENTYFIRST_TOKEN` also works as
the env var name. Never commit a key — export it in your shell profile
or set it as a CI secret instead.

## Known limitations

- **Google/GitHub OAuth has not been exercised against the live
  providers.** The flow is fully implemented and was verified end to end
  against a local mock of Supabase's `/auth/v1/authorize` endpoint: the app
  emits a correct authorization request (right provider, right
  `redirect_to`, PKCE `code_challenge` with `S256`), and the callback,
  user-cancellation, provider-error, protected-route and session-restore
  paths all behave correctly. What could not be tested here is the part
  that requires real credentials — Google/GitHub actually authenticating a
  human and Supabase minting a session from the returned code. Expect to
  verify that once you complete the OAuth setup above.
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
