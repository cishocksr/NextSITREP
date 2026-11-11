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

## Branding, public guides, and search indexing

The public name is **NextSITREP**, with no space. Public `/guides` and
`/resources/<topic>` pages are server-rendered informational guides with official
source links. They are separate from the authenticated `/resources` search.
Education, housing, and financial-assistance filters currently locate VA benefits
offices; they do not search program inventories. Keep that distinction in copy.

Server runtime configuration (also passed to the frontend by local Compose):

| Setting | Default | Purpose |
| --- | --- | --- |
| `SITE_URL` | `https://nextsitrep.org` | Proposed canonical HTTPS origin, validated without credentials/path/query/fragment; never derived from caller-supplied Host headers. |
| `SITE_INDEXING_ENABLED` | `false` | Explicit launch switch. Indexing also requires production mode, `HTTPS_DEPLOYMENT=true`, and the canonical `.org` origin. Staging must keep this false even with a production build. |
| `NEXTSITREP_CONTACT_EMAIL` | `help@nextsitrep.org` | Owner-confirmed private account/privacy contact; deployments may override it with another monitored mailbox. |

Metadata, `robots.txt`, and `sitemap.xml` read these settings at request time.
Nonproduction/nonlaunch responses receive noindex, robots disallows crawling, and
the sitemap is empty. After launch, the sitemap lists the home, guides, and legal
pages only. Sign-in, registration, dashboard, saved resources, and personalized
search remain noindex and outside the sitemap. Their URLs remain crawlable so
crawlers can see noindex; backend authentication and authorization still protect
private data. API responses have an additional noindex header. Requests to hosts
other than the configured HTTPS canonical origin also receive noindex.

Before enabling indexing, verify DNS/TLS and public host forwarding; configure
permanent path/query-preserving redirects from owned `.com`, HTTP, and selected
`www` variants to the canonical `.org` origin at the controlled ingress. Preserve
HTTP API rejection, trusted proxy handling, host-only cookies, and CSRF protections.
Verify an actual public HTTPS response has no unintended noindex header. Do not
change database, package, Java, network, or Compose identities to change branding.
No deployment or redirects are configured merely by changing these variables.

Confirm the support mailbox is operational before public enrollment, confirm production VA
provider data (the backend default is sandbox), and verify real coverage and data
freshness. Facility search currently requests the first page of provider results;
copy must not imply a complete provider, grant, housing, or employment directory.
Public guides are editorial referrals, not professional advice or eligibility
assessments; maintain their official links and explicit review date.

Homepage Organization/WebSite and guide BreadcrumbList JSON-LD are emitted with
per-response CSP nonces and escaped JSON. Keep request-time rendering and the
strict CSP. Do not add FAQ claims, government affiliation, fake ratings, invented
contacts, or social handles. The SVG icon and social wordmark sources in `public/`
correspond to the committed favicon, Apple icon, and 1200×630 PNG preview. The full
brand reads NextSITREP; the small icon uses the initials NS.
