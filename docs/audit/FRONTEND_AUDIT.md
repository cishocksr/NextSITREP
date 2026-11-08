# NextSITREP frontend audit

Date: November 2, 2026 (America/New_York). Repository root: `/Users/agoge/Developer/repos/github/veterans-connect`. Baseline: commit `5a99f2f` plus the ten pre-existing modified frontend files. Line references describe this working tree and will change after remediation.

## Scope, evidence, and conclusions

Every frontend application page, layout, component, context/custom hook, utility, test, and relevant configuration file was reviewed individually. The report also checks backend contracts where they determine frontend behavior. No application, test, dependency, or configuration code was changed. `PROJECT_AUDIT.md` remains the broader discovery report.

The frontend has a sensible small-team foundation: App Router, strict TypeScript, a small dependency set, reusable UI primitives, typed DTOs, native form validation, and some useful authentication regression tests. Public pages are Server Components; authenticated pages and interactive forms are client components. Passing Server Component children through `AuthProvider` does **not** automatically convert those children to Client Components. A wholesale framework/state-management rewrite is not justified.

Production blockers center on dependency security, deployment-sensitive CSRF, unreliable sign-out, accessible notes editing, contrast, and incomplete release gates. Search correctness and account-state handling need attention before polishing component organization.

### Evidence labels and estimates

- **Confirmed defect:** Directly established by source, executed checks, or browser observation. Some defects require a stated trigger, such as a failed request; this does not mean that trigger occurred during browser testing.
- **Conditional risk:** A demonstrated design assumption becomes a problem under the stated deployment, input, or timing conditions; no exploit or live incident is claimed.
- **Potential improvement:** A maintainability, performance, or defense-in-depth opportunity; not proof of a current user-visible failure.
- **Severity:** Critical = demonstrated severe compromise/blocker; High = substantial production/security/accessibility/release risk; Medium = meaningful correctness/usability/maintainability issue; Low = limited-impact cleanup or refinement. **No Critical frontend exploit was confirmed.** The previous backend signing-key finding is outside this frontend finding count.
- **Complexity:** Small = localized change, usually under half a day; Medium = coordinated files and regression checks, usually 0.5–2 engineering days; Large = frontend/backend/deployment coordination, usually 2–5+ days. Estimates are effort ranges, not commitments; overlapping fixes should be planned together.

### Verification performed

| Check | Outcome and limits |
| --- | --- |
| Individual source review | All files in the inventory below; no `hooks/` directory exists. `useAuth` is the custom hook; local hooks are listed separately. |
| Biome `lint:check` and `format:check` | Both fail only on formatting in `Navbar.test.tsx:28–30,61–63`; no auto-fixes applied. |
| `bun run type-check --incremental false` | Pass. Does not validate runtime JSON/localStorage shapes. |
| `bun run test:run` | Pass: 3 files, 8 tests. No browser layout/accessibility coverage. |
| Production build | Pass: fresh `bun run build` completed with nine application routes plus generated not-found; webpack, TypeScript and prerendering succeeded. |
| Browser inspection | Existing production build served locally on loopback port 3100; six public routes inspected at 320px width. Landing inspected at 1440px. Public routes had document scroll width 320px at the mobile viewport. |
| Unauthenticated routes | `/dashboard`, `/resources`, `/saved` redirected to `/login` in the local browser with no authenticated session. |
| DOM/style checks | Landing has five `a button` descendants; registration labels are present, ZIP hint is unassociated, inputs compute to 14px; footer text is slate-400 on white. Legal pages share the generic document title. |
| Contrast calculation | Observed slate-400 `oklch(0.704 0.04 256.788)` against white computes to approximately **2.63:1**, below 4.5:1 for normal text. |
| Bundle inspection | Local prerender HTML script references were mapped to built files, including shared runtime and polyfill scripts. Landing: approximately **508.4 KiB raw / 157.9 KiB gzip**; dashboard: **529.6 / 164.3**; resources: **525.1 / 163.6**; saved: **524.9 / 163.5**. These are per-file gzip estimates, not measured browser transfer or user performance. |

Authenticated browser journeys, real provider calls, browser storage failures, real-device iOS/Android behavior, screen readers, axe/Lighthouse, Core Web Vitals, and production ingress were not exercised. Authenticated-page findings are source-based. No accounts were created or user data changed. A 320px layout check is not a 400% zoom or WCAG conformance audit. Browser viewport override was reset and the temporary tab/server were closed after inspection.

## Individual review inventory

Each file has its own disposition below; shared defects are documented once under a finding ID, with all relevant locations rather than duplicated findings. Paths link to their absolute workspace location.

### Routes and layout

| Route / file | Individual assessment |
| --- | --- |
| `/` — [frontend/app/page.tsx:1–152](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/page.tsx:1) | Server-rendered marketing page; useful headings/grid. Nested interactive CTAs, scope overclaims, decorative emoji; F16, F29, F36. |
| Root — [frontend/app/layout.tsx:1–34](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/layout.tsx:1) | Server layout, correct language and metadata API, composed auth shell. Missing bypass link; dashboard nests main; global session bootstrap; F19, F28, F31. |
| `/login` — [frontend/app/(auth)/login/page.tsx:1–28](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(auth)/login/page.tsx:1) | Good server page/client form split; distinct metadata and h1. Shared auth/navigation/recovery limitations; F03, F20, F30, F36. |
| `/register` — [frontend/app/(auth)/register/page.tsx:1–30](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(auth)/register/page.tsx:1) | Good server wrapper; compact card fits 320px. Shared form/mobile/consent limitations; F20, F21, F30, F36. |
| `/dashboard` — [frontend/app/(dashboard)/dashboard/page.tsx:1–544](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/dashboard/page.tsx:1) | Functional branch-themed dashboard; large client module combines data, presentation, and search. Nested main, early effect, misleading failed-load summaries; F04, F11, F19, F27–F31. |
| `/resources` — [frontend/app/(dashboard)/resources/page.tsx:1–192](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/resources/page.tsx:1) | Suspense correctly surrounds `useSearchParams`; explicit initial/loading/error/empty states. Request/state/URL validation defects; F04, F08–F10, F18, F29, F31. |
| `/saved` — [frontend/app/(dashboard)/saved/page.tsx:1–163](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/saved/page.tsx:1) | Functional local category filtering, functional array updates. Early load, disappearing filter bug, missing selection/status semantics; F04, F12, F16, F18, F28, F31. |
| `/privacy` — [frontend/app/privacy/page.tsx:1–62](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/privacy/page.tsx:1) | Server page reusing LegalPage; plain text safely rendered. No request contact; broad generic policy and metadata; F23, F31, F36. |
| `/terms` — [frontend/app/terms/page.tsx:1–62](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/terms/page.tsx:1) | Server page, structured sections; operator/acceptance capabilities need reconciliation; F21, F31, F36. No legal enforceability conclusion. |
| `/disclaimer` — [frontend/app/disclaimer/page.tsx:1–40](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/disclaimer/page.tsx:1) | Server page with useful limitations language. Shared generic title/branding; F31, F36. Existing support numbers were not independently revalidated in this audit. |
| Styles — [frontend/app/globals.css:1–23](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/globals.css:1) | Tailwind v4 integration, system fonts and simple theme. Reduced-motion refinement; F36. No external font download to optimize. |

There are no nested route-group layouts, custom `loading.tsx`, `error.tsx`, `global-error.tsx`, `not-found.tsx`, API route handlers, Server Actions, or custom middleware/proxy files in the frontend. Absence of each is not inherently a defect; recovery and layout opportunities are scoped in F27/F32.

### Components

| File / exported component | Individual assessment |
| --- | --- |
| [frontend/components/layout/Navbar.tsx:1–111](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/layout/Navbar.tsx:1) — Navbar | Auth-sensitive links and responsive split. No loading branch or `aria-current`; nested link/buttons and narrow-screen wrapping; F16, F18, F30. |
| [frontend/components/layout/Footer.tsx:1–45](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/layout/Footer.tsx:1) — Footer | Server Component, named legal navigation, provider disclaimer. Low contrast, omitted geocoding credit, non-actionable support text; F15, F23, F29. |
| [frontend/components/layout/ProtectedRoute.tsx:1–27](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/layout/ProtectedRoute.tsx:1) — ProtectedRoute | Correctly hides children while loading and replaces login route. UI boundary only; parent effects already run; does not preserve intended destination; F04, F30. |
| [frontend/components/auth/LoginForm.tsx:1–82](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/auth/LoginForm.tsx:1) — LoginForm | Correct autocomplete, native input types, password masking, alert and pending button. Missing field-level server feedback/recovery; F03, F20, F30. |
| [frontend/components/auth/RegisterForm.tsx:1–217](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/auth/RegisterForm.tsx:1) — RegisterForm | Useful branch/password/checkbox checks and autocomplete. Broad setter weakens field types, legal acceptance only local, error UX; F20, F21, F26. |
| [frontend/components/resources/ResourceFilters.tsx:1–122](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/resources/ResourceFilters.tsx:1) — ResourceFilters | Reusable search form and typed callback. Four prop-to-state effects, duplicated dashboard fields, invalid URL defaults, missing mobile hints; F09, F10, F27, F30. |
| [frontend/components/resources/ResourceCard.tsx:1–136](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/resources/ResourceCard.tsx:1) — ResourceCard | Typed props, stable identity at caller, escaped text, safe new-tab rel. Hidden mutation failures, URL trust, provider limitations, shared contrast/context; F13, F15, F24, F25, F29. |
| [frontend/components/resources/SavedResourceCard.tsx:1–174](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/resources/SavedResourceCard.tsx:1) — SavedResourceCard | Functional notes/delete actions, text-only preview, native confirm. Hidden removal failures, modal lifecycle and expansion semantics; F12–F15, F24, F25. |
| [frontend/components/resources/NotesModal.tsx:1–126](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/resources/NotesModal.tsx:1) — NotesModal | Dialog name, initial focus, Escape cleanup, character cap and displayed errors. Incomplete modal behavior, unnamed textarea, close/save race and misleading Markdown instructions; F14, F15, F17, F22, F23, F25. |
| [frontend/components/ui/Input.tsx:1–44](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/ui/Input.tsx:1) — Input | Native attributes/ref, visible labels, focus ring. Hint/error associations, label-derived IDs and low-contrast placeholders; F15, F20, F26. |
| [frontend/components/ui/Select.tsx:1–58](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/ui/Select.tsx:1) — Select | Native select semantics/ref/options. Shared IDs/error semantics, hidden native arrow; F20, F26, F30. |
| [frontend/components/ui/Button.tsx:1–93](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/ui/Button.tsx:1) — Button | Native props/ref, disabled/pending control and focus styling. Navigation consumers misuse native button; pending announcement absent; F16, F18. `forwardRef` remains workable; migrating it is not a production priority. |
| [frontend/components/ui/LoadingSpinner.tsx:1–39](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/ui/LoadingSpinner.tsx:1) — LoadingSpinner | Decorative SVG hidden from AT; visible message optional. No status/live semantics, silent without message; F18. |
| [frontend/components/ui/Alert.tsx:1–46](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/ui/Alert.tsx:1) — Alert | Typed variants, escaped text, dismissal label and `role=alert`. All severities are assertive; small icon target; F18, F25. |
| [frontend/components/ui/Badge.tsx:1–17](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/ui/Badge.tsx:1) — Badge | Simple, appropriately presentational; typed children, text label so category is not color-only. No independent defect found. |
| [frontend/components/legal-page.tsx:1–63](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/legal-page.tsx:1) — LegalPage | Useful server-side reuse, safe text/list rendering, proper heading levels. Shared brand/content configuration and route titles could improve; F31, F36. No need for a client boundary. |

### Context, hooks, utilities, and tests

| File / hook or utility | Individual assessment |
| --- | --- |
| [frontend/context/AuthContext.tsx:1–161](/Users/agoge/Developer/repos/github/veterans-connect/frontend/context/AuthContext.tsx:1) — AuthProvider/useAuth | Explicit context typing, stable callbacks, mount guard and version protection against late startup `/me`. Remaining logout, storage, timer, and early-request races; F03–F07, F28. `useAuth` correctly throws outside provider. |
| Same file: session effect `75–106` | `/me` is authoritative but localStorage access precedes try/catch; transient errors clear session; F05–F07. |
| Same file: expiry effect `109–117` | Cleans timeout but depends on client metadata and lacks cross-tab synchronization; F07. |
| Same file: callbacks `47–72,119–137` | Startup response race partly addressed; asynchronous logout/login ordering remains; F03. |
| [frontend/lib/auth.ts:1–52](/Users/agoge/Developer/repos/github/veterans-connect/frontend/lib/auth.ts:1) | JWT not stored in localStorage; profile is. JSON syntax check is not schema validation, storage exceptions unhandled; F05–F07, F26. |
| [frontend/lib/api.ts:1–166](/Users/agoge/Developer/repos/github/veterans-connect/frontend/lib/api.ts:1) | Central typed API surface, credentials, encoded search params, 204 support. CSRF topology, 403 logout, unchecked runtime shapes, no bounded/cancellable public methods; F02, F08, F09, F24, F26, F33. |
| [frontend/lib/types.ts:1–131](/Users/agoge/Developer/repos/github/veterans-connect/frontend/lib/types.ts:1) | Good union/Record coverage and explicit nullable facility fields. Duplicate DTO shape and unused ApiError, unchecked runtime boundaries; F06, F26. No explicit `any`. |
| [frontend/context/AuthContext.test.tsx:1–146](/Users/agoge/Developer/repos/github/veterans-connect/frontend/context/AuthContext.test.tsx:1) | Three useful auth tests, including late startup-failure regression. Does not cover failed logout/storage/cross-tab behavior; F34. |
| [frontend/lib/api.test.ts:1–71](/Users/agoge/Developer/repos/github/veterans-connect/frontend/lib/api.test.ts:1) | Three unauthorized tests; CSRF bootstrap receives same mocked response as mutation, so it does not prove successful bootstrap/error handling; F34. |
| [frontend/components/layout/Navbar.test.tsx:1–69](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/layout/Navbar.test.tsx:1) | Two guest/auth tests; styling assertion omits active-state semantics. Current formatting breaks checks; F18, F34, F35. |
| [frontend/test/setup.ts:1–70](/Users/agoge/Developer/repos/github/veterans-connect/frontend/test/setup.ts:1) | RTL cleanup and typed Next mocks; global Link/router mocks cannot establish real navigation or responsive semantics; F34. |
| [frontend/test/next-navigation.ts:1–39](/Users/agoge/Developer/repos/github/veterans-connect/frontend/test/next-navigation.ts:1) | Typed access/reset helpers; suitable small test utility. `setMockSearchParams` currently has no test consumers; cleanup opportunity F26. |

Dashboard memo hooks (`214–233`) have appropriate dependencies; avoid removing memoization or adding more without measurements. Resource search callback/effect (`56–95`) and intent-key memo (`44–53`) are covered in F08–F10. Filter effects (`48–62`) synchronize individual defaults but make two sources of truth; F27. Modal effects (`21–31`) clean the key listener but do not implement a modal focus lifecycle; F17. No conditional hook invocation or demonstrated infinite-render loop was found.

### Build, configuration, assets, and workflow files

| File | Individual assessment |
| --- | --- |
| [frontend/package.json:1–44](/Users/agoge/Developer/repos/github/veterans-connect/frontend/package.json:1) | Minimal runtime dependencies; useful separate check scripts; old pins and inconsistent script trust; F01, F35, F37. |
| [frontend/bun.lock:1–31](/Users/agoge/Developer/repos/github/veterans-connect/frontend/bun.lock:1) and `376–412` | Locked Next/React/sharp and tooling; stale workspace/trust metadata; F01, F37. |
| [frontend/next.config.ts:1–31](/Users/agoge/Developer/repos/github/veterans-connect/frontend/next.config.ts:1) | Useful baseline security headers; CSP/HSTS and standalone delivery decisions remain; F24, F38. |
| [frontend/tsconfig.json:1–34](/Users/agoge/Developer/repos/github/veterans-connect/frontend/tsconfig.json:1) | Strict and noEmit with standard Next plugin/aliases. `allowJs`/`skipLibCheck` are not proof of a bug; optional indexed-access tightening; F26. |
| [frontend/biome.json:1–37](/Users/agoge/Developer/repos/github/veterans-connect/frontend/biome.json:1) | Recommended React/Next rules and formatting; no blanket application-code suppression found. Shared format check redundancy; F35. |
| [frontend/vitest.config.ts:1–14](/Users/agoge/Developer/repos/github/veterans-connect/frontend/vitest.config.ts:1) | Correct alias, jsdom, setup. No coverage configuration/browser suite; F34. |
| [frontend/postcss.config.mjs:1–7](/Users/agoge/Developer/repos/github/veterans-connect/frontend/postcss.config.mjs:1) | Correct Tailwind v4 plugin wiring; no independent issue found. |
| [frontend/Dockerfile:1–25](/Users/agoge/Developer/repos/github/veterans-connect/frontend/Dockerfile:1) | Frozen install and multi-stage build; whole build tree copied, mutable runtime, environment-coupled bundle; F33, F37, F38. |
| [frontend/.dockerignore:1–6](/Users/agoge/Developer/repos/github/veterans-connect/frontend/.dockerignore:1) | Excludes node_modules/build/cache and two env files, misses other env variants; F38. |
| [frontend/.gitignore:1–41](/Users/agoge/Developer/repos/github/veterans-connect/frontend/.gitignore:1) | Generated files ignored; env example also ignored; F37. |
| [frontend/.env.local.example:1–6](/Users/agoge/Developer/repos/github/veterans-connect/frontend/.env.local.example:1) | Local untracked template; recommends separate API hostname without solving CSRF transport; F02, F37. No real secret included in this report. |
| [frontend/README.md:1–43](/Users/agoge/Developer/repos/github/veterans-connect/frontend/README.md:1) | Local ignored documentation with valid check commands; unavailable in fresh clone; F37. |
| [.github/workflows/ci.yml:72–122](/Users/agoge/Developer/repos/github/veterans-connect/.github/workflows/ci.yml:72) | Lint/format/types/build present, frontend tests omitted, Bun floats; F34, F37. |
| [.github/workflows/dependency-check.yml:41–65](/Users/agoge/Developer/repos/github/veterans-connect/.github/workflows/dependency-check.yml:41) | Audit command errors suppressed; broad script trust; F01, F37. |
| `frontend/app/favicon.ico` / `frontend/public/` | Favicon exists; public directory empty. No image-heavy page, remote font, or app image asset requiring conversion to next/image was found. Generated `next-env.d.ts`, `.next`, caches, and node_modules are not authored components. |

## Findings

### F01 — Framework and transitive image dependency security

**Component:** Frontend dependency/runtime boundary. **Severity: High. Status: Confirmed dependency gap; exploitability conditional. Complexity: Medium.**

**Locations:** [frontend/package.json:17–20](/Users/agoge/Developer/repos/github/veterans-connect/frontend/package.json:17); [frontend/bun.lock:376–412](/Users/agoge/Developer/repos/github/veterans-connect/frontend/bun.lock:376); [.github/workflows/dependency-check.yml:61–65](/Users/agoge/Developer/repos/github/veterans-connect/.github/workflows/dependency-check.yml:61).

**Issue:** Next 16.1.1, React/React DOM 19.2.3, and locked sharp 0.34.5 predate subsequent coordinated security fixes. The official [October 14 update](https://nextjs.org/blog/nextjs-security-update-october-14-2026) fixes critical issues in Next 16.4.1, including image-processing RCE on glibc Linux, plus feature-dependent Cache Components RCE and Server Action DoS. No application `use cache`, Server Actions, or next/image usage was found; those conditions must not be assumed. A server image route may still exist independently of page image usage. No exploit was attempted.

**Why it matters:** An old framework/runtime dependency can expose the deployed server, even when UI code looks safe. Current audit workflow suppresses failure and cannot be trusted as a clean security signal.

**Recommended solution:** Select current compatible patched Next/React versions using maintainer advisories, regenerate/inspect Bun lockfile, run lockfile-aware scanning and deployment smoke checks. The cited version is a security baseline, not a promise of the latest safe release. Remove blanket trust and swallowed scanner failures.

### F02 — CSRF token transport breaks with separate API hostnames

**Component:** API client/authentication integration. **Severity: High. Status: Conditional deployment defect. Complexity: Large.**

**Locations:** [frontend/lib/api.ts:12–16](/Users/agoge/Developer/repos/github/veterans-connect/frontend/lib/api.ts:12), [frontend/lib/api.ts:32–67](/Users/agoge/Developer/repos/github/veterans-connect/frontend/lib/api.ts:32); [frontend/.env.local.example:5–6](/Users/agoge/Developer/repos/github/veterans-connect/frontend/.env.local.example:5). Contract evidence: [backend/src/main/java/com/veteransconnect/config/SecurityConfig.java:49–55](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/config/SecurityConfig.java:49); [backend/src/main/java/com/veteransconnect/controller/AuthController.java:139–152](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/controller/AuthController.java:139).

**Issue:** Frontend fetches `/csrf`, then reads its own `document.cookie`. Backend returns 204 and uses its default host-scoped CSRF cookie. At `app.example.com` versus `api.example.com`, JavaScript on the frontend cannot read that API-host cookie; the required write header is omitted. Merely allowing CORS does not solve this.

**Why it matters:** Login, registration, save, notes, and sign-out can fail after AWS deployment while local same-host/different-port development works.

**Recommended solution:** Prefer shared-origin `/api` ingress, or explicitly redesign CSRF token transport with backend collaboration. Test real HTTPS domains, cookie Secure/SameSite, credentialed requests, and browser cookie restrictions. See [browser cookie scope](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies). Do not disable CSRF to make the deployment work.

### F03 — Sign-out can appear successful while the session remains active

**Component:** AuthProvider logout and authentication callbacks. **Severity: High. Status: Confirmed failure-path defect. Complexity: Medium.**

**Locations:** [frontend/context/AuthContext.tsx:47–55](/Users/agoge/Developer/repos/github/veterans-connect/frontend/context/AuthContext.tsx:47), [frontend/context/AuthContext.tsx:119–137](/Users/agoge/Developer/repos/github/veterans-connect/frontend/context/AuthContext.tsx:119); [frontend/lib/api.ts:116–126](/Users/agoge/Developer/repos/github/veterans-connect/frontend/lib/api.ts:116).

**Issue:** Logout fires a request without awaiting it, ignores failure, clears UI state, and redirects. Failed network/CSRF means the HttpOnly cookie survives and `/me` can restore the session on reload. A delayed logout response can also expire a newly issued cookie if the user signs back in before it finishes. Startup `/me` version protection does not coordinate these requests.

**Why it matters:** Users on shared devices cannot rely on the displayed signed-out state; rapid authentication transitions can leave UI and cookie inconsistent.

**Recommended solution:** Expose an async sign-out state, coordinate/invalidate auth transitions, await server confirmation, and display explicit retry feedback if cookie invalidation fails. Keep local data hidden while ending the session. Backend revocation policy is a separate coordinated decision.

### F04 — Protected page requests start before authentication settles

**Component:** DashboardPage, SavedPage, ResourcesContent, ProtectedRoute. **Severity: Medium. Status: Confirmed lifecycle defect; race outcome conditional. Complexity: Medium.**

**Locations:** [frontend/app/(dashboard)/dashboard/page.tsx:195–212](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/dashboard/page.tsx:195); [frontend/app/(dashboard)/saved/page.tsx:22–38](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/saved/page.tsx:22); [frontend/app/(dashboard)/resources/page.tsx:72–98](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/resources/page.tsx:72); [frontend/components/layout/ProtectedRoute.tsx:8–26](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/layout/ProtectedRoute.tsx:8); [frontend/lib/api.ts:75–77](/Users/agoge/Developer/repos/github/veterans-connect/frontend/lib/api.ts:75).

**Issue:** A guard returned by a page does not prevent that page's hooks from running. Requests start while `/me` hydrates or on an unauthenticated deep link; a late 401 can invoke global logout during a new authentication transition. There is no session-scoped cancellation or result invalidation.

**Why it matters:** Unnecessary failed calls and redirect/sign-out races complicate core navigation. This is not a backend authorization bypass; private APIs remain protected.

**Recommended solution:** Mount data-fetching children only after confirmed session, or gate requests on resolved auth and scope them to the current account/session generation. Cancel/ignore stale work on logout/account change. A group layout helps only if the fetching component actually sits below its guard.

### F05 — Browser storage failures can strand authentication

**Component:** auth storage helpers and AuthProvider session effect. **Severity: Medium. Status: Confirmed failure-path defect. Complexity: Medium.**

**Locations:** [frontend/lib/auth.ts:6–47](/Users/agoge/Developer/repos/github/veterans-connect/frontend/lib/auth.ts:6); [frontend/context/AuthContext.tsx:80–98](/Users/agoge/Developer/repos/github/veterans-connect/frontend/context/AuthContext.tsx:80), [frontend/context/AuthContext.tsx:109–117](/Users/agoge/Developer/repos/github/veterans-connect/frontend/context/AuthContext.tsx:109).

**Issue:** localStorage operations can throw. Initial reads occur before the session effect's try/finally, so a storage exception can leave `isLoading` true indefinitely and skip `/me`. A write failure after successful server login makes the form report failure despite a valid cookie. `clearAuth` can throw before UI cleanup.

**Why it matters:** Restricted storage, quota failures, or browser policy can block access even though the server session works.

**Recommended solution:** Make browser persistence optional and exception-safe; put the complete bootstrap inside a guaranteed finally path; retain in-memory session state and treat `/me` as authoritative. Test denied reads/writes and corrupt data.

### F06 — Local profile persistence is excessive and unchecked

**Component:** auth.ts, AuthProvider, branch-dependent dashboard. **Severity: Medium. Status: Confirmed persistence/schema gap; crash conditional on data. Complexity: Medium.**

**Locations:** [frontend/lib/auth.ts:8–18](/Users/agoge/Developer/repos/github/veterans-connect/frontend/lib/auth.ts:8), [frontend/lib/auth.ts:33–40](/Users/agoge/Developer/repos/github/veterans-connect/frontend/lib/auth.ts:33); [frontend/context/AuthContext.tsx:80–89](/Users/agoge/Developer/repos/github/veterans-connect/frontend/context/AuthContext.tsx:80); [frontend/app/(dashboard)/dashboard/page.tsx:185–187](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/dashboard/page.tsx:185), [frontend/app/(dashboard)/dashboard/page.tsx:255–260](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/dashboard/page.tsx:255).

**Issue:** Name/email/branch/ZIP persist without a storage TTL on the profile itself. `JSON.parse` is implicitly trusted as the declared user shape. Cached `{}` or an invalid branch can reach `branchThemes[...]` as undefined and cause a render exception before server reconciliation. Navbar can briefly display stale identity while loading.

**Why it matters:** Shared-device privacy and resilience are weakened; compile-time types do not validate local data. JWTs are correctly absent from localStorage, and tampering does not grant backend access.

**Recommended solution:** Prefer minimal in-memory profile plus cookie-based `/me`; otherwise validate a versioned cache schema, discard invalid/stale profiles and avoid rendering unverified identity. Add runtime validation at the API boundary as well (F26).

### F07 — Expiry and account state are not synchronized across tabs

**Component:** AuthProvider expiry effect and storage metadata. **Severity: Medium. Status: Conditional correctness risk. Complexity: Medium.**

**Locations:** [frontend/context/AuthContext.tsx:86–117](/Users/agoge/Developer/repos/github/veterans-connect/frontend/context/AuthContext.tsx:86); [frontend/lib/auth.ts:22–30](/Users/agoge/Developer/repos/github/veterans-connect/frontend/lib/auth.ts:22). Contract: [backend/src/main/java/com/veteransconnect/controller/AuthController.java:124–136](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/controller/AuthController.java:124).

**Issue:** Hydration deliberately does not persist `/me`; a cookie-only restored session may have no expiry timer. Invalid/expired metadata does not create a reliable timer. `/me` returns configured lifetime rather than actual remaining lifetime, so simply resetting the timer from it would be incorrect. No storage/BroadcastChannel listener coordinates sign-out or account switching in another tab.

**Why it matters:** UI can retain the wrong account name/data until a later API call; an older tab timer may clear a newer shared-cookie session.

**Recommended solution:** Agree on absolute server expiry, synchronize auth events across tabs, and clear user-scoped data on account changes. Use server responses as authority; local timers are only a UX convenience.

### F08 — Search errors can label old results with a new location; requests can race

**Component:** ResourcesContent.handleSearch. **Severity: Medium. Status: Confirmed state defect; response-order failure conditional. Complexity: Medium.**

**Locations:** [frontend/app/(dashboard)/resources/page.tsx:56–70](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/resources/page.tsx:56), [frontend/app/(dashboard)/resources/page.tsx:125–163](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/resources/page.tsx:125).

**Issue:** Search A succeeds; search B sets `lastSearch` immediately but fails without clearing A's results. After loading ends, A's cards are shown under B's ZIP alongside the error. Concurrent automatic/manual searches have no cancellation or latest-request identity; a slower old response can overwrite current results and clear the pending state prematurely.

**Why it matters:** Veterans can act on resources for the wrong location or filters.

**Recommended solution:** Store data with the parameters of the successful response; use an explicit request state and a latest-request guard/AbortSignal. Clear old results or clearly label retained results as stale. Test A-success/B-failure and reversed response order.

### F09 — URL filter parsing accepts inherited categories and inconsistent radii

**Component:** ResourcesContent parameter parsing, ResourceFilters, API search serialization. **Severity: Medium. Status: Confirmed input-validation defect. Complexity: Small.**

**Locations:** [frontend/app/(dashboard)/resources/page.tsx:29–36](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/resources/page.tsx:29), [frontend/app/(dashboard)/resources/page.tsx:72–85](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/resources/page.tsx:72), [frontend/app/(dashboard)/resources/page.tsx:110–116](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/resources/page.tsx:110); [frontend/components/resources/ResourceFilters.tsx:26–31](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/resources/ResourceFilters.tsx:26), [frontend/components/resources/ResourceFilters.tsx:64–72](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/resources/ResourceFilters.tsx:64); [frontend/lib/api.ts:131–137](/Users/agoge/Developer/repos/github/veterans-connect/frontend/lib/api.ts:131).

**Issue:** `category in CATEGORY_LABELS` accepts prototype properties such as `toString`. Number parsing only rejects NaN, not Infinity, blank/zero, negatives, or unsupported select choices. `radius=0` is then omitted by the truthiness check in api.ts and backend defaults apply. A valid backend radius like 15 has no matching UI option. Auto-search checks ZIP length rather than digits.

**Why it matters:** Shared links can produce errors or a form that disagrees with the executed search. This is not an injection or authorization exploit.

**Recommended solution:** Parse a canonical filter schema using own-key membership, exact ZIP validation, finite numeric checks, and one supported radius policy shared by URL/form/API. Normalize or display an inline invalid-link error.

### F10 — Submitted searches are not reflected in the URL

**Component:** ResourcesContent and ResourceFilters state flow. **Severity: Medium. Status: Confirmed navigation inconsistency. Complexity: Medium.**

**Locations:** [frontend/app/(dashboard)/resources/page.tsx:28–54](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/resources/page.tsx:28), [frontend/app/(dashboard)/resources/page.tsx:56–95](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/resources/page.tsx:56); [frontend/components/resources/ResourceFilters.tsx:41–72](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/resources/ResourceFilters.tsx:41).

**Issue:** Dashboard/mission links initialize filters from the URL, but submitting new filters only fetches data. Refresh/back/share can restore the older URL search or no search. The broad-resource shortcut claims to search all categories but `/resources` without intent only opens the form.

**Why it matters:** Discovery is hard to resume or share, and navigation behavior depends on how users arrived.

**Recommended solution:** Choose one canonical submitted-filter state, update URL on submission, and drive fetching from that state without duplicate requests. Label the broad shortcut as opening search or supply explicit intent. Coordinate with F08/F09.

### F11 — Dashboard mistakes fetch failure for a zero-data account

**Component:** DashboardPage summaries and recent-saved panel. **Severity: Medium. Status: Confirmed failure-path UX defect. Complexity: Small.**

**Locations:** [frontend/app/(dashboard)/dashboard/page.tsx:175–179](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/dashboard/page.tsx:175), [frontend/app/(dashboard)/dashboard/page.tsx:195–212](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/dashboard/page.tsx:195), [frontend/app/(dashboard)/dashboard/page.tsx:289–300](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/dashboard/page.tsx:289), [frontend/app/(dashboard)/dashboard/page.tsx:386–420](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/dashboard/page.tsx:386), [frontend/app/(dashboard)/dashboard/page.tsx:506–518](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/dashboard/page.tsx:506).

**Issue:** Failed saved-list loads still display 0/None and “Nothing saved yet.” No retry exists. “Recently saved” is simply the latest three records, regardless of age.

**Why it matters:** An unavailable service looks like lost personal data; the metric suggests a time window that does not exist.

**Recommended solution:** Render unavailable/error states instead of zero, add retry, and define the metric as “Latest saved” or implement a real recency window.

### F12 — Removing the last resource in a selected category leaves a blank list

**Component:** SavedPage category filter. **Severity: Medium. Status: Confirmed state defect. Complexity: Small.**

**Locations:** [frontend/app/(dashboard)/saved/page.tsx:18–20](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/saved/page.tsx:18), [frontend/app/(dashboard)/saved/page.tsx:40–56](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/saved/page.tsx:40), [frontend/app/(dashboard)/saved/page.tsx:108–157](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/saved/page.tsx:108).

**Issue:** With category A selected, deleting its last item removes the A chip but preserves `filterCategory=A`. If category B items remain, the overall empty state does not render and the filtered grid is blank with no way to see which hidden filter is active.

**Why it matters:** Users can think remaining resources disappeared.

**Recommended solution:** Reset an invalid selection after mutation or retain the selected chip and show a filtered-empty message with “Show all.” Test deletion of the last selected-category item.

### F13 — Save/remove failures have no visible feedback

**Component:** ResourceCard and SavedResourceCard mutations. **Severity: Medium. Status: Confirmed defect. Complexity: Small.**

**Locations:** [frontend/components/resources/ResourceCard.tsx:19–43](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/resources/ResourceCard.tsx:19); [frontend/components/resources/SavedResourceCard.tsx:26–36](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/resources/SavedResourceCard.tsx:26).

**Issue:** Failed mutations only call console.error. The user sees the action finish without an explanation or retry instruction. Duplicate-save conflicts are not distinguished from outages.

**Why it matters:** A core workflow appears unreliable and repeated clicks can worsen failures.

**Recommended solution:** Display resource-scoped error/retry feedback, handle known conflict outcomes intentionally, and announce successful save/remove state without stealing focus. Keep existing pending button disabling.

### F14 — Notes can close during an in-flight save or discard a dirty draft silently

**Component:** NotesModal and SavedResourceCard modal ownership. **Severity: Medium. Status: Confirmed lifecycle gap. Complexity: Medium.**

**Locations:** [frontend/components/resources/NotesModal.tsx:25–44](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/resources/NotesModal.tsx:25), [frontend/components/resources/NotesModal.tsx:49–54](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/resources/NotesModal.tsx:49), [frontend/components/resources/NotesModal.tsx:73–79](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/resources/NotesModal.tsx:73), [frontend/components/resources/NotesModal.tsx:110–121](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/resources/NotesModal.tsx:110); [frontend/components/resources/SavedResourceCard.tsx:162–169](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/resources/SavedResourceCard.tsx:162).

**Issue:** Escape, backdrop, Cancel, and Close all dismiss immediately while save is pending or notes differ from persisted data. A slow save callback can update the resource and close a subsequently reopened editor. Parent onUpdated and modal handleSave both close the editor.

**Why it matters:** Users can lose drafts or see late writes while believing they canceled.

**Recommended solution:** Define dirty-draft and pending-close behavior, associate responses with the active editor instance, and centralize close ownership. Allow safe discard/cancel without misleading users about already-sent writes. Keep errors in the active dialog.

### F15 — Small text fails contrast on white

**Component:** Footer, resource cards, modal, shared Input. **Severity: High. Status: Confirmed style/contrast defect. Complexity: Small–Medium.**

**Locations:** [frontend/components/layout/Footer.tsx:36–40](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/layout/Footer.tsx:36); [frontend/components/resources/ResourceCard.tsx:63–66](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/resources/ResourceCard.tsx:63); [frontend/components/resources/SavedResourceCard.tsx:61–63](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/resources/SavedResourceCard.tsx:61); [frontend/components/resources/NotesModal.tsx:69–71](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/resources/NotesModal.tsx:69), [frontend/components/resources/NotesModal.tsx:101–105](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/resources/NotesModal.tsx:101); [frontend/components/ui/Input.tsx:27–32](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/ui/Input.tsx:27).

**Issue:** Normal-size `text-slate-400` against white is about 2.63:1. Browser inspection confirms the footer uses this actual color on white; registration placeholder uses the same color on white. Modal placeholder slate-300 is paler still.

**Why it matters:** Small informational/support text and entry hints are difficult to read and fall below [WCAG 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), which requires 4.5:1 for normal text. Inactive controls have different exceptions; this finding concerns active/informational content.

**Recommended solution:** Use measured accessible text tokens on actual backgrounds, including placeholders, hover states and all branch themes. Recheck gradients, transparency, errors, and selected controls; this audit does not assert every other color pairing passes.

### F16 — Links contain interactive buttons

**Component:** Navbar and navigation CTAs. **Severity: Medium. Status: Confirmed semantic defect. Complexity: Small–Medium.**

**Locations:** [frontend/components/layout/Navbar.tsx:74–83](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/layout/Navbar.tsx:74); [frontend/app/page.tsx:54–68](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/page.tsx:54), [frontend/app/page.tsx:146–148](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/page.tsx:146); [frontend/app/(dashboard)/dashboard/page.tsx:331–335](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/dashboard/page.tsx:331), [frontend/app/(dashboard)/dashboard/page.tsx:499–503](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/dashboard/page.tsx:499); [frontend/app/(dashboard)/saved/page.tsx:72–76](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/saved/page.tsx:72), [frontend/app/(dashboard)/saved/page.tsx:102–104](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/saved/page.tsx:102); implementation [frontend/components/ui/Button.tsx:51–63](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/ui/Button.tsx:51).

**Issue:** Next Link renders an anchor around a native button. Five such descendants exist on the rendered landing page. Invalid nested-interactive markup can produce inconsistent keyboard/focus/AT activation behavior; one browser may flatten it to a link without making the markup correct.

**Why it matters:** Navigation controls should expose one role and one predictable focus target.

**Recommended solution:** Share visual button classes with a typed LinkButton/anchor primitive; render one link for navigation and one button for actions. Preserve focus styles and disabled/pending semantics appropriate to each element.

### F17 — Notes dialog is not keyboard-modal and its editor has no accessible name

**Component:** NotesModal. **Severity: High. Status: Confirmed accessibility defect. Complexity: Medium.**

**Locations:** [frontend/components/resources/NotesModal.tsx:19–31](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/resources/NotesModal.tsx:19), [frontend/components/resources/NotesModal.tsx:48–60](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/resources/NotesModal.tsx:48), [frontend/components/resources/NotesModal.tsx:92–102](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/resources/NotesModal.tsx:92).

**Issue:** Initial textarea focus and Escape handling exist, but no focus loop, background inertness, trigger focus restoration, or equivalent native dialog behavior is implemented. The focusable backdrop is outside the dialog. The dialog title names the dialog, not the textarea; the textarea has no label/aria-label/aria-labelledby.

**Why it matters:** Keyboard users can escape into obscured controls and screen-reader users lack a clear editor name. See [WAI modal dialog guidance](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/); relevant WCAG considerations include 2.1.1, 2.4.3, and 4.1.2.

**Recommended solution:** Use a well-tested native `<dialog>` implementation or a suitable accessible primitive with inert background, contained focus and restoration; give the editor a visible label and connect help/error/count text. Verify Tab/Shift+Tab, Escape, close while pending, screen-reader naming and mobile viewport behavior.

### F18 — Pending, result, and selection states are not fully announced

**Component:** LoadingSpinner, Button, Alert, Navbar, SavedPage, ResourcesContent. **Severity: Medium. Status: Confirmed accessibility gaps. Complexity: Medium.**

**Locations:** [frontend/components/ui/LoadingSpinner.tsx:12–37](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/ui/LoadingSpinner.tsx:12); [frontend/components/ui/Button.tsx:51–87](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/ui/Button.tsx:51); [frontend/components/ui/Alert.tsx:24–27](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/ui/Alert.tsx:24); [frontend/components/layout/Navbar.tsx:40–50](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/layout/Navbar.tsx:40), [frontend/components/layout/Navbar.tsx:93–103](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/layout/Navbar.tsx:93); [frontend/app/(dashboard)/saved/page.tsx:111–143](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/saved/page.tsx:111); [frontend/app/(dashboard)/resources/page.tsx:121–141](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/resources/page.tsx:121); [frontend/components/resources/SavedResourceCard.tsx:129–136](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/resources/SavedResourceCard.tsx:129).

**Issue:** Spinner text and result counts are not status regions; a message-less spinner is entirely decorative to AT. Pending buttons retain the same name with no busy announcement. Current navigation and saved filter selection are conveyed only by styling; expanded notes lack aria-expanded. All Alert severities use assertive alert semantics.

**Why it matters:** Nonvisual users can miss completed searches, current location/filter, and mutation progress. WCAG 4.1.2/4.1.3 are relevant, while `aria-current` is an appropriate navigation improvement.

**Recommended solution:** Add targeted polite status regions and aria-busy, meaningful pending names, aria-current on active links, aria-pressed for filter chips, and aria-expanded/controls for notes. Avoid announcing every keystroke and reserve assertive alerts for urgent errors. These chips need not become ARIA tabs.

### F19 — Missing bypass link and nested main landmark

**Component:** RootLayout and DashboardPage. **Severity: Medium. Status: Confirmed semantic gap. Complexity: Small.**

**Locations:** [frontend/app/layout.tsx:22–29](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/layout.tsx:22); [frontend/app/(dashboard)/dashboard/page.tsx:251–254](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/dashboard/page.tsx:251), [frontend/app/(dashboard)/dashboard/page.tsx:539–542](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/dashboard/page.tsx:539).

**Issue:** Dashboard main is nested inside the root main. No focusable skip-to-content link or main target ID exists before repeated navigation. Existing main landmarks offer some AT bypass, so absence of a skip link alone is not presented as proof that every user agent fails WCAG 2.4.1.

**Why it matters:** Landmark navigation becomes ambiguous and keyboard users must traverse repeated navigation.

**Recommended solution:** Keep one main landmark with a stable ID, change the dashboard wrapper to a non-main element, and add a visible-on-focus skip link. Verify sticky navigation does not obscure focused controls (WCAG 2.4.11).

### F20 — Form validation lacks field-level associations and useful recovery

**Component:** Input, Select, LoginForm, RegisterForm, API error parsing. **Severity: Medium. Status: Confirmed accessibility/feedback gaps. Complexity: Medium.**

**Locations:** [frontend/components/ui/Input.tsx:10–38](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/ui/Input.tsx:10); [frontend/components/ui/Select.tsx:20–52](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/ui/Select.tsx:20); [frontend/components/auth/LoginForm.tsx:17–39](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/auth/LoginForm.tsx:17); [frontend/components/auth/RegisterForm.tsx:40–89](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/auth/RegisterForm.tsx:40); [frontend/lib/api.ts:79–89](/Users/agoge/Developer/repos/github/veterans-connect/frontend/lib/api.ts:79).

**Issue:** Hint/error paragraphs have no IDs or aria-describedby/aria-invalid wiring. Browser inspection confirms registration ZIP's visible hint is unassociated. Server field errors are discarded in favor of the generic message, and custom validation produces one alert without focusing or associating the invalid field. Native required/type/pattern validation is present and useful.

**Why it matters:** Users must infer what to correct; AT may miss instructions or the failing field. WCAG 1.3.1, 3.3.1, 3.3.2 and 3.3.3 are relevant.

**Recommended solution:** Preserve structured field errors in a typed API error, pass them to primitives with described-by/invalid attributes, and focus the first invalid field or a navigable summary. Keep input values and provide specific retry guidance for network/rate-limit failures. Coordinate length/email rules with the backend rather than silently changing account identity rules in the UI.

### F21 — Registration acceptance exists only in client state

**Component:** RegisterForm and registration request contract. **Severity: Medium. Status: Confirmed implementation gap; policy requirement conditional. Complexity: Medium.**

**Locations:** [frontend/components/auth/RegisterForm.tsx:25–38](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/auth/RegisterForm.tsx:25), [frontend/components/auth/RegisterForm.tsx:56–70](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/auth/RegisterForm.tsx:56), [frontend/components/auth/RegisterForm.tsx:163–204](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/auth/RegisterForm.tsx:163); [frontend/lib/types.ts:18–25](/Users/agoge/Developer/repos/github/veterans-connect/frontend/lib/types.ts:18).

**Issue:** The checkbox gates UI submission but no accepted policy versions/timestamp are sent or persisted. Following a policy link navigates away and loses the incomplete form. No claim is made that a legally binding record is necessarily required for this product.

**Why it matters:** The team cannot rely on this UI as evidence of policy acceptance, and users may lose work while reading what they are asked to accept.

**Recommended solution:** Agree on actual acceptance requirements; if needed, add a versioned server-validated contract. Provide safe policy reading via a clearly signposted new tab or preserved non-sensitive draft. Never persist passwords to preserve the form.

### F22 — Markdown instructions promise rendering that does not exist

**Component:** NotesModal and saved notes preview. **Severity: Low. Status: Confirmed UX defect. Complexity: Small.**

**Locations:** [frontend/components/resources/NotesModal.tsx:69–70](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/resources/NotesModal.tsx:69), [frontend/components/resources/NotesModal.tsx:98–105](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/resources/NotesModal.tsx:98); [frontend/components/resources/SavedResourceCard.tsx:125–127](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/resources/SavedResourceCard.tsx:125).

**Issue:** Help advertises bold/italic/headings, but notes are displayed as escaped plain text; formatting markers remain visible.

**Why it matters:** Users spend effort on unsupported formatting. Current escaping is a security positive.

**Recommended solution:** Describe plain text/bullets accurately. Add Markdown only if justified, with a safe renderer and HTML disabled/sanitized; do not use dangerouslySetInnerHTML to fulfill the promise.

### F23 — Privacy actions and data-entry guidance are disconnected

**Component:** PrivacyPage, NotesModal, Footer. **Severity: Medium. Status: Confirmed contact gap; potential privacy UX improvement. Complexity: Medium.**

**Locations:** [frontend/app/privacy/page.tsx:35–49](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/privacy/page.tsx:35); [frontend/components/resources/NotesModal.tsx:84–105](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/resources/NotesModal.tsx:84); [frontend/components/layout/Footer.tsx:23–40](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/layout/Footer.tsx:23).

**Issue:** Privacy says users can request access/export/deletion “by contacting us” but gives no contact or request path. Advice to avoid sensitive notes is buried in privacy text rather than shown at entry. Footer support text is not actionable via links.

**Why it matters:** Users cannot execute the stated data request process and may enter sensitive records in personal notes. This is a product privacy assessment, not legal advice or a compliance determination.

**Recommended solution:** Provide an owned, working support/data-request destination, accurate retention/deletion expectations, and concise just-in-time notes guidance. Make verified support destinations actionable. Backend processes must support any promises made.

### F24 — API-provided URLs and frontend response defenses need explicit policy

**Component:** ResourceCard, SavedResourceCard, Next response headers. **Severity: Medium. Status: Conditional content risk / defense-in-depth improvement. Complexity: Medium.**

**Locations:** [frontend/components/resources/ResourceCard.tsx:91–115](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/resources/ResourceCard.tsx:91); [frontend/components/resources/SavedResourceCard.tsx:87–111](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/resources/SavedResourceCard.tsx:87); [frontend/next.config.ts:3–28](/Users/agoge/Developer/repos/github/veterans-connect/frontend/next.config.ts:3); [frontend/lib/types.ts:68–114](/Users/agoge/Developer/repos/github/veterans-connect/frontend/lib/types.ts:68).

**Issue:** Websites are used directly as href strings without an application http/https allowlist. React escapes text and blocks certain dangerous URL behavior; this audit did not establish executable javascript-URL XSS. User-supplied saved resource details are accepted by the API, so external/provider data remains untrusted. Frontend CSP is absent; backend CSP does not apply to frontend HTML. HSTS is not set here, though it may be managed by ingress.

**Why it matters:** Unexpected protocols/phishing destinations and a future unsafe renderer could bypass assumptions; security controls must be applied on the actual document origin.

**Recommended solution:** Validate/canonicalize URL protocols server-side and defensively in UI, normalize telephone links, and retain `noopener noreferrer`. Add/test a Next-compatible CSP (initially report-only if appropriate) and ensure HTTPS/HSTS at the serving boundary. Check headers after deployment, not just config source.

### F25 — Card and dialog interactions need context and sizing validation

**Component:** ResourceCard, SavedResourceCard, Alert, NotesModal. **Severity: Medium. Status: Confirmed repeated-label limitation; conditional accessibility/reflow risks. Complexity: Medium.**

**Locations:** [frontend/components/resources/ResourceCard.tsx:56–78](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/resources/ResourceCard.tsx:56), [frontend/components/resources/ResourceCard.tsx:109–132](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/resources/ResourceCard.tsx:109); [frontend/components/resources/SavedResourceCard.tsx:54–74](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/resources/SavedResourceCard.tsx:54), [frontend/components/resources/SavedResourceCard.tsx:125–157](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/resources/SavedResourceCard.tsx:125); [frontend/components/ui/Alert.tsx:33–41](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/ui/Alert.tsx:33); [frontend/components/resources/NotesModal.tsx:73–79](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/resources/NotesModal.tsx:73).

**Issue:** Repeated “Visit website,” “Save Resource,” “Remove,” and notes actions lack programmatically named resource groups. Names/descriptions are line-clamped with no detail/expand path. Full notes preserve whitespace but do not force wrapping of a very long unbroken string. Icon close/dismiss controls have no explicit minimum hit area.

**Why it matters:** Nonvisual link/action navigation can lack context; users may miss differentiating details; long user text and small targets need validation on real views. Under WCAG 2.5.8, 24×24px sizing has spacing/inline exceptions; an undersized icon alone does not prove a violation. See [W3C target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

**Recommended solution:** Use labelled article/list groups and contextual accessible action names preserving visible text; expose full details; wrap unbroken notes/URLs; measure target bounds/spacing and pad icon controls. Validate focus visibility and removal focus recovery at 320px/400% zoom. Keep native confirm unless a replacement actually improves accessibility.

### F26 — TypeScript boundaries are weaker than the internal types imply

**Component:** API/types/storage, RegisterForm, shared primitives, test utility. **Severity: Medium. Status: Confirmed type-contract gaps; potential tightening/cleanup. Complexity: Medium.**

**Locations:** [frontend/lib/api.ts:57–59](/Users/agoge/Developer/repos/github/veterans-connect/frontend/lib/api.ts:57), [frontend/lib/api.ts:82–96](/Users/agoge/Developer/repos/github/veterans-connect/frontend/lib/api.ts:82); [frontend/lib/types.ts:18–40](/Users/agoge/Developer/repos/github/veterans-connect/frontend/lib/types.ts:18), [frontend/lib/types.ts:68–131](/Users/agoge/Developer/repos/github/veterans-connect/frontend/lib/types.ts:68); [frontend/lib/auth.ts:22–40](/Users/agoge/Developer/repos/github/veterans-connect/frontend/lib/auth.ts:22), [frontend/lib/auth.ts:50–52](/Users/agoge/Developer/repos/github/veterans-connect/frontend/lib/auth.ts:50); [frontend/components/auth/RegisterForm.tsx:25–38](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/auth/RegisterForm.tsx:25); [frontend/components/ui/Input.tsx:11](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/ui/Input.tsx:11); [frontend/components/ui/Select.tsx:20](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/ui/Select.tsx:20); [frontend/test/next-navigation.ts:37–39](/Users/agoge/Developer/repos/github/veterans-connect/frontend/test/next-navigation.ts:37); [frontend/tsconfig.json:2–23](/Users/agoge/Developer/repos/github/veterans-connect/frontend/tsconfig.json:2).

**Issue:** `res.json() as Promise<T>` and parsed cache data do not validate shape. A `Headers` object/tuple array cannot safely be spread as a string record (current wrappers do not pass those forms). The form update helper accepts any string/boolean for any key instead of correlating key and value. Label-derived IDs collide if primitives are reused with the same label. `getToken` actually returns a cache sentinel, and exported `isAuthenticated`, `ApiError`, and `setMockSearchParams` have no current consumers.

**Why it matters:** Invalid remote/local data can crash UI; the shared API and form helpers advertise stronger contracts than they enforce. Duplicate Java/TS DTOs can drift.

**Recommended solution:** Parse unknown boundary data with lightweight validators or a justified schema library; use `new Headers` and a typed ApiError class; define FormValues plus a generic key/value setter; use `useId` with explicit override. Rename/remove unused misleading helpers after confirming callers. Consider noUncheckedIndexedAccess if it yields useful safety. Keep strict mode; no explicit `any`, ts-ignore, or blanket lint suppression was found in application TS/TSX. Routine Record/Object.keys assertions are not automatically defects.

### F27 — Dashboard duplicates the resource form and combines too many concerns

**Component:** DashboardPage and ResourceFilters. **Severity: Medium. Status: Potential maintainability improvement. Complexity: Medium.**

**Locations:** [frontend/app/(dashboard)/dashboard/page.tsx:21–163](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/dashboard/page.tsx:21), [frontend/app/(dashboard)/dashboard/page.tsx:172–248](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/dashboard/page.tsx:172), [frontend/app/(dashboard)/dashboard/page.tsx:338–383](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/dashboard/page.tsx:338); [frontend/components/resources/ResourceFilters.tsx:19–72](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/resources/ResourceFilters.tsx:19).

**Issue:** The 544-line dashboard mixes theme constants, provider copy, search options/validation, saved-list aggregation, and presentation. Search fields/options duplicate ResourceFilters, which already has four prop-to-state effects. Route-group organization supplies no shared dashboard data boundary.

**Why it matters:** Radius/validation/accessibility fixes can drift between two forms; larger client modules are harder to test independently.

**Recommended solution:** Extract shared typed filter configuration/parser and one configurable search form, move static theme/copy definitions out of the page, and separate saved-summary data from sections. Prefer controlled submitted state with an explicit draft rather than effect chains. Preserve server-renderable shell sections where useful, without forcing a full SSR/auth redesign.

### F28 — Data fetching lacks reuse and bounded per-user datasets

**Component:** DashboardPage, SavedPage, AuthProvider/API request patterns. **Severity: Medium. Status: Potential performance improvement with confirmed unbounded reads. Complexity: Medium–Large.**

**Locations:** [frontend/app/(dashboard)/dashboard/page.tsx:195–233](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/dashboard/page.tsx:195); [frontend/app/(dashboard)/saved/page.tsx:22–56](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/saved/page.tsx:22), [frontend/app/(dashboard)/saved/page.tsx:124–127](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/saved/page.tsx:124); [frontend/context/AuthContext.tsx:75–106](/Users/agoge/Developer/repos/github/veterans-connect/frontend/context/AuthContext.tsx:75), [frontend/context/AuthContext.tsx:139–148](/Users/agoge/Developer/repos/github/veterans-connect/frontend/context/AuthContext.tsx:139); [frontend/lib/api.ts:43–73](/Users/agoge/Developer/repos/github/veterans-connect/frontend/lib/api.ts:43), [frontend/lib/api.ts:140–142](/Users/agoge/Developer/repos/github/veterans-connect/frontend/lib/api.ts:140).

**Issue:** Dashboard and saved independently download the complete saved list; dashboard sorts data already ordered by backend and only displays three items/counts. Each mutation waits on an extra CSRF request. All GETs send JSON Content-Type, which can introduce a cross-origin preflight when not cached. No explicit shared client cache/deduplication, public timeout/signal API, or pagination exists. Context value is recreated on provider renders, but no material rerender performance defect was measured.

**Why it matters:** Latency, payloads and redundant work grow with saved data and slow networks. Built script sizes alone do not prove that current bundles are excessive.

**Recommended solution:** First gate/cancel requests and reuse CSRF safely, avoid unnecessary GET headers, add pagination/summary contract if usage warrants, and measure waterfalls. Use a small user-keyed cache or an established query library only if its invalidation benefits justify the dependency. Never share private caches between accounts; invalidate after mutations/sign-out. Memoize context/split state only where profiling supports it.

### F29 — Discovery copy and result presentation exceed provider guarantees

**Component:** LandingPage, dashboard mission paths, resource labels/distance, Footer. **Severity: High. Status: Confirmed product/contract mismatch. Complexity: Medium–Large.**

**Locations:** [frontend/app/page.tsx:4–28](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/page.tsx:4), [frontend/app/page.tsx:49–52](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/page.tsx:49); [frontend/app/(dashboard)/dashboard/page.tsx:21–55](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/dashboard/page.tsx:21); [frontend/lib/types.ts:42–65](/Users/agoge/Developer/repos/github/veterans-connect/frontend/lib/types.ts:42); [frontend/components/resources/ResourceCard.tsx:63–70](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/resources/ResourceCard.tsx:63); [frontend/app/(dashboard)/resources/page.tsx:133–140](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/resources/page.tsx:133); [frontend/components/layout/Footer.tsx:36–37](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/layout/Footer.tsx:36). Contract evidence: [backend/src/main/java/com/veteransconnect/model/enums/ResourceCategory.java:9–16](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/model/enums/ResourceCategory.java:9); [backend/src/main/java/com/veteransconnect/service/ResourceSearchServiceImpl.java:116–123](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/service/ResourceSearchServiceImpl.java:116); [backend/src/main/java/com/veteransconnect/client/VaFacilitiesClient.java:32](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/client/VaFacilitiesClient.java:32), [backend/src/main/java/com/veteransconnect/client/VaFacilitiesClient.java:113–116](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/client/VaFacilitiesClient.java:113).

**Issue:** UI promises specific education/housing/emergency-fund and “other trusted providers” coverage; repository confirms only VA sandbox facilities, with several categories mapped to benefits facilities and relabelled using the requested category. API fetches only the first 20/type, while UI has no partial-result disclosure. Unknown distance becomes 0 upstream and is displayed as real zero. Footer credits VA but not geocoding; the latter's [usage policy](https://operations.osmfoundation.org/policies/nominatim/) calls for attribution.

**Why it matters:** Users can mistake a nearby office for a verified program or think results are exhaustive. Source limitations matter more than visual polish for this audience.

**Recommended solution:** Make sandbox/source/coverage/partial-result status clear, use verified service metadata rather than category relabeling, preserve unknown distance, add pagination or honest result limits and correct attribution. Coordinate backend changes; frontend text alone cannot make data comprehensive.

### F30 — Authentication/navigation and mobile details need refinement

**Component:** Navbar, auth routes, ProtectedRoute, ZIP/select inputs. **Severity: Low. Status: Confirmed UX limitations / potential improvement. Complexity: Medium.**

**Locations:** [frontend/components/layout/Navbar.tsx:15–22](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/layout/Navbar.tsx:15), [frontend/components/layout/Navbar.tsx:57–85](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/layout/Navbar.tsx:57); [frontend/components/layout/ProtectedRoute.tsx:12–15](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/layout/ProtectedRoute.tsx:12); [frontend/context/AuthContext.tsx:119–135](/Users/agoge/Developer/repos/github/veterans-connect/frontend/context/AuthContext.tsx:119); [frontend/components/auth/LoginForm.tsx:42–79](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/auth/LoginForm.tsx:42); [frontend/components/resources/ResourceFilters.tsx:81–90](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/resources/ResourceFilters.tsx:81); [frontend/components/auth/RegisterForm.tsx:130–150](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/auth/RegisterForm.tsx:130); [frontend/components/ui/Input.tsx:27](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/ui/Input.tsx:27); [frontend/components/ui/Select.tsx:35–40](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/ui/Select.tsx:35).

**Issue:** Navbar ignores auth loading, so guest CTAs can flash during hydration. Login always goes to dashboard, losing a protected deep link; logged-in users may revisit auth forms. No password-recovery journey exists (requires backend work). At 320px guest navbar buttons wrap to multiple lines but do not overflow. ZIP fields have no numeric inputMode/postal autocomplete; 14px inputs may trigger iOS focus zoom. Select removes the native arrow without adding a replacement.

**Why it matters:** Resuming a task and entering data on mobile requires unnecessary effort. These observations do not establish a failed responsive layout or a ban on zoom.

**Recommended solution:** Add deliberate hydration navigation, preserve validated internal return paths, redirect settled signed-in users appropriately, plan recovery with backend, add mobile hints and a visible select affordance. Test iOS/Android, long names, medium breakpoints and zoom before choosing layout changes. Never add arbitrary external return URLs or disable pinch zoom.

### F31 — Several routes have generic document titles

**Component:** PrivacyPage, TermsPage, DisclaimerPage and authenticated page wrappers. **Severity: Low. Status: Confirmed metadata gap. Complexity: Small.**

**Locations:** [frontend/app/layout.tsx:7–14](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/layout.tsx:7); [frontend/app/privacy/page.tsx:1–8](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/privacy/page.tsx:1); [frontend/app/terms/page.tsx:1–8](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/terms/page.tsx:1); [frontend/app/disclaimer/page.tsx:1–8](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/disclaimer/page.tsx:1); [frontend/app/(dashboard)/dashboard/page.tsx:1–19](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/dashboard/page.tsx:1); [frontend/app/(dashboard)/resources/page.tsx:1–24](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/resources/page.tsx:1); [frontend/app/(dashboard)/saved/page.tsx:1–12](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/saved/page.tsx:1).

**Issue:** Only login/register export route-specific metadata. Browser inspection confirms all three legal routes use “Veteran FOB.” Dashboard/search/saved also inherit root metadata from source; client pages cannot export metadata directly.

**Why it matters:** Tabs/history and nonvisual orientation do not identify page purpose clearly; relevant to WCAG 2.4.2. Generic brand-only titles are weaker than distinct descriptive titles.

**Recommended solution:** Add metadata on server page/layout wrappers and keep interaction in client children. Decide public canonical/social/search metadata separately; authenticated shell indexing is not evidence of private-data exposure.

### F32 — Unexpected render failures have only framework-default recovery

**Component:** App Router boundaries and data-dependent client views. **Severity: Medium. Status: Potential reliability improvement. Complexity: Medium.**

**Locations:** [frontend/app/layout.tsx:16–33](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/layout.tsx:16); [frontend/app/(dashboard)/dashboard/page.tsx:165–187](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/dashboard/page.tsx:165); [frontend/app/(dashboard)/resources/page.tsx:186–190](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/resources/page.tsx:186); [frontend/lib/api.ts:96](/Users/agoge/Developer/repos/github/veterans-connect/frontend/lib/api.ts:96).

**Issue:** No application error/global-error boundary exists. Local try/catch handles many request errors but not malformed-data render exceptions (branch theme, date formatting, array shape). Suspense is loading coordination, not an error boundary. Framework defaults exist, so this is not “no error handling.”

**Why it matters:** Unexpected failures can remove the working UI with little product-specific recovery guidance.

**Recommended solution:** Add appropriately scoped error boundaries with retry/navigation and safe diagnostics; validate boundary data first. Introduce custom not-found/loading pages only where they materially improve actual flows. Do not display internal errors or personal data in telemetry.

### F33 — API URL is frozen into the build and defaults to localhost

**Component:** API client and frontend image/build configuration. **Severity: High. Status: Confirmed deployment coupling; failure conditional on promotion/configuration. Complexity: Medium.**

**Locations:** [frontend/lib/api.ts:12–13](/Users/agoge/Developer/repos/github/veterans-connect/frontend/lib/api.ts:12); [frontend/Dockerfile:5–12](/Users/agoge/Developer/repos/github/veterans-connect/frontend/Dockerfile:5); [.github/workflows/ci.yml:112–115](/Users/agoge/Developer/repos/github/veterans-connect/.github/workflows/ci.yml:112).

**Issue:** NEXT_PUBLIC_API_BASE_URL is inlined at build time. CI builds with localhost; changing only runtime environment for a promoted image does not rewrite the browser bundle. A missing production value silently makes users' browsers call their own localhost over HTTP.

**Why it matters:** Dev-to-prod promotion can produce a successful server launch with nonworking authentication/resources and mixed-content requests.

**Recommended solution:** Use same-origin API routing where practical, or explicitly build and validate per-environment artifacts with required HTTPS endpoints. See [Next environment-variable guidance](https://nextjs.org/docs/app/guides/environment-variables). The API URL is public configuration, not a secret.

### F34 — Existing tests and CI do not validate core frontend workflows

**Component:** Frontend tests, Vitest setup/config, CI. **Severity: High. Status: Confirmed verification gap. Complexity: Large, delivered incrementally.**

**Locations:** [frontend/vitest.config.ts:10–13](/Users/agoge/Developer/repos/github/veterans-connect/frontend/vitest.config.ts:10); [frontend/context/AuthContext.test.tsx:66–145](/Users/agoge/Developer/repos/github/veterans-connect/frontend/context/AuthContext.test.tsx:66); [frontend/lib/api.test.ts:24–70](/Users/agoge/Developer/repos/github/veterans-connect/frontend/lib/api.test.ts:24); [frontend/components/layout/Navbar.test.tsx:25–68](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/layout/Navbar.test.tsx:25); [frontend/test/setup.ts:33–69](/Users/agoge/Developer/repos/github/veterans-connect/frontend/test/setup.ts:33); [.github/workflows/ci.yml:100–115](/Users/agoge/Developer/repos/github/veterans-connect/.github/workflows/ci.yml:100).

**Issue:** Eight tests cover context/nav/basic 401 behavior; none covers actual search/cards/notes/forms/guard, 403, malformed filters, failed logout, storage failure, session expiry or cancellation. Fetch mocks reuse one response for CSRF and mutation without validating the bootstrap/header flow. Router/Link mocks cannot prove real navigation. CI never runs test:run. No frontend coverage or E2E/accessibility gate exists.

**Why it matters:** Known defects can ship with a passing type check/build and passing narrow unit suite.

**Recommended solution:** Add test:run to CI first. Pair fixes with focused behavioral tests for F02–F21, then add a small real-browser smoke suite with a controlled backend covering sign-in/search/save/notes/sign-out, cross-user separation, keyboard modal behavior and responsive checks. Use coverage to find meaningful gaps, not a target that rewards mirrored implementation tests. Retain the useful late-startup-auth regression test.

### F35 — Current formatting fails release checks; naming of mutation scripts is surprising

**Component:** Navbar tests and package scripts. **Severity: Low. Status: Confirmed check failure / potential workflow improvement. Complexity: Small.**

**Locations:** [frontend/components/layout/Navbar.test.tsx:28–30](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/layout/Navbar.test.tsx:28), [frontend/components/layout/Navbar.test.tsx:61–63](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/layout/Navbar.test.tsx:61); [frontend/package.json:9–12](/Users/agoge/Developer/repos/github/veterans-connect/frontend/package.json:9); [.github/workflows/ci.yml:103–107](/Users/agoge/Developer/repos/github/veterans-connect/.github/workflows/ci.yml:103).

**Issue:** Biome fails on existing formatting in two assertions. `lint` writes fixes, while lint:check is read-only. Running both lint:check and format:check repeats formatting checks.

**Why it matters:** Current frontend CI would stop before build; contributors can accidentally modify files by assuming lint is read-only.

**Recommended solution:** Format the two assertions after approval, clarify check/fix script names, and simplify duplicate checks if desired. No unused-import diagnostic was reported; no code was formatted during this audit.

### F36 — Brand, visual conventions, and decorative content are inconsistent

**Component:** App metadata, Navbar/Footer/LegalPage, dashboard, global styles and auth shells. **Severity: Low. Status: Confirmed consistency issues / potential improvements. Complexity: Small–Medium.**

**Locations:** [frontend/app/layout.tsx:7–13](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/layout.tsx:7); [frontend/components/layout/Navbar.tsx:31–33](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/layout/Navbar.tsx:31); [frontend/components/layout/Footer.tsx:15](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/layout/Footer.tsx:15); [frontend/components/legal-page.tsx:23–24](/Users/agoge/Developer/repos/github/veterans-connect/frontend/components/legal-page.tsx:23); [frontend/app/page.tsx:36–42](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/page.tsx:36), [frontend/app/page.tsx:84–90](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/page.tsx:84); [frontend/app/(auth)/login/page.tsx:14–17](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(auth)/login/page.tsx:14); [frontend/app/(auth)/register/page.tsx:14–19](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(auth)/register/page.tsx:14); [frontend/app/(dashboard)/dashboard/page.tsx:255–257](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/(dashboard)/dashboard/page.tsx:255); [frontend/app/globals.css:21–23](/Users/agoge/Developer/repos/github/veterans-connect/frontend/app/globals.css:21).

**Issue:** Requested NextSITREP branding appears as Veteran FOB in UI while package/docs use VeteransConnect. Rounded-lg dashboard contrasts with rounded-2xl public/resource cards without a documented token system. Decorative stars/emoji appear in the accessibility tree. Smooth scrolling lacks a reduced-motion override.

**Why it matters:** Inconsistent identity and unnecessary AT announcements reduce clarity; scattered visual strings increase maintenance. Reduced-motion scrolling is an accessibility improvement, not asserted here as a standalone WCAG AA violation.

**Recommended solution:** Confirm canonical brand and centralize relevant product/design tokens, hide purely decorative emoji from AT, and honor prefers-reduced-motion. Preserve useful branch identity without compromising contrast/focus consistency. Do not add a design-system dependency for these small changes.

### F37 — Frontend tooling and onboarding are not reproducible

**Component:** Bun manifest/lockfile, CI, environment template/docs. **Severity: Medium. Status: Confirmed configuration drift; install outcome unverified. Complexity: Small–Medium.**

**Locations:** [frontend/package.json:1–3](/Users/agoge/Developer/repos/github/veterans-connect/frontend/package.json:1), [frontend/package.json:28–42](/Users/agoge/Developer/repos/github/veterans-connect/frontend/package.json:28); [frontend/bun.lock:6](/Users/agoge/Developer/repos/github/veterans-connect/frontend/bun.lock:6), [frontend/bun.lock:28–31](/Users/agoge/Developer/repos/github/veterans-connect/frontend/bun.lock:28); [frontend/.gitignore:33–34](/Users/agoge/Developer/repos/github/veterans-connect/frontend/.gitignore:33); [frontend/.env.local.example:1–6](/Users/agoge/Developer/repos/github/veterans-connect/frontend/.env.local.example:1); [frontend/README.md:13–17](/Users/agoge/Developer/repos/github/veterans-connect/frontend/README.md:13); [.github/workflows/ci.yml:85–101](/Users/agoge/Developer/repos/github/veterans-connect/.github/workflows/ci.yml:85); [.github/workflows/dependency-check.yml:53–65](/Users/agoge/Developer/repos/github/veterans-connect/.github/workflows/dependency-check.yml:53).

**Issue:** No packageManager/engine pin; CI uses Bun latest and Docker major tags. Lock workspace name/trusted-dependency metadata differ from package manifest; ignoreScripts and trustedDependencies name overlapping packages. Frontend example/README are ignored and untracked. @types/node targets 20 while local Node is 24; CI's Node 20 variable is unused, not proof of Node 20 execution.

**Why it matters:** Fresh-clone onboarding and installs can behave differently from the tested local cache. No failed frozen install is claimed because one was not run.

**Recommended solution:** Pin/test the chosen runtime, reconcile deliberate dependency lifecycle-script trust and lock metadata, track safe examples/docs, and align types with supported tooling. Remove dead workflow variables; review supported versions separately rather than upgrading every dev package blindly.

### F38 — Frontend container carries unnecessary files and can include env variants

**Component:** Frontend Docker build/context. **Severity: Medium. Status: Confirmed packaging behavior; secret exposure conditional. Complexity: Medium.**

**Locations:** [frontend/Dockerfile:1–25](/Users/agoge/Developer/repos/github/veterans-connect/frontend/Dockerfile:1); [frontend/.dockerignore:1–6](/Users/agoge/Developer/repos/github/veterans-connect/frontend/.dockerignore:1); [frontend/next.config.ts:3–29](/Users/agoge/Developer/repos/github/veterans-connect/frontend/next.config.ts:3).

**Issue:** Runtime copies the entire builder app, including source/dev dependencies/tests, with no explicit non-root USER or health check. Dockerignore excludes .env and .env.local but not .env.production, .env.development, and other variants. Gitignore does not protect the Docker context. A future local env variant can be copied into both stages; no actual secret exposure in an image was tested.

**Why it matters:** Images are larger and harder to review, and local server-only credentials can enter an image even when never committed. Runtime settings cannot fix build-time URL coupling (F33).

**Recommended solution:** Use an explicit minimal production artifact (evaluate Next standalone), non-root execution, complete env exclusions except intentional safe examples, a pinned runtime and appropriate health/readiness checks. Build/smoke-test the container under the selected Next/Bun runtime. Do not claim an image-size reduction before measuring it.

## Cross-cutting security and performance assessment

- No dangerouslySetInnerHTML, eval, HTML/Markdown execution, arbitrary external router redirects, explicit `any`, ts-ignore, or client-stored JWT was found in application code. Notes and names are rendered as React text. Outbound new-tab links retain noopener/noreferrer. No demonstrated XSS, open redirect, or frontend authorization bypass is claimed.
- `ProtectedRoute` is a UX control. The browser can alter localStorage/state; the confirmed backend authentication and ownership checks must remain authoritative. Avoid adding server-rendered private data until cookie forwarding, per-request identity, and cache isolation are designed.
- Public/static server pages and system fonts are appropriate. No large image/font download was found. Replacing emoji with image assets or adding next/font would not automatically improve performance.
- Current data is fetched in the browser; Next server fetch caching/revalidation does not automatically cache it. Static private-route shells are not cached private API data. Do not use a public shared cache for user profiles/notes.
- Route-level splitting already exists. NotesModal is statically imported by SavedResourceCard, but the saved route's total initial script estimate is only modestly above the shared landing runtime. Lazy-loading the modal is a measurement-driven opportunity, not a confirmed bundle problem; its focus/loading behavior must remain accessible.
- WCAG 2.2 AA still needs hands-on checks for keyboard focus order/obscuring, 320px reflow and 400% zoom, text spacing, text/non-text contrast, touch-target spacing exceptions, accessible authentication, and screen-reader announcements. Password paste/autocomplete are not blocked, a positive for accessible authentication. Automated source/lint checks cannot establish conformance.

## Prioritized frontend remediation plan

| Order | Scope / findings | Expected acceptance evidence | Effort |
| --- | --- | --- | --- |
| 1 — Production security/configuration | F01, F02, F03, F33; coordinate F24/F38 | Patched dependency scan; real intended HTTPS origin/cookie/CSRF tests; failed sign-out visibly handled; dev/prod artifact points to the intended API; no sensitive env files in image | Medium–Large |
| 2 — Session/data correctness | F04–F10, F26 | Tests for delayed auth/request races, denied/corrupt storage, cross-tab sign-out, malformed links, A-success/B-failure, reversed search responses; account-scoped cleanup | Medium–Large |
| 3 — Core accessibility | F15–F20, F25 | Contrast ≥4.5:1 for normal text; one semantic control per CTA; named keyboard-modal notes editor; meaningful labels/status/selection; keyboard and AT smoke checks | Medium |
| 4 — Honest, resilient resource workflows | F11–F14, F21–F23, F29 | Correct error versus empty states; selected-category deletion works; mutation retries visible; dirty/pending notes handling defined; program/source/partial-result claims match actual data; usable privacy contact | Medium–Large, backend coordination for coverage |
| 5 — Verification and release gates | F34, F35, F37; begin alongside each fix | Frontend unit tests in CI, lint/types/build green, focused regression tests, small browser journey/keyboard suite, pinned runtime/frozen install reproduced | Incremental Medium–Large |
| 6 — Measured maintainability/performance | F27, F28, F30–F32, F36, F38 | Shared form rules without behavior drift; distinct titles and recovery; pagination/summary only as justified; measured network/bundle/mobile budgets and minimal container | Medium, split by measured value |

Fix low-cost formatting immediately after approval to unblock CI, but do not let cosmetic cleanup displace session correctness or accessibility. Group shared primitive fixes so all routes benefit; keep the existing architecture and dependency footprint unless measurements justify expansion. Each remediation should preserve or improve current data ownership and CSRF controls.

**Audit-only work is complete. Awaiting approval before modifying code, dependencies, configuration, tests, or deployment behavior.**
