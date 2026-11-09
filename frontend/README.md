# Frontend development

The App Router frontend provides public pages, authentication, a protected
dashboard, resource search, saved resources and notes. Installed versions and
scripts are defined in [package.json](package.json); Bun resolves dependencies
from [bun.lock](bun.lock). CI pins Node 24.22.2 and Bun 1.4.4; match those versions
when reproducing CI failures.

## Start from a clean clone

Run these commands from the repository root:

```sh
bun install --cwd frontend --frozen-lockfile
cp frontend/.env.local.example frontend/.env.local
bun run --cwd frontend dev
```

The sanitized `.env.local.example` is tracked. Your `.env.local` remains ignored.
The development server listens on `http://localhost:3000`. Start the Spring API
separately on port 8080 using the root README's backend instructions.

The browser calls relative `/api/v1/...` URLs on the Next origin. Next forwards
`/api/*` to the **server-only** `API_PROXY_TARGET`, defaulting to
`http://localhost:8080`. Set it to an HTTP(S) origin with no credentials, path,
query or fragment. `NEXT_PUBLIC_API_BASE_URL` is obsolete and is not read.

Next captures the proxy target during a production build. Rebuild after changing
it; setting a new target only for `next start` does not change built rewrites.
Docker builds default to `http://backend:8080` on the Compose network; a local
Maven/IDE launch normally uses `http://localhost:8080` instead.

`HTTPS_DEPLOYMENT` is a server runtime flag. Keep it false for local HTTP. Enable
it only behind controlled HTTPS-only ingress with direct access blocked. It does
not configure TLS, a public domain or redirects. See the root README for CSP,
nonce, cookie and ingress requirements.

## Checks and fixes

```sh
bun run --cwd frontend lint
bun run --cwd frontend format:check
bun run --cwd frontend test:run
bun run --cwd frontend build
bun run --cwd frontend type-check
bun run --cwd frontend test:security:http
BROWSER_EXECUTABLE='/path/to/chrome-or-chromium' bun run --cwd frontend test:browser
```

`lint` and its retained `lint:check` alias only inspect files. Use `lint:fix` to
apply Biome fixes. `format:check` inspects formatting; `format` writes formatting.
Build before the explicit type check so Next's generated route types are current.

Unit/component tests use Vitest, jsdom, Testing Library and mocked Next hooks.
The HTTP harness builds an isolated production copy with synthetic upstream,
image and error fixtures; this additional build is deliberate. It checks CSP,
nonce handling, error pages, assets, cookie/CSRF transport and both HTTPS flag modes.

`test:browser` uses an installed Chrome/Chromium binary and Node's built-in
WebSocket API. It builds another isolated production copy and uses a synthetic
loopback API: no real backend, provider account or user data is needed. It covers
login, search, failed-save retry, notes persistence, logout, route error recovery,
keyboard/modal behavior, contrast, reduced motion and reflow. The older
`test:accessibility:browser` command remains an alias to this expanded suite.
Browser tests fail if no executable is provided; they do not silently skip.

Both integration harnesses exclude local environment files, create temporary
fixtures and profiles, and clean up their servers and directories. Never point
the fixture API at a deployed service. These tests do not establish PostgreSQL,
provider, Safari/Firefox, screen-reader or deployed-ingress acceptance.

## Structure and responsibilities

- `app/`: routes, layout and scoped route error boundaries.
- `components/dashboard/`: search draft, header, navigation and saved summaries;
  `config.ts` keeps the branch/navigation display configuration together.
- `components/`: shared UI, authentication, layout and resource components.
- `context/AuthContext.tsx`: authoritative `/me` verification and session changes.
- `lib/api.ts` and `contracts.ts`: same-origin transport and runtime decoding.
- `lib/search.ts` and `search-options.ts`: validation/serialization and shared choices.
- `test/`: component setup plus production HTTP/browser regression harnesses.

The protected route retains a user-keyed subtree so account changes reset local
drafts and loaded data. Dashboard requests remain owned and cancelled by their
route. Expected API failures have local retry UI; `error.tsx` handles unexpected
rendering failures without exposing diagnostic details. A route boundary cannot
catch errors in the root layout or asynchronous event handlers; those need their
own handling. No performance benefit is claimed from component extraction.
