# Frontend review section 1 — session and API boundaries

Baseline: clean `main`, `41d9e12c677c4810d73fa195fea905166ea6c2ca`.
This implements the scoped corrections discussed under R15, R16, R20 and R40.
It does not close the broader backend lifecycle, validation, accessibility or
hosting findings. No dependency upgrade, branding change, database migration,
commit, push or deployment is included.

## R15: distinguish local display from confirmed server sign-out

`AuthContext` hides private content as soon as sign-out starts, but displays
pending status and a retryable warning until the server confirms cookie removal.
A failed sign-in does not erase an unresolved sign-out warning. `SessionNotice`
keeps this feedback visible even after navigating to a public page.

The API client serializes login, registration and logout within this browser tab.
For example, a slow logout finishes before a newer login is allowed to set its
cookie. A session generation invalidates protected requests crossing a transition;
old data and old 401 responses from known transitions cannot overwrite or terminate
the newer session. Account changes discovered by /me also invalidate old requests.
The generation is checked again after asynchronous body parsing and before a write
following CSRF initialization. Only 401 initiates expiry handling; 403 remains a
permission/CSRF error for the caller. A 401 clears the local view without issuing
another logout request.

Learning point: delaying a React state update does not order server cookie
responses. Coordinate the HTTP transitions as well as their UI callbacks.

## R16: make /me authoritative and storage optional

Profiles and estimated expiry are no longer persisted or restored from browser
storage. Legacy vc_user/vc_expiry/vc_token entries are removed on a best-effort
basis. Denied storage reads/writes/removals cannot prevent cookie verification or
successful login. The public product name and session cookie name are unchanged.

Tabs exchange a random, non-identifying session-change signal when storage is
available. Focus, visibility and a 60-second visible-page check reconcile /me even
when storage is unavailable. Network/invalid-response failures show a verification
warning and retry action rather than sending logout. This is not an instantaneous
account-wide revocation mechanism.

/me still returns configured lifetime rather than actual remaining JWT lifetime
(R17). This patch does not invent a new deadline or extend an estimated expiry on
reload; the server response and protected-request 401s determine session validity.

Protected page content now mounts inside ProtectedRoute instead of running its
fetching hooks above an inner guard. The guard keys its content by userId, resetting
private state across account changes. Most page diff lines are indentation from
moving the existing content behind that boundary; page content is otherwise retained.

Learning point: a guard inside a component's return value cannot prevent that
component's own effects from starting. Put the fetching component below the guard.

## R20: allow only provider website HTTP(S) links

The save DTO has a Jakarta validation constraint for optional absolute HTTP(S)
websites without credentials. Null is allowed; malformed/disallowed/empty supplied
values are rejected before persistence. No existing database rows are rewritten.
Both resource cards defensively hide invalid legacy/provider destinations. Search
cards normalize accepted URLs and send null for unavailable/invalid provider links
when saving an otherwise usable resource. External links retain noopener/noreferrer.
The broader input-bound and password-policy portions of R20 remain separate work.

Learning point: React escaping and new-tab isolation do not establish that a URL
is an appropriate navigation destination. Validate incoming writes on the server
and defend rendering of existing records separately.

## R40: check actual data at the runtime boundary

Small local decoders validate auth, search and saved-resource payloads before they
reach rendering. They check recognized enum values, required field types, nullable
fields, finite numbers and parseable saved timestamps. Malformed JSON/data gives a
safe request error; no response payload is logged. This is runtime shape validation,
not provider provenance verification or replacement for backend input validation.
Headers are normalized with Headers rather than cast/spread as records. ApiError
carries a typed HTTP status. The registration updater correlates field and value
types, so a boolean cannot be assigned to email. No validation library was added.
Field IDs and accessible error descriptions remain under R38.

Learning point: a TypeScript assertion changes compiler assumptions; a decoder
checks the actual value received over HTTP.

## Verification

All checks ran in a temporary copy of the baseline and proposed source, using
installed dependencies, with no real environment files copied.

- Frontend: 86 tests in 7 files, zero failures.
- Biome lint and formatting checks: pass.
- TypeScript check and production Webpack build: pass; routes remain dynamic.
- Production HTTP security harness: pass in both HTTPS flag modes (3 reported
  tests); nonce/CSP, error responses, assets and synthetic same-origin transport
  retain their existing protections.
- Backend: offline Java 21 clean verify passes 280 tests, zero failures/errors/
  skips, packaging and unchanged JaCoCo gate. Eleven new real-chain HTTP cases
  exercise website validation and persistence rejection/acceptance.
- git diff --check: pass.

The first backend run used Java 25 and encountered the sandbox's loopback binding
restriction. The successful full run used the already available Java 21 toolchain
with authorized local test-server execution; no tests were excluded.
No real browser, deployed HTTPS ingress, PostgreSQL, container rebuild or AWS
acceptance is claimed. The HTTP suite uses synthetic local fixtures.
