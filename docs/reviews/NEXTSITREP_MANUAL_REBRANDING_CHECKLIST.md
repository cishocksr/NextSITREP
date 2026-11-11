# NextSITREP manual rebranding checklist

> This checklist describes the earlier audit baseline. Branding and SEO work has since been implemented; see [current implementation results](NEXTSITREP_BRANDING_SEO_IMPLEMENTATION.md) for completed work and outstanding deployment/contact checks.

Inventory verified on 2026-11-09 against main, commit `652f354`. This is a manual
implementation guide. Creating this document does not change application branding.
File references describe that baseline; line numbers will move as you edit.

## Agreed identity and scope

- Public product name: **NextSITREP** (preserve this spelling and capitalization).
- Primary domain: **nextsitrep.org**.
- Secondary owned domain: **nextsitrep.com**. Its redirect/canonical behavior is
  undecided; ownership alone does not configure a redirect or deploy a website.
- Tone: veteran resources, connection, camaraderie, service, trust and accessibility.
  Keep the military styling restrained and describe features the application
  actually provides today.

This work changes public identity and current documentation. Internal package,
transport, database and infrastructure identifiers have compatibility constraints
and do not need to match the public name.

## 1. Replace the public product name

Change every product-name occurrence in each file below. Keep surrounding behavior
and legal-policy meaning intact.

| Done | File | What to change |
| --- | --- | --- |
| [ ] | [Root metadata](../../frontend/app/layout.tsx) | `title.default` → `NextSITREP`; `title.template` → `%s \| NextSITREP` |
| [ ] | [Navbar](../../frontend/components/layout/Navbar.tsx) | Replace the split `Veteran` / `FOB` wordmark with NextSITREP; its accessible link name must read the complete product name |
| [ ] | [Footer](../../frontend/components/layout/Footer.tsx) | Replace the visible Veteran FOB product name |
| [ ] | [Landing page](../../frontend/app/page.tsx) | Replace “Veteran FOB helps you…” in the introduction |
| [ ] | [Login page](../../frontend/app/(auth)/login/page.tsx) | Replace “your Veteran FOB account” |
| [ ] | [Shared legal-page component](../../frontend/components/legal-page.tsx) | Replace the shared product heading; this affects all legal pages |
| [ ] | [Privacy](../../frontend/app/privacy/page.tsx) | Replace all Veteran FOB references in intro, paragraphs and lists |
| [ ] | [Terms](../../frontend/app/terms/page.tsx) | Replace all Veteran FOB references in intro and paragraphs |
| [ ] | [Disclaimer](../../frontend/app/disclaimer/page.tsx) | Replace all Veteran FOB references in intro and paragraphs |
| [ ] | [Navbar tests](../../frontend/components/layout/Navbar.test.tsx) | Update both `/veteran fob/i` expectations to the new accessible brand name |

The navbar uses separate spans, so searching only for the contiguous string
`Veteran FOB` misses that occurrence. Preserve the wordmark's full accessible name
when splitting its text for color or weight. Retain the correct home/dashboard
link destinations and the single-anchor semantics introduced in section 3.

“Veteran,” “veterans,” VA service/category names and branch-of-service labels are
legitimate content. Dashboard, Find Resources, Saved, Sign In and Get Started are
appropriate navigation labels and need no automatic replacement. The flag and
branch themes are design choices, not obsolete text names. Existing public support
and emergency information should retain its meaning during a product-name change.

## 2. Complete metadata without giving every page the homepage URL

The current root metadata has a title and description. It does not define a full
NextSITREP social/canonical identity.

- [ ] Set `applicationName` to NextSITREP.
- [ ] Review the description for accurate resource-discovery copy. Its existing
  wording has no old brand; rewriting it is optional.
- [ ] Use the agreed production origin when setting `metadataBase`:
  `new URL("https://nextsitrep.org")`.
- [ ] Add an Open Graph site name, title, description, URL and deliberate preview
  image/alt text. Add the corresponding social-card metadata if used.
- [ ] Give each public page a page-appropriate title, URL and self-canonical.
  The homepage should canonicalize to `/`, privacy to `/privacy`, and so on.
- [ ] Do not put a single root `alternates.canonical: "/"` in place and let all
  child pages inherit it unchanged.
- [ ] Set protected dashboard/resource/saved pages to noindex. Decide whether
  login/register should also be excluded from indexing. Preview/test deployments
  need their own indexing policy.
- [ ] Add metadata in Server Components/segment layouts. The protected page files
  currently use `"use client"`, so exporting metadata directly from those client
  modules is not supported. A server layout can supply group metadata while the
  existing protected/user-keyed boundary continues to own authentication state.
- [ ] If adding robots or sitemap routes, list only intended public canonical
  pages. A crawler directive does not protect private content.
- [ ] Keep the root layout's request-time `connection()` call and nonce/CSP
  behavior. Branding does not require changing rendering/security controls.

The existing auth page title exports can continue to produce titles such as
`Sign In | NextSITREP` through the root template. Protected URLs may contain search
queries and private workflows; they should not be advertised as public index pages.
Do not imply nextsitrep.com redirects until that behavior is actually configured.

## 3. Replace the default asset identity deliberately

The tracked image inventory at this baseline contains
[app/favicon.ico](../../frontend/app/favicon.ico). It is the existing white
triangle on black and has no NextSITREP identity. No tracked custom Open Graph,
Twitter/social-preview, apple icon or web manifest assets were found.

- [ ] Choose a recognizable NextSITREP mark; a restrained monogram or resource/
  navigation motif is an option. A new illustration is not required.
- [ ] Replace the favicon and verify legibility at 16px/32px and against light and
  dark browser chrome. Use the final mark, not a leftover starter asset.
- [ ] If creating `app/icon.*` or `app/apple-icon.*`, coordinate those Next metadata
  assets with the favicon so conflicting old/new icons do not remain.
- [ ] Create a social-preview image if adding image metadata; 1200×630 is a common
  Open Graph choice. Provide useful alt text and an actual reachable asset URL.
- [ ] If adding a manifest/installable experience, update its name, short name,
  icons and related metadata consistently. No manifest currently needs renaming.
- [ ] Keep useful accessible text beside a decorative navbar image. Give a
  standalone meaningful image an appropriate accessible name.
- [ ] Inspect in a fresh browser profile after rebuilding; cached favicons can
  make a correct asset change look unsuccessful.

New static assets can live under `frontend/public` or use Next's supported app
metadata asset conventions. Commit the files and reference the same paths in
metadata; empty local directories do not supply deployable images.

## 4. Update active documentation and repository destinations

| Done | File | Action |
| --- | --- | --- |
| [ ] | [CONTRIBUTING.MD](../../CONTRIBUTING.MD) | Replace “Veterans Connection” in the heading and “VetConnect” in the introduction |
| [ ] | [Root environment example](../../.env.example) | Replace only the VeteransConnect heading comment; preserve keys and runtime values |
| [ ] | [Root README](../../README.md) | Update the displayed checkout tree root from `veterans-connect/` to `NextSITREP/` |
| [ ] | [Root README badges](../../README.md) | Change both old repository destinations to `https://github.com/cishocksr/NextSITREP`; preserve the real workflow filenames |
| [ ] | [Issue contact configuration](../../.github/ISSUE_TEMPLATE/config.yml) | Update old docs/Discussions destinations to the current repository |
| [ ] | [Frontend issue-template copy](../../frontend/ISSUE.MD) | Update the matching old repository destinations |
| [ ] | [Maven display description](../../backend/pom.xml) | The description still names VeteransConnect; update this human-readable description if including backend-facing documentation metadata |

The configured Git origin already points to `https://github.com/cishocksr/NextSITREP.git`.
Current workflow paths are `actions/workflows/ci.yml` and
`actions/workflows/dependency-check.yml`. A readable badge label such as Dependency
Security can match the current job terminology.

Verify that Discussions is enabled before publishing its link. If unavailable,
choose a working Issues/documentation destination instead of leaving a dead link.
Old GitHub redirects were not relied upon or verified by this inventory.

Section 4 already corrected the frontend README, current CI guide, environment
example tracking and Bun workspace metadata. Do not repeat their old findings:
`frontend/bun.lock` now matches `@veterans-connection/frontend`; `fontend` is fixed.
The current frontend README has a generic Frontend development heading with no
obsolete product name. An optional NextSITREP heading can be added consistently.

## 5. Resolve external identity/contact details separately

- [ ] Investigate the Nominatim identity at
  [application.properties](../../backend/src/main/resources/application.properties):
  `geocoding.nominatim.user-agent` still names VeteransConnect and an old contact.
  [GeocodingService](../../backend/src/main/java/com/veteransconnect/client/GeocodingService.java)
  sends that value as its outbound User-Agent.
- [ ] Establish an address that the operators actually monitor before replacing
  that contact. Neither `contact@nextsitrep.org` nor `support@nextsitrep.org` is
  established by the repository. Do not invent a mailbox.
- [ ] Check whether the old contact is still valid while preparing its replacement.
  Respect the provider's current identification requirements when changing it.
- [ ] If a public support/privacy contact is added to legal/footer pages, use the
  confirmed address and keep the relevant policies accurate.
- [ ] Review any provider dashboards, OAuth registrations, emails or hosting
  settings you actually use for old app display names and callback origins.
  These external settings are not established by source searches alone.

Example addresses in placeholders/tests are fixtures. They are not obsolete real
organizational contacts and should not all become nextsitrep.org addresses.

## 6. Preserve compatibility-sensitive identifiers

These do not need renaming to deliver the public rebrand:

| Existing identity | Why it needs a separate decision |
| --- | --- |
| `@veterans-connection/frontend` in package.json and bun.lock | Internal package identity; the matching lock metadata is already fixed |
| Java/Maven group `com.veteransconnect` and application class | Imports, scanning, configuration and build identity depend on them |
| Maven artifact `backend` and current JAR filename | Docker packaging depends on the artifact output path |
| Maven display `<name>veterans-connect</name>` | Evaluate separately from its descriptive text; do not bundle build/coordinate changes into name replacement |
| `spring.application.name=veterans-connect` | Operational log/metrics identity may have consumers |
| `LOGGING_LEVEL_COM_VETERANSCONNECT` | Corresponds to the existing Java package |
| Database `veteran_connection` | Changing a label does not rename or migrate a database |
| `vc_session`, `XSRF-TOKEN`, `X-XSRF-TOKEN` | Frontend/backend cookie and CSRF transport must agree |
| `vc_session_event` and cleanup of `vc_user`, `vc_expiry`, `vc_token` | Cross-tab signaling and legacy cleanup intentionally use established keys |
| Compose project/container/network/volume identities | Existing resources and database storage depend on these names |
| Environment-variable keys, API routes, provider IDs | Integration contracts, not public product labels |

This machine currently has database volume `veterans-connect_postgres_data` and
containers labeled with Compose project `veterans-connect`. The renamed checkout
defaults to project `nextsitrep`. Blindly renaming those operational identities can
produce a different empty database volume or container-name conflicts. See
[the local Docker diagnosis](LOCAL_DOCKER_DIAGNOSIS.md) before infrastructure edits.

Keep dated audit reports, archived guides and implementation notes as historical
evidence. If a historical link becomes unusable, add a current-location note or
repair the link without changing what the report originally observed. No tracked
New Bearings/New Bearing references were found in this inventory.

## 7. Finish production domain configuration when deployment is chosen

These are deployment tasks, not changes that metadata alone can perform:

- [ ] Confirm the app is actually served on the intended primary hostname.
- [ ] Configure its DNS, certificate, ingress/host routing and HTTPS behavior.
- [ ] Update production CORS to the exact frontend origin(s) needed by the current
  proxy/backend flow. Keep local origins for local development only; avoid a
  blanket wildcard replacement.
- [ ] Keep `API_PROXY_TARGET` pointed at the backend origin for the selected
  environment, not automatically at the public marketing/domain name. It is a
  build-time server-side rewrite setting.
- [ ] Enable `HTTPS_DEPLOYMENT` and the backend's secure-cookie/proxy settings only
  for the established HTTPS deployment, following the existing deployment controls.
- [ ] Decide what nextsitrep.com should do. If a redirect is selected, configure
  and test its HTTPS certificate, destination and path/query handling explicitly.
- [ ] A hostname change has separate host-only session cookies; plan for users
  to sign in on the new host. Do not widen cookie scope just to rename the brand.
- [ ] Verify real rendered titles, icons, preview images and public canonical URLs
  through the deployed ingress after these changes.

Domain ownership does not establish any of the above. Existing cloud/proxy,
PostgreSQL/provider, capacity and recovery acceptance remain separate work.

## 8. Verify the manual changes

From the repository root, search current public source and active documentation:

```sh
rg -n -i 'veteran[[:space:]]*fob|veterans[ -]?connect(ion)?|vetconnect|new bearings?' frontend/app frontend/components README.md CONTRIBUTING.MD .env.example .github/ISSUE_TEMPLATE frontend/ISSUE.MD
```

Classify each result rather than demanding zero repository-wide matches. Inspect
the split navbar text, assets and provider settings separately. Then run:

```sh
bun run --cwd frontend lint:check
bun run --cwd frontend format:check
bun run --cwd frontend test:run
bun run --cwd frontend build
bun run --cwd frontend type-check
bun run --cwd frontend test:security:http
BROWSER_EXECUTABLE='/path/to/chrome-or-chromium' bun run --cwd frontend test:browser
```

- [ ] Homepage, login, register, dashboard, resources, saved and all legal pages
  show the intended name wherever a product identity appears.
- [ ] Navbar/footer remain readable at narrow widths; keyboard names use NextSITREP.
- [ ] Actual browser titles use the intended title template and correct page names.
- [ ] Canonicals are page-specific; protected/preview indexing behavior is deliberate.
- [ ] Icons and social assets load, have the intended identity and are legible.
- [ ] Login, search, save, notes and logout still work; branding did not change
  cookie, API, authentication or database identifiers accidentally.
- [ ] Repository badges/contact links resolve to real destinations.
- [ ] Any external contact identity uses a confirmed address.
- [ ] nextsitrep.com behavior is documented as pending or tested as implemented.
- [ ] Review the final diff for accidental changes to environment files, policies,
  infrastructure identities or historical reports before committing.

The four frontend correction sections are implemented. This checklist is the
remaining branding workstream; it does not reopen those fixes or declare the
broader backend/deployment findings complete.
