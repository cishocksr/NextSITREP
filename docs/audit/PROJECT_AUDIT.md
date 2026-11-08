# NextSITREP — Phase 1 Project Audit

Audit date: November 2, 2026 (America/New_York). Repository: `veterans-connect`; base commit: `5a99f2f` plus existing working-tree changes.

## Scope and conclusion

This is discovery and initial risk assessment, not a production certification or penetration test. Repository structure, application source, routes, data models, integrations, configuration, dependency manifests/lockfile, Docker definitions, tests, workflows, and local documentation were inspected. Application code was not modified. Existing edits in ten frontend files were preserved; findings describe the current working tree, not only committed HEAD.

The confirmed application is a Next.js frontend and a separate Spring Boot REST API backed by PostgreSQL. It already implements accounts, resource discovery, and private saved resources with notes. It does **not** yet implement a veteran community or peer communication system. No AWS infrastructure, deployment workflow, or deployed environment was confirmed from this repository.

The architecture is a reasonable starting point for a small team: two deployable applications, a relational database, conventional backend layers, few frontend runtime dependencies, and real tests. Production deployment should wait for the signing-key default, dependency security/support, browser authentication topology, and release verification gaps to be addressed.

Priority definitions:

| Priority | Meaning |
| --- | --- |
| Critical | Potential account compromise or similarly severe exposure; deployment blocker when the stated condition applies. |
| High | Significant security, privacy, reliability, or release risk; resolve before production. |
| Medium | Correctness, accessibility, performance, or maintainability issue to address in the next audit/remediation cycle. |
| Low | Cleanup or consistency improvement with limited immediate impact. |

Findings below distinguish confirmed repository behavior from conditional deployment risks. Missing infrastructure in Git does not prove that external infrastructure does not exist.

## Current architecture overview

```text
Browser
  ├─ Next.js App Router UI
  │    ├─ public landing / authentication / informational pages
  │    ├─ AuthProvider + client-side ProtectedRoute
  │    └─ typed fetch wrapper, credentials: include, CSRF header
  └─ Spring Boot /api/v1 (browser calls API directly)
       ├─ Spring Security: BCrypt, JWT cookie or bearer token, CSRF, CORS
       ├─ AuthController / UserController / ResourceController
       ├─ UserService / ResourceSearchService / SavedResourceService
       ├─ Spring Data JPA repositories → PostgreSQL
       │    └─ Flyway V1/V2; Hibernate validates schema
       └─ blocking RestClient integrations
            ├─ OpenStreetMap Nominatim: ZIP → coordinates
            └─ VA Facilities API sandbox: nearby facilities
```

### Frontend boundaries

- `frontend/app/` uses App Router route groups for organization. `(auth)` and `(dashboard)` do not add URL segments and do not have their own layouts.
- Root layout supplies metadata, CSS, `AuthProvider`, `Navbar`, and `Footer`. Dashboard, search, and saved pages are client components with local state and effects.
- `frontend/lib/api.ts` is the central API client; `types.ts` duplicates backend DTO/enumeration contracts manually.
- `frontend/lib/auth.ts` stores a profile and expiry metadata in localStorage. JWTs themselves are kept in an HttpOnly cookie, not localStorage. `/auth/me` verifies session state on mount.
- `ProtectedRoute` controls UI rendering; the backend is the real authorization boundary. No Next.js route handlers, Server Actions, middleware/proxy authorization, or frontend database integration were found.
- The production build prerenders all nine application routes; private data is fetched afterward in the browser. Static rendering of the page shell does not imply private data is included in generated HTML.

### Backend and data boundaries

- Java package `com.veteransconnect` contains controllers, DTO records, service interfaces/implementations, repositories, entities, security, clients, and exception handling.
- PostgreSQL tables: `users` (UUID, unique email, names, branch, ZIP, password hash, timestamps) and `saved_resources` (UUID, user foreign key, external source/ID, facility details, category, notes, timestamps).
- Saved resources have a unique `(user_id, external_id, source_api)` constraint and a user index. Reads use the authenticated principal; note updates/deletes explicitly verify ownership. User lookup endpoints restrict results to the caller.
- Flyway V1 creates the schema; V2 migrates `MARINES` to `MARINE_CORPS` and constrains branch values. Hibernate uses `ddl-auto=validate`, a positive separation of schema ownership.
- Authentication is custom Spring Security/JJWT, not Cognito, NextAuth/Auth.js, or another hosted identity provider. There is no confirmed Redis, queue, S3, SES, analytics SDK, payment integration, or WebSocket service.

## Technology inventory

Versions are declared or resolved repository versions, not assumed latest releases.

| Area | Confirmed technology/version | Evidence / notes |
| --- | --- | --- |
| Frontend framework | Next.js **16.1.1** | `frontend/package.json`, `bun.lock`; build explicitly uses webpack |
| UI runtime | React / React DOM **19.2.3** | Exact dependency pins |
| Language | TypeScript **5.9.3** locked, declared `^5` | Strict mode; `allowJs` and `skipLibCheck` enabled |
| Styling | Tailwind CSS / PostCSS plugin **4.1.18** locked | Declared `^4`; `globals.css`, `postcss.config.mjs` |
| Frontend package manager | Bun; local **1.3.8** | `bun.lock`; CI uses `latest`, Docker uses `oven/bun:1`; no `packageManager` pin |
| Lint / format | Biome **2.2.0** | Includes recommended React/Next rules |
| Frontend tests | Vitest **4.1.5**, jsdom **29.0.2** | React Testing Library **16.3.2**, jest-dom **6.9.1**, user-event **14.6.1** |
| Type packages | Node **20.19.27**, React **19.2.7**, React DOM **19.2.3** locked | Node types differ from local Node runtime |
| Image transitive dependency | sharp **0.34.5** locked | Relevant to framework security review; not a direct app dependency |
| Backend framework | Spring Boot **3.4.13** | Parent/BOM in `backend/pom.xml` |
| Java | Target **21**; CI and Docker **21** | Local verification ran on Temurin **25.0.2**, not Java 21 |
| Backend build | Maven wrapper **3.3.4**, Maven **3.9.9** | `.mvn/wrapper/maven-wrapper.properties` |
| HTTP / security / persistence | Spring Web MVC **6.2.15**, Spring Security **6.4.13**, Hibernate **6.6.39.Final** | Resolved libraries inspected in freshly built JAR |
| Database / migrations | PostgreSQL **15-alpine** Docker tag; JDBC **42.7.8**; Flyway **10.20.1** | Database patch/image digest unpinned; no live server version verified |
| JWT | JJWT API/implementation/Jackson **0.12.6** | Correct compile/runtime artifact separation |
| Code generation | Lombok | Boot-managed version; excluded from runtime JAR |
| Backend tests | Boot starter test, JUnit Jupiter, Mockito, AssertJ, Spring Security test, H2 | Managed through Boot; local H2 output reports **2.3.232** |
| Coverage | JaCoCo **0.8.14** | 70% bundle line coverage rule at `verify` |
| Operations | Actuator; Docker Compose; optional pgAdmin | No confirmed hosted monitoring/alerting |
| CI | GitHub Actions checkout/setup/cache/upload v4; setup-bun v2 | No deployment jobs; floating action tags |

Local Node is **24.13.0**. Workflow `NODE_VERSION: "20"` is declared but unused: there is no Node setup step. Do not infer that CI actually runs Node 20.

### Dependency age, support, and redundancy

**High — D1: Framework security updates are overdue.** Next 16.1.1 and locked sharp 0.34.5 predate subsequent security fixes. The official [October 14 Next.js update](https://nextjs.org/blog/nextjs-security-update-october-14-2026) identifies fixes in Next 16.4.1, including critical image-processing RCE on glibc Linux, critical Cache Components RCE, and Server Action denial of service. The latter two require application features not found here; image-path exploitability and the deployed libc/image must be verified. These are affected dependency versions, not a claim that every advisory is exploitable in this app. Review the [maintainer advisories](https://github.com/vercel/next.js/security/advisories) before selecting the upgrade target; 16.4.1 is a cited security baseline, not a promise of the latest safe version. Earlier [May 2026 fixes](https://vercel.com/changelog/next-js-may-2026-security-release) also postdate this pin. Upgrade Next and its compatible React dependencies together and rescan the resulting lockfile.

**High — D2: Spring Boot 3.4 is outside open-source support.** Spring explicitly identifies 3.4.13 as the final open-source 3.4 release in its [release announcement](https://spring.io/blog/2025/12/18/spring-boot-3-4-13-available-now/). Move to an appropriately supported line after compatibility testing. Old does not automatically mean a specific CVE is exploitable; a full backend advisory scan remains outstanding.

**Medium — D3: Runtime and tool versions are not reproducible across environments.** Bun `latest`, Bun Docker major tags, pgAdmin `latest`, and mutable Java/Postgres image tags can change independently. Node 20 in workflow metadata/types is stale; the [Node release schedule](https://github.com/nodejs/Release) places Node 20 EOL on April 30, 2026. Pin the runtime actually used and align documentation/types after compatibility validation.

**Low — D4: Redundant and conflicting configuration.** `assertj-core` is separately declared although `spring-boot-starter-test` already supplies it. `ignoreScripts` and `trustedDependencies` both name sharp and unrs-resolver; lockfile trust metadata names only sharp and its workspace name is stale (`fontend`). Confirm Bun's effective script policy and frozen-install behavior before cleanup; frozen install was not rerun in this audit. `lint:check` already includes formatter checks, making the separate format CI step partly redundant. No substantial unnecessary frontend runtime library was identified; adding a large dependency stack is not justified by discovery.

## Repository structure assessment

```text
/
├── .env.example                 shared local configuration template
├── .github/                    issue/PR templates; two CI workflows
├── README.md / CONTRIBUTING.MD
├── docker-compose.yml          local Postgres; optional tools/full-stack profiles
├── backend/
│   ├── pom.xml / mvnw / .mvn/   Java dependencies and wrapper
│   ├── Dockerfile
│   ├── src/main/java/com/veteransconnect/
│   │   ├── client/ config/ controller/ dto/ exception/
│   │   └── model/ repository/ security/ service/
│   ├── src/main/resources/      application properties; Flyway V1/V2
│   └── src/test/                unit, MVC slice, H2 repository/client tests
├── frontend/
│   ├── app/                    nine public/authenticated routes
│   ├── components/             auth, layout, resources, UI, legal rendering
│   ├── context/ lib/ test/
│   ├── public/                 currently empty locally
│   ├── package.json / bun.lock
│   └── Next / TS / Biome / Vitest / PostCSS / Docker configuration
└── docs/                       local historical guides, ignored by Git
```

The two-app monorepo is easy to navigate and does not require microservices or a monorepo orchestration package at this scale. DTOs keep password hashes out of normal API responses. There is no root task runner; developers must know the commands for both apps.

**Medium — R1: Fresh-clone onboarding is incomplete.** README instructs copying `frontend/.env.local.example`, but the file is ignored and untracked. `/docs` is also ignored/untracked, so local workflow/auth guides are absent from a fresh clone. Root and backend environment templates overlap and use different datasource conventions/defaults. Spring does not automatically load the root `.env` when launched with Maven; README correctly warns about this. Track intentional templates/docs and establish one authoritative configuration guide.

**Low — R2: Naming and contribution documentation drift.** The requested product is NextSITREP; repository/backend/README use VeteransConnect and current UI uses Veteran FOB. CONTRIBUTING ends at an empty getting-started section, and no tracked license or security-reporting policy was found. Choose canonical naming and complete concise contribution/setup/security instructions before public release. Ignored historical documents should not be treated as evidence that current controls pass.

## Existing features and implementation status

| Route / capability | Status | Implementation / limitations |
| --- | --- | --- |
| `/` | Implemented | Public landing and navigation; marketing scope exceeds confirmed resource providers |
| `/register` | Implemented, incomplete account lifecycle | Names/email/branch/ZIP/password; password confirmation and legal checkbox in UI; no email verification or persisted policy acceptance |
| `/login` | Implemented | BCrypt validation; HttpOnly JWT cookie; rate limiter; browser CSRF bootstrap |
| `/dashboard` | Implemented | Branch presentation, search shortcuts, saved counts/recent resources; downloads full saved list for summary |
| `/resources` | Implemented, limited directory | ZIP/category/keyword/radius; URL-driven intent; VA sandbox only; first page per facility type |
| `/saved` | Implemented | User-specific saved resources, category filter, notes editing, deletion |
| `/privacy`, `/terms`, `/disclaimer` | Implemented informational pages | Generic statements; no concrete data request contact/workflow; do not establish legal compliance |
| Session hydration / sign out | Implemented with gaps | `/me` plus localStorage cache; sign out clears cookie only if request succeeds; no token revocation |
| Account profile | Read-only | Self-lookup endpoints; no profile editing, password recovery/change, account export/delete/suspension workflow |
| Veteran-to-veteran connection | Not found | No messaging, groups, posts, user discovery, moderation, or community data model |
| Notifications / admin / analytics | Not found | No confirmed delivery integration, administrative UI, analytics SDK, or administrative role implementation |
| AWS dev/prod deployment | Not found in repository | Docker is local deployment scaffolding, not evidence of AWS provisioning |

### Confirmed API map

All routes below are on the Spring backend, not Next.js API routes.

| Method | Path | Access / behavior |
| --- | --- | --- |
| POST | `/api/v1/auth/register` | Public; CSRF required; creates account/session; rate limited |
| POST | `/api/v1/auth/login` | Public; CSRF required; authenticates/issues cookie; rate limited |
| POST | `/api/v1/auth/logout` | Public; CSRF required; expires browser cookie |
| GET | `/api/v1/auth/csrf` | Public; materializes CSRF cookie; 204 response |
| GET | `/api/v1/auth/me` | Authenticated; current profile/session metadata |
| GET | `/api/v1/users/{id}` | Authenticated; only caller's UUID |
| GET | `/api/v1/users` | Authenticated; self-only email/branch/ZIP filtering; empty list without filters |
| GET | `/api/v1/resources/search` | Authenticated; ZIP, optional category/keyword/radius; radius 1–100 miles |
| GET / POST | `/api/v1/resources/saved` | Authenticated; list / save for caller |
| PATCH | `/api/v1/resources/saved/{id}/notes` | Authenticated; owner only; 5,000-character limit |
| DELETE | `/api/v1/resources/saved/{id}` | Authenticated; owner only |
| GET | `/actuator/health` | Public authorization rule; Docker backend health check |

## Configuration and environment review

Real `.env` values were not printed or copied into this report. The local root file exists and is ignored; its variable names were checked. No full Git-history secret scan was performed, so this is not a finding that all historical secrets are safe.

| Variable group | Configuration and risk |
| --- | --- |
| `POSTGRES_HOST/PORT/DB/USER/PASSWORD` | Backend defaults to localhost and postgres credentials; Compose uses service hostname. Production must supply isolated database credentials, networking, TLS, and least-privilege users. |
| `SPRING_DATASOURCE_URL/USERNAME/PASSWORD` | Listed in backend example as Spring overrides; root template instead uses `POSTGRES_*`. Document override precedence and one deployment contract. |
| `JWT_SECRET`, `JWT_EXPIRATION` | Backend has a committed fallback signing key and 24-hour lifetime. No startup validation requiring a production secret. |
| `JWT_COOKIE_NAME/SECURE/SAME_SITE` | Defaults `vc_session`, false, Lax; HttpOnly, host-only, path `/`. Cookie topology and HTTPS handling require explicit production configuration. |
| `CORS_ALLOWED_ORIGINS` | Credentialed exact-origin allowlist; property defaults include localhost ports 3000/3001, template/Compose use 3000. Separate dev/prod origins are not configured. |
| `AUTH_RATE_LIMIT_*` | Attempts/window and forwarded-header trust configurable; process-local state. |
| `VA_API_KEY/BASE_URL` | Sandbox URL by default; placeholder keys are rejected when searching, not at startup. Live production API access is unconfirmed. |
| VA/geocoding timeouts and cache variables | Supported in properties/root template; Compose does not forward these optional knobs. |
| `SPRING_PROFILES_ACTIVE` | Template/Compose specify `dev`, but no dev/prod-specific property files or profile-gated safeguards exist. Merely setting `prod` does not introduce them. |
| Logging variables | SQL off / application INFO defaults; application code still logs sensitive search/account context. |
| `NEXT_PUBLIC_API_BASE_URL` | Public, build-time frontend value; Docker exposes build arg and runtime env, but runtime replacement does not rewrite the browser bundle. |
| `PGADMIN_*`, exposed ports | Optional local tooling with weak defaults; not suitable for public production exposure. |

## Prioritized security, privacy, and reliability findings

### Critical

**C1 — Known fallback JWT signing key permits forged sessions if deployed unchanged.** Evidence: `backend/src/main/resources/application.properties`, `security/JwtService.java`, `security/JwtAuthenticationFilter.java`. If `JWT_SECRET` is missing outside Compose, the application accepts a publicly known signing key. An attacker who knows an existing account email can forge a token for that subject. Compose requires a secret, which is a positive control, but direct Spring launches and future cloud definitions need equivalent fail-closed protection. Require environment-specific secrets at startup, prohibit the known default in production, and rotate it wherever it may have been used. No deployed compromise was tested or alleged.

**C1 remediation update (2026-11-04):** Code now requires JWT_SECRET and validates it at startup, rejecting missing/blank/malformed/short keys and the known legacy key. Tests pass. Rotation wherever the old key was used remains an operational requirement; no deployed secret rotation has been verified.

### High

**H1 — Browser CSRF transport assumes the frontend and backend share a hostname.** Evidence: `frontend/lib/api.ts`, `SecurityConfig.java`, `AuthController.java`. `/csrf` responds 204 and creates a backend cookie; the frontend reads `document.cookie` to construct the CSRF header. On `app.example.com` and `api.example.com`, the default host-only backend cookie is unreadable by frontend JavaScript. CORS does not make cookies readable across hosts. Separate AWS service hostnames can therefore cause login/save/update/logout to fail with 403. Cross-site hosting also requires evaluating SameSite, Secure, and browser third-party-cookie constraints. Prefer a shared browser origin with `/api` routing for this team; otherwise explicitly design and test token delivery. This is a deployment inference based on code and [browser cookie scoping](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies), not a tested AWS incident.

**H1 remediation update (2026-11-04):** Browser API calls now use relative paths and the existing Next server proxies `/api/*` to a server-only build-time upstream. Compose and setup examples use this contract; CSRF bootstrap errors stop writes. See README for static-hosting ingress requirements. Application tests and a local proxy smoke check are recorded with this change; public AWS HTTPS/cookie/CSRF validation remains a deployment gate.

**H2 — Production configuration is not enforced.** Evidence: application properties, Compose, Dockerfiles, `next.config.ts`. Cookie Secure defaults false; database credentials have local fallbacks; no production startup validation/profile exists. No repository-defined TLS termination, trusted proxy handling, private database rules, or secrets integration exists. Backend HSTS is configured, but TLS termination/forwarded scheme handling must be verified; frontend HSTS/CSP are not configured here. Build separate dev/prod configuration with mandatory secrets and HTTPS rules before public access. Existing frontend anti-framing, no-sniff, referrer, and permissions headers are useful.

**H2-A remediation update (2026-11-04):** Explicit local/test and shared hardened aws-dev/prod profiles, pre-infrastructure startup validation, mandatory deployed credentials/HTTPS origins, and Secure session/CSRF cookie enforcement are implemented. Flyway and Hibernate validation remain enabled; see backend/CONFIGURATION.md for compatibility and test evidence. H2-B/H2-C and actual AWS deployment/transport verification remain pending; this does not close all of H2.

**H3 — Authentication abuse protection is bypassable and retains keys indefinitely.** Evidence: `security/AuthRateLimiter.java`. The only bucket combines endpoint + IP + email, so rotating emails avoids a per-IP total limit and rotating IPs avoids an account limit. Map entries are never removed; arbitrary emails can grow memory. State resets on restart and is not shared across replicas. Forwarded-header trust is either disabled or accepts the first supplied address; trust must be tied to a protected ingress. Add bounded/expiring state and aggregate controls appropriate to the selected ingress. Do not introduce Redis solely because multiple instances are a future possibility.

**H4 — Private account and resource interests are retained beyond essential processing.** Evidence: `frontend/lib/auth.ts`, `ResourceSearchServiceImpl.java`, `SavedResourceServiceImpl.java`, privacy page. Profile identity/branch/ZIP persist in localStorage; INFO logs include email/resource details or ZIP/category/free-text searches, potentially revealing health/support interests. Notes have no account-level retention/export/delete implementation. Define data minimization, access and retention, redact logs, and establish an actionable data-request contact/process before real veteran data is collected. Database/backup encryption and access controls cannot be confirmed from source.

**H5 — Release checks omit important tests and the declared coverage gate.** Evidence: `.github/workflows/ci.yml`, `backend/pom.xml`. Frontend tests are not run in CI. Backend uses compile and `test`, not `verify`, so the 70% JaCoCo rule is not enforced. Clean local verification found **429/696 lines covered (61.64%)** and failed the gate despite 105 passing tests. The current working tree also fails formatting. Gate release on the actual required checks and focus added tests on authentication, authorization, persistence, and failure handling.

**H6 — The dependency workflow is not an effective vulnerability gate.** Evidence: `.github/workflows/dependency-check.yml`. Backend dependency tree/update reporting is not CVE scanning. Frontend runs `bun pm trust --all` before `npm audit`; the repository has a Bun lockfile, not an npm lockfile, and `|| true` suppresses errors/vulnerabilities. The trust command broadens lifecycle-script permissions. No successful vulnerability scan is established by this workflow. Use lockfile-aware checks with visible failures, deliberate lifecycle-script trust, and automated update review. See D1/D2 for verified framework concerns.

**H7 — Geocoding dependency has no application-wide quota enforcement.** Evidence: `client/GeocodingService.java` and root footer. Caching and timeouts exist, but concurrent uncached requests/replicas can exceed public Nominatim limits; no shared request throttle or single-flight suppression exists. The [Nominatim policy](https://operations.osmfoundation.org/policies/nominatim/) limits aggregate application traffic to one request/second and requires attribution. Visible footer credits VA only. Verify attribution throughout the product, the configured contact identity, caching behavior, and quota handling; evaluate a bounded ZIP lookup dataset or a suitable provider before increasing traffic.

**H8 — AWS operating boundaries are unspecified in the repository.** No Terraform/CDK/CloudFormation, AWS SDK integration, IAM policy, deploy workflow, environment promotion, backup/restore procedure, or production runbook was found. Before deployment, decide actual hosting, domain routing, private database placement, secret ownership, migrations, rollback, monitoring, and budget limits. This is an unresolved readiness requirement, not evidence of an insecure existing AWS account.

### Medium

**M1 — Session termination and recovery are incomplete.** `AuthController.logout` only clears the cookie; a copied bearer token remains valid until expiry. `AuthContext.logout` suppresses request failures, so a surviving cookie can restore a session on refresh. `/me` returns configured full lifetime rather than remaining token lifetime, while rehydration does not refresh persisted metadata. No recovery/change-password, email verification, token revocation, or account suspension state exists. Establish expected lifecycle behavior and test failed logout/session expiry; do not treat localStorage as authorization.

**M2 — Permission failures trigger global logout.** `frontend/lib/api.ts` treats both 401 and 403 as unauthorized. A valid session with CSRF/permission failure is signed out. `getCsrfToken` ignores bootstrap HTTP status. Separate session expiry, permission denial, and CSRF recovery and expose actionable errors.

**M3 — Validation and data integrity handling have gaps.** `UserRegistrationRequest` has no upper bounds for names/email/password; saved-resource fields mostly lack database-aligned length/format bounds and URL scheme validation. Email normalization occurs in the limiter, not account persistence/login; PostgreSQL string uniqueness is case-sensitive. Concurrent precheck-then-insert registrations/saves can hit constraints without a mapped conflict response. Unexpected enum/UUID/body conversion and integrity failures lack a consistent application error contract. Add bounded input rules, explicit canonical email handling, and safe constraint/error translation. Existing DTO validation, BCrypt, ownership checks, parameterized repository access, and React text rendering are positives; no SQL injection or stored HTML execution was demonstrated.

**M4 — Resource categories promise more than provider data establishes.** `ResourceCategory.java` maps education, housing, and financial assistance to the same `benefits` facility type; `ResourceSearchServiceImpl` labels returned facilities with the requested category. This does not verify that a facility provides the specific advertised service. Keyword matching only searches name/classification on the returned page. Clarify category semantics and use capability data or distinct providers before claiming comprehensive program discovery.

**M5 — Results may be incomplete or misleading.** `VaFacilitiesClient` requests `per_page=20` without following pagination. Missing distance values become `0.0`, displaying an unknown distance as zero and affecting sorting. Unfiltered search covers only three types; it is not an exhaustive directory. Expose pagination/partial-result limits and preserve unknown distances.

**M6 — Search latency and database resource pressure need measurement.** `ResourceSearchServiceImpl.search` wraps geocoding plus up to three sequential blocking HTTP calls in a read-only transaction. Depending on connection acquisition, a transaction/connection may remain open during network waits. All saved entities are then loaded merely to compute saved IDs. External failures abort the whole search; no overall deadline, partial-result behavior, quota control, or bounded provider-result cache exists. Measure requests and connection occupancy; shorten transaction scope and use projections before considering additional infrastructure.

**M7 — Saved-resource paths are unbounded.** Backend returns complete lists; dashboard downloads them to calculate counts and recent items, and the saved page filters them locally. There is no per-user save quota or pagination. A `(user_id, saved_at)` index may help ordering as data grows; confirm query plans first. Budget response sizes and queries rather than adding caching without measurements.

**M8 — Protected page effects start outside the guard's lifecycle.** Dashboard/saved pages initiate requests on mount even while their returned `ProtectedRoute` waits for session hydration. Resource search can also start from URL intent. Backend protection prevents unauthorized reads, but duplicate/early calls can race hydration or cause avoidable redirects. Search fetches lack AbortController/latest-request protection, so an older request can overwrite a newer result.

**M9 — Save/remove errors are invisible to users.** `ResourceCard.tsx` and `SavedResourceCard.tsx` log failures to console; the UI can appear unresponsive. Add inline error/retry feedback and deliberate duplicate-save behavior. Notes currently support plain-text display despite the modal's markdown wording.

**M10 — Accessibility has concrete structural gaps.** `NotesModal.tsx` focuses its textarea and supports Escape, but lacks a textarea label, focus containment, focus restoration, and background inertness. `Input`/`Select` error/hint text is not associated through `aria-describedby`/`aria-invalid`. Several `Link` elements wrap actual `Button` elements, creating nested interactive controls. Root layout `<main>` contains another `<main>` on dashboard; no skip link was found. Loading/results/filter state needs accessible announcements/selection semantics. `globals.css` forces smooth scrolling without a reduced-motion override. Responsive Tailwind breakpoints, HTML language, form labels, focus styles, and alert roles provide a useful baseline; keyboard/screen-reader, zoom/reflow, contrast, and real mobile behavior remain unverified.

**M11 — Security/persistence integration coverage is incomplete.** Controller tests exclude production security and use a permissive test chain with CSRF disabled. Filter/rate-limiter unit tests exist but do not prove the full cookie/CSRF/CORS flow. No SavedResourceService ownership/persistence test class, real PostgreSQL integration suite, full-app security suite, browser E2E, automated accessibility suite, or load tests were found. Add targeted production-chain and cross-user tests before expanding superficial coverage.

**M12 — Container delivery is development-oriented.** Neither Dockerfile sets a non-root user. Frontend copies the full builder directory including source/dev dependencies into runtime rather than a minimal standalone artifact; no frontend health check exists. Backend image packaging skips tests. Tags float, and CI does not build/scan/smoke-test these images. Local Compose publishes database and optional admin ports on all interfaces by default; keep these private/local. Verify graceful shutdown/readiness and resource limits for the actual AWS host.

**M13 — Frontend build artifacts are environment-coupled.** `NEXT_PUBLIC_API_BASE_URL` is compiled into browser code. An image built for development/localhost cannot be promoted unchanged by only changing runtime environment variables. CI currently builds with localhost. Select either per-environment builds or shared-origin API routing, and document the promotion model.

**M14 — Entity and time modeling can cause maintenance/privacy problems.** Lombok `@Data` includes sensitive fields such as `passwordHash` in generated `toString` and mutable associations in equality/hash behavior; accidental logging/debugging can expose data. Current DTO mapping avoids directly serializing entities. Entities/migrations use timezone-less `LocalDateTime`/SQL timestamps; browser interpretation and multi-environment clocks need a UTC/offset convention. Hibernate open-in-view is not explicitly disabled; verify transaction boundaries before changing it.

### Low

**L1 — Likely unused production code.** Repository-wide symbol search found no consumers of `PreferredContactMethod`, `GeocodingService.isValidZipCode`, `SavedResourceRepository.findByUserAndExternalIdAndSourceApi`, or frontend `isAuthenticated()` helper. Branch/ZIP user-list service methods have unit-test callers but are no longer called by the self-only controller. Confirm intended future use before removal. No explicit TODO/FIXME/HACK/XXX markers were found in the inspected application source; absence of markers does not imply completion.

**L2 — Type/API contract drift risk.** Java records and TypeScript interfaces/enums are maintained separately; `fetch` casts JSON without runtime shape validation. Consider a lightweight OpenAPI contract or generated types when API changes become frequent. Do not add a generation framework solely to eliminate this small amount of duplication.

**L3 — CI maintenance improvements.** Maven caching is configured twice (setup-java plus cache action); compile precedes test redundantly. Explicit minimum workflow permissions, action SHA pinning, concurrency cancellation, timeouts, and path-aware execution are absent. Prioritize correctness of gates over workflow optimization.

## Testing, linting, formatting, and build assessment

The following checks were executed without auto-fix options. Generated build/test artifacts changed under ignored `.next`/`target`; application sources and existing edits were not changed.

| Check | Result | Interpretation |
| --- | --- | --- |
| `bun run lint:check` in frontend | **Fail** | Biome reports formatting in existing `components/layout/Navbar.test.tsx`; no fixes applied |
| `bun run format:check` | **Fail** | Same file; both commands check formatting |
| `bun run type-check --incremental false` | **Pass** | Strict TypeScript check, without updating incremental cache |
| `bun run test:run` | **Pass** | 3 files, 8 tests: Navbar, AuthContext, API unauthorized behavior |
| `bun run build` | **Pass** | Next 16.1.1 webpack production build; nine application routes plus generated not-found |
| `./mvnw -o clean verify -B` in backend | **Fail at coverage** | Fresh compilation/JAR packaging succeeds; 105 tests pass, 0 failed/errors/skipped; line coverage 429/696 = 61.64%, below 70% |
| `./mvnw -o dependency:tree -B` | **Unavailable offline** | Dependency plugin prefix not available in local cache; resolved runtime inventory instead inspected in freshly packaged JAR |

The clean run is authoritative; an earlier non-clean run also failed coverage and was superseded. Java 25 emitted Jansi/Unsafe deprecation warnings; these are local-tool/runtime compatibility observations, not application test failures. H2/Flyway reports an unsupported-tested-version warning (H2 2.3.232 vs Flyway's tested H2 2.2.224); no migration failure occurred. H2 successfully exercised the two migrations but is not evidence of PostgreSQL migration compatibility.

Not executed: fresh/frozen dependency install, full registry vulnerability audit, Docker build/Compose startup, real PostgreSQL integration, live VA/Nominatim requests, browser/manual accessibility or performance profiling, AWS resource inspection, Git-history secret scanning. Local installed dependencies/cache were used. A passing frontend build does not establish secure dependencies, working live integrations, or production browser authentication.

## Recommended audit order and approval gates

1. **Critical/High — Security baseline and dependency support.** Require unique environment secrets, reject fallback keys, validate production cookie settings, update supported Next/React/Spring versions, and establish effective dependency/secret scanning. Exit: no known-default signing key accepted in production, supported dependencies reviewed, actionable scans passing.
2. **High — Browser authentication and AWS environment design.** Decide actual domains/ingress, API routing, trusted proxies, dev/prod isolation, database placement/TLS, and public build-variable strategy. Exit: browser registration/login/search/save/update/logout work over the intended HTTPS topology with production CSRF/CORS controls active.
3. **High — Trustworthy release gates.** Run frontend tests and backend `verify` in CI; fix formatting after approval; add focused cross-user authorization, session, CSRF, and PostgreSQL migration tests. Exit: agreed checks and existing coverage threshold pass on a fresh build; no silent scanner errors.
4. **High/Medium — Data privacy and account lifecycle.** Minimize persistent profile/log data, define retention/access/deletion and recovery, document support ownership, and reconcile policy statements with implemented behavior. Exit: an operationally usable account/data request process and tested session termination expectations.
5. **High/Medium — Resource correctness and provider reliability.** Confirm live VA access, category semantics, provider attribution/quotas, pagination, unknown-distance handling, bounded inputs, error contracts, and concurrency behavior. Exit: accurate claims/results and clear failure states under provider errors or rate limits.
6. **Medium — Accessibility and frontend behavior.** Correct dialog/forms/interactive semantics, nested landmarks, result announcements, fetch races, and user-facing mutation errors; verify mobile, keyboard, zoom, and screen-reader paths. Exit: core journeys pass agreed accessibility and responsive checks.
7. **Medium — Measured performance and operational delivery.** Profile network/database paths, shorten transactions, bound list endpoints, minimize/non-root containers, and verify health/readiness, migration rollout, restore, rollback, and alerts. Exit: a staging deployment with smoke checks, restore evidence, and a cost-reviewed operating plan.
8. **Low — Maintainability and repository hygiene.** Track onboarding templates/runbooks, reconcile naming, remove confirmed dead code, simplify redundant tooling, and consider contract generation only if its maintenance cost is justified.

For a limited-budget team, keep the existing two-app architecture unless measurements show a concrete need to change it. Shared-origin API routing and automated checks can remove substantial risk without adding multiple new services. AWS service selection and cost estimates require a separate approved design using actual traffic, availability, data, and budget requirements; no cloud resources were provisioned during discovery.

**Phase 1 is complete. Approval is required before application, configuration, dependency, or infrastructure remediation begins.**
