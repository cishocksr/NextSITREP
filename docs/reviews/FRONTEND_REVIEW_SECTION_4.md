# Frontend review section 4 — architecture, testing, tooling and documentation

Baseline: clean `fix/architecture-testing-tooling`, 6fb553d (merged section 3).
This patch completes the scoped frontend corrections for R13, R41, R44 and R48.
The four implementation sections are complete within their stated scope. Public
rebranding and the broader backend/delivery findings remain separate.

## R13: durable browser coverage of the core workflow

Sections 1–3 already supplied component coverage for session races, search
ordering/URLs, saved-list recovery, notes lifecycle, validation and accessibility.
The remaining gap was the browser workflow connecting those pieces.

The section 3 browser harness is now `frontend/test/browser.integration.mjs`.
`test:browser` runs it; `test:accessibility:browser` remains an alias. The expanded
production harness checks:

- A guest requesting saved resources is redirected to login.
- Native required-field validation prevents an empty login request; a rejected
  login displays an error, and corrected credentials establish a session.
- The synthetic session cookie is HttpOnly and absent from `document.cookie`.
- Dashboard search reaches resources with the submitted ZIP/category/keyword/radius
  in both the URL and upstream request.
- A failed save does not become success; retry saves the resource.
- The saved resource opens the notes dialog; saved notes survive a full reload.
- Sign-out clears the cookie and protected content; revisiting a protected route
  redirects back to login.
- Separate client and server rendering failures reach the correct route boundary
  and recover with Try again.
- Section 3 keyboard, modal, contrast, motion and responsive checks remain intact.

The fixture API validates the synthetic session cookie on resource requests and
requires the CSRF header for writes. It is deliberately controlled test data,
not a substitute for Spring/JWT/PostgreSQL/provider acceptance. Pointer actions
use browser input events; input changes and modal/skip navigation use browser
keyboard/input events. Tests wait for document loads and observable UI outcomes.

CI now runs this suite as a required step of its existing frontend job. It locates
an installed Google Chrome/Chromium executable, reports its version, and fails if
none is available. No browser dependency/download, permission expansion or change
to the existing quality-gate dependencies is introduced. The local pass does not
establish a green GitHub run; commit/push is still required to exercise that step.

Learning point: component tests isolate state transitions, while a browser test
checks whether routing, forms, cookies and rendering connect correctly. Both
levels are useful, with explicit fixture boundaries.

## R41: smaller dashboard responsibilities and scoped recovery

Before: one dashboard file combined static branch/navigation data, search drafts,
HTTP reads, summaries and all presentation. Category/radius choices were repeated
in ResourceFilters. Unexpected render errors had no application-defined fallback.

After:

| Location | Responsibility |
| --- | --- |
| Dashboard route | Protected/user-keyed mounting, saved request state, cancellation and retry |
| `components/dashboard/config.ts` | Existing branch themes and navigation configuration |
| `DashboardSearch.tsx` | Search draft, profile ZIP synchronization, normalization and navigation |
| `DashboardHeader.tsx` | Greeting and supplied saved-count presentation |
| `DashboardLinks.tsx` | Mission paths and quick actions |
| `SavedSummary.tsx` | Category/recent derivation and summary presentation |
| `lib/search-options.ts` | Shared category/radius choices, including custom URL radii |

The route still owns saved reads and rejects obsolete completions. Its search
child keeps a stable component identity across load/retry updates. The user-keyed
protected boundary still resets drafts and loaded content on account changes.
Summary sorting copies the input array and still selects the latest three saves.
A focused regression verifies that loading completion preserves all search fields
and that the latest-three presentation leaves the original records in order.

`app/error.tsx` and `app/(dashboard)/error.tsx` provide general and scoped workspace
fallbacks. They focus a readable heading, hide raw error details, offer a home link,
and use Next 16.4.5's typed `ErrorInfo.retry`. The installed framework implements
retry by refreshing server data and resetting the boundary in a transition. Real
client-failure and server-refetch fixtures verify both paths in a production build.
Those fixtures exist only in the harness's temporary source copy.

Expected API/mutation failures retain their existing inline recovery. Route
boundaries do not catch root-layout failures or asynchronous event-handler errors;
they do not cancel or roll back writes already sent to the server. Context and
caching behavior are unchanged. Extraction is a maintainability change, with no
bundle-size or runtime performance claim.

Learning point: extract by ownership and lifecycle. A form should keep its draft
when an unrelated saved-data request finishes; recovery should surround the
portion of the route that can meaningfully retry.

## R44: clarify commands and reconcile tooling metadata

The unused `isAuthenticated()` helper and parallel `ApiError` interface from the
original review were already removed in section 1. The used `ApiError` class in
`lib/api.ts` remains authoritative. No duplicate cleanup or dependency removal is
needed for those resolved subclaims.

`lint` now inspects files, matching the retained `lint:check` alias. `lint:fix`
explicitly applies fixes. `format` continues to write formatting, and
`format:check` remains read-only. Existing CI command names remain valid.

The Bun lockfile workspace name is corrected from `fontend` to the existing
package identity `@veterans-connection/frontend`. Only that metadata string
changes: dependency declarations, resolved versions, integrity records and package
identity are preserved. A fresh frozen install accepted the lockfile and left it
byte-for-byte unchanged. The isolated HTTP/browser builds remain intentional.

Learning point: tool commands should make mutation obvious, and metadata cleanup
should be verified separately from a dependency upgrade.

## R48: clean-clone instructions match configuration and CI

A sanitized `frontend/.env.local.example` is tracked through one narrow ignore
exception. Other local `.env*` files remain ignored. The template contains only
`API_PROXY_TARGET=http://localhost:8080` and `HTTPS_DEPLOYMENT=false` plus comments.

The frontend README now explains the same-origin proxy, build-time target versus
runtime HTTPS flag, local/Compose origins, frozen installation, check/fix commands,
component responsibilities and isolated integration tests. The active CI guide is
rewritten from the current workflows: triggers, pinned tools, actual check order,
cache/artifact rules, blocking scans and quality-gate semantics. Dated audit and
implementation reports remain historical records.

Learning point: an example file must exist in Git, not merely on the author's
machine. Instructions should distinguish build-time configuration from settings
that can change when a built server starts.

## Verification

- 152 frontend tests in 13 files pass, including the new draft and recovery cases.
- TypeScript, read-only lint/format checks and production Webpack builds pass.
- Expanded browser suite passes (3 reported tests), including the full journey,
  scoped client/server recovery and retained accessibility/reflow checks.
- Production HTTP security regressions pass in both HTTPS flag modes (3 tests).
- A fresh source directory without `node_modules` accepted a frozen Bun install
  using an isolated copy of the local download cache. Copying the tracked template,
  lint/format checks, all component tests, production build and type check passed.
- Environment ignore rules and placeholder-only template values were checked.
- CI YAML and the new browser step's Bash syntax parse. `actionlint` is unavailable
  locally; no GitHub workflow run is claimed.
- `git diff --check` passes.

Local verification used Node 24.13.0, Bun 1.3.8 and installed Chrome Canary. CI and
containers retain their existing Node 24.22.2/Bun 1.4.4 pins. Exact pinned-runtime,
Linux browser and deployed acceptance must be confirmed by their own runs. No
backend implementation changed, so its test suite was not rerun.

## Remaining work outside these four sections

Public NextSITREP rebranding is audited but not implemented in this patch. Broader
session-lifecycle/input-bound findings, concurrent notes conflicts, provider and
PostgreSQL acceptance, manual screen-reader/other-browser acceptance, and cloud
capacity, ingress/provenance and recovery evidence remain in their respective
workstreams. Completing these frontend fixes does not declare deployment readiness
or full WCAG conformance.
