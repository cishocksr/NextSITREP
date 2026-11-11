# NextSITREP branding, discoverability, and technical SEO audit

Date: November 10, 2026 (America/New_York). Baseline: `652f354` plus the existing working-tree changes. Status: **audit and proposed implementation only; approval required before code changes**.

> Implementation was authorized after this audit. See [implementation results](NEXTSITREP_BRANDING_SEO_IMPLEMENTATION.md) for current status; the findings below preserve the pre-implementation baseline.

## Scope and evidence limits

Reviewed the current frontend routes, shared components, metadata, assets, authentication/rendering, API search implementation, security configuration, manifests/configuration, documentation, CI, tests, and repository branding matches. The companion [branding inventory](NEXTSITREP_BRANDING_INVENTORY.md) records matching file paths and line numbers, proposed treatment, safety, and migration implications. Source references describe this working tree, not an immutable release.

Ten frontend files already had uncommitted rebranding edits; two review documents were already untracked. Those changes have been preserved. No application code, artwork, configuration, environment values, dependencies, database, or deployment was changed during this audit. No AGENTS.md was found in the repository or its parent instruction locations. Real environment files and generated dependencies/build output were excluded from the branding inventory; deployment values and secrets were not inspected. Historical Git objects were not rewritten or treated as current public copy.

The supplied brief ends mid-sentence at “Do not present it as an official VA or”. This report covers all five supplied phases and assumes no requirements beyond that supplied text.

This is a repository audit with a targeted component-test reproduction and official-source research. It does not establish live DNS/TLS, domain ownership, redirects, deployed response headers/statuses, production provider credentials/data, Search Console indexing, Core Web Vitals, or mobile browser acceptance. Architecture documentation describes proposed deployment work, not proof of a deployed production service. `.org` remains the **proposed** canonical origin.

## Findings in priority order

| ID | Priority | Finding and evidence | Proposed outcome |
| --- | --- | --- | --- |
| B01 | High | Navbar emits `Next SITREP`, including its accessible name, at `frontend/components/layout/Navbar.tsx:35`. Both current navbar tests fail at `Navbar.test.tsx:31` and `:68`. | Render the exact name `NextSITREP`, preserving the existing color styling if desired; keep strict accessible-name expectations. |
| S01 | High | No robots, sitemap, canonical, applicationName, Open Graph, Twitter card, environment indexing policy, or JSON-LD implementation found. Root metadata is only title/template and a generic description (`frontend/app/layout.tsx:9`). | Add coordinated route metadata, crawl policy, and a curated sitemap, gated on public launch configuration. |
| C01 | High | Public copy promises emergency funds, housing programs, GI Bill discovery, and “other trusted providers” (`frontend/app/page.tsx:4–27`, `:48`). Search currently queries only VA facilities. | Describe VA facility discovery accurately; introduce reviewed referral guides before claiming program-level assistance. |
| C02 | High | EDUCATION, HOUSING, and FINANCIAL_ASSISTANCE all query `benefits` facilities (`backend/src/main/java/com/veteransconnect/model/enums/ResourceCategory.java:13–15`); search then labels results with the requested category (`ResourceSearchServiceImpl.java:124–126`). | Explain that these filters locate benefits offices, not verified education/housing/grant programs. Treat search classification changes as a separate functional change. |
| S02 | High | `/resources` is a client page behind ProtectedRoute (`frontend/app/(dashboard)/resources/page.tsx:1`, `:243`); backend search requires a principal (`ResourceController.java:34–42`, `SecurityConfig.java:81`). | Keep authenticated search private; offer useful public, server-rendered informational content separately. |
| S03 | High | Public/private routes lack explicit noindex distinctions; a client redirect cannot supply an initial HTTP redirect or reliable indexing policy (`ProtectedRoute.tsx:15–20`). | Add route-group noindex metadata without weakening API authentication or introducing an SEO-only auth redesign. |
| B02 | Medium | Contributor docs, environment-template comment, Maven display description, README badges/tree, and issue-support links retain former branding. | Apply the low-risk replacements listed below after approval; verify remote link destinations. |
| B03 | Medium | Generic white-triangle-on-black favicon (`frontend/app/favicon.ico`, visually inspected); flag emoji is the current navbar/auth visual. No custom social image, apple icon, or manifest found. | Request approved brand assets; do not replace/generate artwork in the code/text work. A PWA manifest is optional. |
| C03 | Medium | Non-affiliation is stated on `/disclaimer` but absent from the homepage's principal explanation. “It’s free” can be read as applying to provider services (`app/page.tsx:150`). | State independent status visibly and distinguish free platform access from provider costs/eligibility. |
| S04 | Medium | `/privacy`, `/terms`, `/disclaimer`, `/dashboard`, `/resources`, `/saved` inherit the root title/description; auth routes override titles only. | Give every route its own meaningful title/description; private route titles belong in server wrappers. |
| C04 | Medium | Privacy invites requests “by contacting us” without a working contact (`frontend/app/privacy/page.tsx:49`). Generic analytics/service claims need reconciliation with real operations. | Obtain a verified contact and factual policy review; do not invent mailboxes or rewrite legal substance as SEO copy. |
| C05 | Medium | Facility client requests `per_page=20` without pagination (`VaFacilitiesClient.java:32`, `:90`). Defaults use VA sandbox (`application.properties:48`). | Avoid completeness/nationwide service guarantees; validate approved production data and pagination separately before public launch. |

## Phase 1: brand consistency and migration boundaries

### Changes already present

Root default/template metadata, homepage introduction, login description, footer, legal-page label, privacy/terms/disclaimer references, and navbar test expectations already use NextSITREP in the uncommitted changes. Do not report those as remaining Veteran FOB defects or overwrite the user's work. The navbar is the remaining public spelling defect. The existing manual rebranding checklist still describes several pre-edit defects; reconcile it with this current-state report rather than mechanically applying every old checklist item.

### Proposed low-risk replacements

| Location | Existing | Proposed | Safety / potential break |
| --- | --- | --- | --- |
| `frontend/components/layout/Navbar.tsx:35` | `Next <span …>SITREP</span>` | Contiguous `NextSITREP` text and exact accessible link name | Safe text change; check 320px reflow and both destination states. Currently failing tests should pass without relaxing their expected brand. |
| `CONTRIBUTING.MD:1` | Veterans Connection | NextSITREP | Safe prose-only replacement. |
| `CONTRIBUTING.MD:3` | VetConnect | NextSITREP | Safe prose-only replacement. |
| `.env.example:1` | VeteransConnect environment template | NextSITREP environment template | Safe comment-only replacement; preserve keys and values. |
| `README.md:3`, `:4` | `cishocksr/veterans-connect` badge image/link destinations | `cishocksr/NextSITREP` | Conditional on destination checks. Git origin already uses NextSITREP, but that alone does not prove the named workflows exist remotely. |
| `README.md:53` | `veterans-connect/` checkout-tree root | `NextSITREP/` | Safe illustrative label; no filesystem move. |
| `.github/ISSUE_TEMPLATE/config.yml:4`, `:7` | old repository docs/discussions URLs | corresponding NextSITREP URLs | Verify docs branch and Discussions availability before using. |
| `frontend/ISSUE.MD:5`, `:8` | same old docs/discussions URLs | corresponding NextSITREP URLs | Same destination verification; this file appears to be a template/reference rather than a route. |
| `backend/pom.xml:16` | VeteransConnect resource directory in description | NextSITREP resource directory | Safe display prose; preserve Maven coordinates and application name. |

No active Veteran FOB text remains in current frontend route/component copy. Searches also covered Veteran/Veterans Connect, concatenated/hyphenated/underscore forms, Veteran/Veterans FOB, Veterans Resource Application, New Bearings/New Bearing, and discovered VetConnect/Veterans Connection/veteran_connection variants. Historical/checklist references are inventoried separately; no New Bearings application identity was discovered outside audit/checklist discussion. Lowercase domain names, slugs, image tags, and local temporary paths are technical identifiers, not capitalization errors.

### Preserve or migrate separately

| Identity and evidence | Proposed handling | Why a blind rename can break things |
| --- | --- | --- |
| `@veterans-connection/frontend`: `frontend/package.json:2`, `frontend/bun.lock:6` | Retain for this work | Internal identity; package and lock metadata must remain consistent; external automation may depend on it. |
| `com.veteransconnect`, Java source/test trees, imports, `VeteransConnectApplication`, Spring factory registration | Retain | Package/class/file moves affect compilation, component scanning, test loading, launcher, logging, and documented paths. A coordinated refactor needs a clean backend build. |
| Maven group/name (`backend/pom.xml:12`, `:15`), `spring.application.name` (`application.properties:1`) | Retain | Build identity and operational log/metric consumers may depend on these. |
| `LOGGING_LEVEL_COM_VETERANSCONNECT` (`.env.example:51`, `backend/.env.example:17`) and logging property (`application.properties:22`) | Retain | These correspond to the existing Java package and deployment contract. |
| `veteran_connection`: example DB settings, Compose default, local datasource | Retain | Changing connection text does not rename/migrate a database; could connect to a fresh or nonexistent database. Preserve SQL migrations, tables, persisted enum values, and Flyway checksums. |
| `vet-connect-*` containers/network (`docker-compose.yml:4`, `:27`, `:51`, `:97`, `:116`) | Retain | Local tooling and existing resource ownership can depend on names. Previous diagnostic document records Compose project/volume `veterans-connect`; not re-inspected live in this audit. Never create an empty replacement database by changing project names. |
| Nominatim user-agent/contact (`application.properties:57`, consumed at `GeocodingService.java:36`, `:103`) | Change only after contact verification | Proposed identity is `NextSITREP/1.0 (<verified-contact>)`; no literal placeholder may ship. Do not assume an old mailbox or a new `.org` mailbox is controlled and operational. |
| Old project names in dated audit reports, archived logs, commands, technical source links | Preserve factual history | Bulk replacement would falsify old observations or break links to retained package paths. Add a dated current-state note only where readers could mistake old guidance for current instructions. |

No branded email-template delivery system or branded API endpoint needing public renaming was found. Backend-generated error strings reviewed did not expose a former product name. Existing test fixtures/imports largely refer to retained technical package names. Do not rename external resource providers, VA API identifiers, or third-party organizations.

## Phase 2: rendering, metadata, and crawl policy

### Rendering and security

The installed manifest pins Next.js 16.4.5 with App Router and standalone server output (`frontend/package.json`, `next.config.ts:4`). The root awaits `connection()` (`app/layout.tsx:24`); the proxy creates a per-request nonce, replaces caller-controlled nonce/policy headers, supplies a strict CSP, and sends `private, no-store` for page responses (`frontend/proxy.ts:53` onward). These are intentional constraints.

Homepage, authentication wrappers, and legal pages are Server Components. The client AuthProvider does not, by itself, make server-rendered children client-only. Their public copy can be present in initial HTML. Dashboard/search/saved pages use client state and effects and are suppressed pending authentication; they are not a public search corpus. Public content must remain readable if the session API is unavailable.

Keep dynamic server rendering, standalone deployment, CSP nonces, and existing cache policy. Do not recommend static export, ISR for nonce-bearing HTML, blanket CDN page caching, unsafe-inline scripts, or opening authenticated APIs for crawlers. Next.js documents these nonce rendering constraints in its [CSP guide](https://nextjs.org/docs/app/guides/content-security-policy). Retain backend JWT/cookie/CSRF, origin/proxy trust, authorization, and ownership enforcement. Robots directives provide no security.

### Proposed metadata design

Add a small server-side metadata configuration/helper for the verified public origin, exact brand, approved shared social assets, and per-route metadata. Do not construct canonical URLs from an untrusted Host header. Use an explicit production launch/indexing setting; `NODE_ENV=production` also applies to staging builds and is insufficient to authorize indexing. Keep indexing off by default until deployment is verified.

After `.org` is confirmed, set `metadataBase` to `https://nextsitrep.org`, `applicationName` to `NextSITREP`, root title template `%s | NextSITREP`, and explicit per-public-page self-canonicals/OG URLs. Do not put `canonical: '/'` in the root where every page would inherit it. Set home title in `app/page.tsx` so the template yields the intended title once. Do not duplicate the brand in child title strings. Share nested OG fields explicitly because [Next.js metadata merges shallowly](https://nextjs.org/docs/app/api-reference/functions/generate-metadata).

| Route | Current metadata/indexability | Proposed rendered title | Proposed description and index policy |
| --- | --- | --- | --- |
| `/` | Root title NextSITREP and broad inherited description | Find VA Facilities and Veteran Resources Near You \| NextSITREP | “Find nearby VA healthcare facilities, benefits offices, and Vet Centers. Create a free NextSITREP account to save locations and personal notes.” Index only on approved public production. |
| `/privacy` | Inherits root metadata | Privacy Policy \| NextSITREP | “Read how NextSITREP handles account information, saved resources, cookies, and requests about your data.” Self-canonical; index on approved production. |
| `/terms` | Inherits root metadata | Terms of Service \| NextSITREP | “Review the terms for using NextSITREP, including account responsibilities and limitations of resource information.” Self-canonical; index on approved production. |
| `/disclaimer` | Inherits root metadata | Disclaimer \| NextSITREP | “Understand NextSITREP’s independent status, informational purpose, and the need to verify details with official providers.” Self-canonical; index on approved production. |
| `/login` | Sign In title; inherited description; no noindex | Sign In \| NextSITREP | “Sign in to NextSITREP to find and save nearby VA facilities and manage your resource notes.” Noindex; exclude from sitemap. |
| `/register` | Create Account title; inherited description; no noindex | Create Account \| NextSITREP | “Create a free NextSITREP account to save VA facilities and organize resource notes.” Noindex; exclude from sitemap. |
| `/dashboard` | Inherits root; client protected | Dashboard \| NextSITREP | “Access your NextSITREP resource search and saved locations.” Noindex; no personalized metadata or sitemap entry. |
| `/resources` | Inherits root; client protected | Find Resources \| NextSITREP | “Search nearby VA healthcare facilities, benefits offices, and Vet Centers.” Noindex, including all ZIP/keyword/category query variants; omit from sitemap. |
| `/saved` | Inherits root; client protected | Saved Resources \| NextSITREP | “Manage your saved locations and personal resource notes.” Noindex; never include notes/names in metadata or sitemap. |

Server layouts in `(auth)` and `(dashboard)` can supply noindex to existing client pages. For private page titles, use server page wrappers around the existing client modules, or route-specific nested server layouts; do not export metadata from a `use client` file. Preserve component identity/reset behavior and current tests. Prefer `index: false, follow: true` for these route groups; global nonproduction responses also receive `X-Robots-Tag: noindex, nofollow` as defense in depth. Environment gates must apply to the sitemap, robots output, and response headers consistently.

Add OG `type: website`, `siteName`, page-specific title/description/URL and locale; add Twitter card/title/description. Supply images, dimensions and useful alt text only after approved artwork exists. Do not invent an X handle. The current favicon is served by the App Router file convention; leave it pending artwork approval. Verify default viewport output (`width=device-width, initial-scale=1`) in built HTML; no custom viewport export is present, and absence of that export alone is not a defect. Do not disable zoom. A PWA manifest is not required for indexing or this application’s current scope.

### Crawl files and status behavior

Use supported App Router [`app/robots.ts`](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots) and [`app/sitemap.ts`](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap) conventions. Start with a curated sitemap containing `/`, `/privacy`, `/terms`, `/disclaimer`; add guides only after substantive content is approved and implemented. Use absolute canonical-origin URLs, exclude auth/private/search/query/error URLs, and omit `lastModified` until reliable editorial dates exist. Never use request time as every page’s modification date.

For approved public production, allow public content and the asset paths needed to render it; optionally disallow `/api/` because it is not public content. Keep auth/private page URLs crawlable so crawlers can read their noindex. A robots disallow can hide noindex and still leave the URL indexed; see [Google technical requirements](https://developers.google.com/search/docs/essentials/technical). For development/staging use access restriction plus noindex responses and a disallow-all robots policy; a disallow-all file alone is not deindexing. If staging URLs were already indexed, plan removal/recrawl deliberately. Nonproduction sitemap output must not advertise the preview host or private routes; an empty list is appropriate.

Unknown routes use the framework’s not-found behavior; no custom not-found route is present. Existing HTTP regression tests assert 404s for synthetic missing pages/assets (`frontend/test/security-http.integration.mjs:262`, `:304`), but were not rerun in this audit. Client auth navigation normally begins with a page response and redirects after hydration; do not describe it as a verified server 302/401. Backend configuration specifies unauthenticated API 401 and forbidden 403. Preserve meaningful errors; no blanket 200 fallback or redirect-all-to-home. Test actual deployed 200/404/401/403/5xx behavior, maintenance responses, and nonce-bearing errors before launch.

### Canonical deployment contract (pending)

Before enabling public indexing, verify control of both domains, DNS, certificates, the actual application host, and TLS termination. Proposed behavior is one-hop permanent redirects from `.com` and selected `www`/HTTP variants to `https://nextsitrep.org`, preserving path and query. Validate API transport separately: do not redirect unsafe HTTP API requests where policy requires rejecting them. HTTPS certificates are needed even for hosts that only redirect. Redirect/canonical selection is not configured by `HTTPS_DEPLOYMENT`; that flag only supports the existing ingress contract. Host-only authentication cookies mean signing in on `.com` is not equivalent to signing in on `.org`; resolve redirects before login rather than broadening cookie domains. Keep an allowlist for hosts and never forward attacker-controlled host information into canonical URLs.

## Phase 3: qualitative veteran search-intent strategy

These are **qualitative hypotheses requiring validation**, informed by the supplied seed phrases, application capabilities, and official VA topic pages. No keyword platform, search volume, difficulty, rankings, competitor measurements, Search Console account, or trend dataset was available. Official topic organization supports user-task hypotheses, not a measured claim about how frequently users search. Consolidate close variants on a useful page instead of creating a landing page for each phrase.

All proposed category pages below are editorial referral guides, not public result listings. They require verified source links, original explanations of next steps, eligibility/cost caveats, geographic/data limitations, an accountable review date, and clear descriptions of the signed-in search. Start with healthcare and benefits because the current facility search supports those intents most directly. Defer the remaining pages until there is enough distinct reviewed content; no empty pages or sitemap entries reserved in advance.

| Group / seed coverage | Likely intent and actual app fit | Existing/proposed destination | Proposed title and description | Content gap and useful links |
| --- | --- | --- | --- | --- |
| VA benefits assistance; veteran disability benefits; VA disability claims information; veteran benefits resources | Find an official starting point or local office; app locates benefits facilities, does not file claims, assess eligibility, or provide accredited representation. | Home currently; proposed `/resources/benefits` guide | **VA Benefits Resources and Local Offices \| NextSITREP** — “Find official VA benefits starting points and learn how NextSITREP can help you locate nearby benefits offices.” | Explain office search vs claims assistance; link to [VA disability](https://www.va.gov/disability/) and official accredited-help guidance after verification. Link home → benefits → healthcare/education and signed-in benefits search with registration requirement disclosed. |
| Veteran healthcare resources; VA healthcare assistance; healthcare support for veterans | Locate care and understand where to begin; strong facility-location fit, no appointment/enrollment integration. | Proposed `/resources/healthcare`; existing authenticated HEALTHCARE search | **VA Healthcare Facilities and Resources \| NextSITREP** — “Learn where to start with VA healthcare and how to find nearby facilities. Verify services and eligibility with the provider.” | Explain facility types and provider verification; link [VA healthcare](https://www.va.gov/health-care/), benefits guide, counseling section, and clearly labeled sign-in-to-search CTA. |
| Veteran mental health resources; veteran counseling services | Find relevant support/counseling; partial fit through Vet Centers, not a complete mental health clinician directory. | Initial section within healthcare guide; `/resources/mental-health` only with distinct substantive content | **Veteran Counseling and Vet Center Resources \| NextSITREP** — “Explore official veteran counseling resources and learn how to find nearby Vet Centers through NextSITREP.” | Explain [Vet Centers](https://www.vetcenter.va.gov/) and provider-specific eligibility/service availability without presenting the platform as care. Link healthcare, relevant official mental health pages, and authenticated VET_CENTER search. Keep emergency instructions distinct from routine discovery; verify any contact information separately before publication. |
| Financial assistance for veterans; emergency financial help; veteran financial support programs; veteran grants and assistance | Immediate money, bill relief, or grant eligibility; current category returns benefits offices, not grant programs or verified funding. | Proposed `/resources/financial-assistance`, deferred | **Veteran Financial Assistance Resources \| NextSITREP** — “Find official starting points for veteran financial support and understand why program eligibility and available funding must be checked directly.” | Require distinct sourced assistance pathways; [VA copay hardship assistance](https://www.va.gov/health-care/pay-copay-bill/financial-hardship/) is limited in scope and must not be described as general cash/grants. Link benefits/housing and exact official programs after review. No instant-funds promise. |
| Veteran housing assistance; homeless veteran resources; emergency housing; veteran housing support programs | Secure shelter urgently or understand housing programs; app only locates benefits offices and cannot confirm beds or accept applications. | Proposed `/resources/housing`, deferred | **Veteran Housing Assistance Resources \| NextSITREP** — “Find official starting points for veteran housing support, including homelessness assistance, and verify help directly with program providers.” | Distinguish emergency shelter from home loans; source [VA housing assistance](https://www.va.gov/housing-assistance/) and linked official homelessness guidance; confirm geography and referral limits. Link benefits/financial guides. Do not claim available housing inventory. |
| Veteran job assistance; veteran employment resources; military transition assistance; career resources | Find jobs, transition support, training, or career counseling; no employment category, job feed, or placement functionality exists. | Proposed `/resources/employment`, deferred | **Veteran Employment and Transition Resources \| NextSITREP** — “Explore official starting points for veteran career support and military transition. NextSITREP does not provide job placement.” | Require source-backed referral content anchored on [VA careers and employment](https://www.va.gov/careers-employment/); link education/benefits. Do not fabricate an employment filter or listings. |
| VA education benefits; veteran education programs | Understand education assistance and where to apply; current education filter returns benefits facilities, not schools or training programs. | Proposed `/resources/education`, deferred | **VA Education Benefits Resources \| NextSITREP** — “Find official VA education and training information and learn where to start with benefits questions.” | Explain referral vs application; link [VA education](https://www.va.gov/education/), benefits/employment guides, and accurately labeled office search. Avoid a duplicate GI Bill-only page without unique depth. |
| Veteran support organizations; veteran community resources; veteran peer support; local veteran resources | Find nearby organizations or social/peer connection; current source is VA facilities and Vet Centers, with no verified nonprofit/peer-group directory. | Home/local-resource explanation and healthcare/Vet Center section first; no standalone community page yet | Home/section label **Local Veteran Resources and Vet Centers** — “Learn which VA facilities NextSITREP can help you find and where to verify available local services.” | Need verified organization/community data and geographic scope before promising broad support-organization coverage. Link to reviewed official resources and healthcare; do not imply that Vet Center listings prove peer groups are available. |

U.S. ZIP-based location search and a 1–100 mile radius do not prove complete coverage. VA facility types, provider availability, first-page limits, actual production API selection, and data freshness constrain what can be claimed. Avoid city/state SEO pages unless maintained, location-specific public content actually exists. Do not index personalized search query URLs to simulate local pages.

After launch, validate hypotheses using Search Console queries/impressions/clicks and relevant landing-page behavior. Use those observations to improve the same substantive guides before expanding routes. No rankings or rich-result outcomes are promised.

## Phase 4: public content, navigation, and accessibility

Recommended homepage H1: **Find VA Facilities and Veteran Resources Near You**. Suggested introduction: “NextSITREP helps U.S. military veterans find nearby VA healthcare facilities, benefits offices, and Vet Centers. Create a free account to save locations and personal notes.” Follow with “NextSITREP is an independent resource platform and is not affiliated with the U.S. Department of Veterans Affairs.” Add that provider services, eligibility, costs, and availability must be checked with providers. Do not imply every listed service is free.

Replace category-card program guarantees with descriptions of the actual office/location search. Remove or substantiate “other trusted providers,” “by veterans,” “Everything You Need,” and instant/completeness implications. Do not imply staff directly delivers housing, grants, healthcare, representation, or verified application outcomes. Preserve the free-account statement if the owner confirms it remains accurate.

Recommended hierarchy: H1 purpose; H2 “What you can find” with H3 healthcare facilities/benefits offices/Vet Centers; H2 “How NextSITREP works” with truthful account/search/save steps; H2 “About NextSITREP” explaining independence/data limitations; H2 for reviewed topical resources once available. Keep a single visible primary H1 and real anchor navigation. Category cards should only become links once destinations contain useful content.

Add public guest navigation to approved guides and a brief platform/about explanation; retain legal links in the footer. Example link text: “Explore VA healthcare resources,” “Read the VA benefits guide,” and “Create an account to search nearby facilities.” Do not label a sign-in link as an immediately available public search. Existing authenticated “Find Resources” and save workflows can remain intact. The proposed `/resources/<topic>` routes can coexist with `/resources` without inheriting a new private noindex layout: place guides outside `(dashboard)` and scope private metadata carefully. Avoid ambiguous duplicate route definitions across route groups.

Existing strengths to preserve: root `lang="en"`, keyboard skip link and main landmark (`layout.tsx:26–40`); homepage H1/H2/H3 hierarchy; semantic legal headings; ordinary Next Link navigation; navbar `aria-current` and wrapped mobile controls; provider links with resource-specific accessible names and new-tab notices (`ResourceCard.tsx:143` onward); announced loading/results and errors. Existing browser tests cover contrast/reflow/reduced motion; no new browser evidence is claimed here.

Improve decorative emoji semantics (`aria-hidden` where redundant) on homepage/auth pages. In search/saved/empty states, review H1→H3 jumps and choose H2s or an explicit results-section H2 without disrupting tested focus/status behavior. Review legal-page generic section/article semantics only if they clarify the outline; unnecessary landmark changes are not an SEO goal. Retest 320px and zoomed layouts, keyboard navigation, focus visibility, main/heading structure, and duplicate link names after changes. Avoid unsupported accessibility score or performance claims.

Do not change legal “Last Updated” dates to today merely because branding changes. Confirm actual policy review dates and contact operations; substantive policy correction is separate editorial/legal work, not certification in this audit.

## Phase 5: structured data

No existing JSON-LD was found. Proposed first implementation is a small server-rendered graph on the homepage:

- `Organization`: stable `@id` such as canonical-origin `/#organization`, exact name NextSITREP, URL, and the visible independent-platform description. No government/nonprofit status is inferred from `.org`; no address, phone, founder, credentials, awards, ratings, social profiles, or logo until verified.
- `WebSite`: stable `@id`, name, canonical URL, language, publisher referring to the organization. No SearchAction targeting authenticated or nonexistent public search.
- `BreadcrumbList`: only on implemented guides with matching visible linked breadcrumbs, accurate names, hierarchy, and canonical URLs. Do not add redundant breadcrumbs solely for the home page.
- Defer `FAQPage`. There is no visible FAQ now; Google limits FAQ rich results to well-known authoritative government/health sites. Being a veteran resource platform does not establish that eligibility. A useful visible FAQ can exist without schema. See [Google FAQ guidance](https://developers.google.com/search/blog/2023/08/howto-faq-changes).
- Do not model NextSITREP as GovernmentOrganization, MedicalOrganization, LocalBusiness, benefit issuer, or VA-affiliated service. Do not add aggregate ratings or represent private notes as reviews. Additional schema needs actual matching public content.

Use server-rendered `application/ld+json` with the existing request nonce obtained from trusted, proxy-replaced headers. Escape `<` in serialized data to prevent closing-script injection; do not interpolate untrusted HTML. Extend the production CSP harness to verify the new script nonce matches that response and differs across requests; do not weaken CSP for JSON-LD. Only emit canonical graph identity when the origin is configured and verified. Validate syntax, graph references, and content parity; schema.org validation and Google's Rich Results Test serve different purposes, and Organization/WebSite need not produce an eligible rich result. Follow [Google structured data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies); valid markup does not guarantee search appearance.

## Proposed implementation and acceptance plan

### A. Safe branding and current-content corrections

After approval: fix contiguous navbar brand; update contributor/template/display prose and verified repository links; reconcile the manual checklist; add distinct legal metadata and accurate homepage metadata/copy. Preserve all pre-existing edits. Adjust decorative emoji semantics and headings where needed. No backend/package/database/infrastructure rename and no brand artwork in this batch.

Acceptance: both existing navbar tests pass with the exact brand, canonical spelling appears in visible public text and accessible names, mobile wordmark fits, link destinations are valid, and repeat inventory contains only intentional historical/internal exceptions. Review copy against implemented VA facility search, not just the category labels.

### B. Coordinated metadata and indexing controls

Add explicit launch/origin configuration and safe defaults; server metadata wrappers/layouts for auth/private routes; route titles/descriptions; OG/Twitter text metadata; `robots.ts`, `sitemap.ts`; and environment-specific noindex headers preserving security/cache behavior. Keep production indexing disabled until the domain/ingress checks pass. Do not add missing-image URLs or social handles as placeholders.

Acceptance: initial HTML has one intended title, per-route description, exact canonical on indexable public pages, matching OG URLs, and noindex for auth/private/nonproduction. Query strings never become personal metadata or sitemap entries. Verify nested metadata and private-layout boundaries, default viewport, metadata for HTML-limited social bots, and public content during failed session verification. Check robots text/XML status and MIME types; sitemap has only intended public absolute URLs. Test production-like staging explicitly, not just development mode.

### C. Minimal truthful structured data

Add homepage Organization/WebSite JSON-LD using only verified fields and existing nonce machinery. Keep artwork-dependent fields out until asset approval.

Acceptance: graph parses, serialized `<` cannot escape its script, IDs/URLs match canonical metadata, new scripts receive valid per-response nonces, no fabricated fields or auth SearchAction, and CSP/security harnesses remain green.

### D. Public content expansion (separate editorial approval)

Prepare substantive healthcare and benefits guide drafts first, including sources, independent-status/cost/data limitations, real next steps, and links to authenticated office search. Approve drafts before making routes/nav/sitemap entries. Only then evaluate distinct mental-health, housing, financial, employment, education, and community content against the gaps above. Keep all saved data and personalized search behind existing authorization.

Acceptance: each published guide solves a distinct user task, uses reviewed links and accurate geographic limits, has unique metadata and visible breadcrumbs, contains no empty section/keyword filler, and stays independent of account/session API success. No functional change to benefits-office classification is bundled without its own review and meaningful backend regression tests.

### E. Brand assets and deployment launch (separate approvals)

Approve actual favicon/apple/social artwork or provide existing authorized assets; review rendered sizes/contrast and social crops before integration. Separately confirm `.org` canonical selection, `.com`/www/HTTP behavior, real TLS and redirects, expected 404/API/error statuses, production provider source, privacy contact, and launch indexing configuration. Configure Search Console ownership/sitemap submission only with account authorization. No AWS provisioning, DNS update, publication, or Search Console mutation is part of this audit.

### Validation after approved code changes

Run the repository's existing frontend unit/component tests, lint, formatting check, production build, and type check (build first for route types). Extend the existing production HTTP harness only for material SEO/rendering behaviors: public/private metadata, staging gating, crawl-file output, status codes, nonce-bearing JSON-LD, and metadata query isolation. Rerun the security HTTP suite and browser suite because metadata/server wrappers/nonce handling share the security shell. Use the configured installed browser with synthetic fixtures. Run backend checks if backend source or configuration changes; pure display-description changes do not justify new backend tests. Investigate failures rather than weakening assertions. After release, manually inspect deployed headers/redirects and Search Console coverage; repository tests cannot certify those.

## Validation actually performed

Repository inventory and source review; Git status/diff review; installed manifest/lock identity checks; favicon inspection via a temporary PNG conversion; official Next.js/Google/VA source research. Executed `bun run test:run components/layout/Navbar.test.tsx` from `frontend`: **2 tests failed**, both because the accessible link is “Next SITREP” while expectations are `/nextsitrep/i`. This is a reproduced existing-working-tree defect, left unchanged under the audit-only instruction. No full build, backend suite, browser suite, live-domain probe, or production runtime test was performed; none is reported as passing.

## Approval requested

Approve batches **A–C** for implementation, keeping public indexing disabled until deployment verification, preserving current technical identities and artwork. Batch D needs reviewable content drafts before publication; batch E needs explicit asset/domain/deployment decisions. A–C can proceed with safe defaults without inventing contacts or assuming `.com` redirects.
