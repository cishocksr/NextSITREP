# T10 — Saved-resource testing and timestamp-response fixes

Date: 2026-11-08. **Status: PASS — T10 complete within its H2 verification scope.**

The complete Java 21 backend verification passes **269 tests**, with **zero failures,
errors or skips**, successful packaging, and the normal unchanged **70% JaCoCo
gate**. Final line coverage: **780/850 = 91.76%** (baseline: 670/850 = 78.82%).
All **52 new cases**, including both unchanged timestamp regressions and all
**13 HTTP security cases**, pass.

## Baseline and worktree

- Main baseline `aba80c1` includes merged T09 PR #13 and restored audit/roadmap docs.
- Branch: `test/t10-saved-resource-persistence`.
- Worktree: `/private/tmp/nextsitrep-t10-worktree`. The original checkout is not
  modified by this fix; its previously preserved T09 PR draft remains outside T10.
- Initial clean baseline: 217 tests, zero failures/errors/skips, successful verify
  and 78.82% line coverage. Reviewed the canonical audit/roadmap, existing tests,
  service/controller/repository/entity/DTO flow and schema/security configuration.
- The November 5 audit register contains historical statuses/counts. This report
  records current evidence without silently rewriting that register. R13 still
  includes broader PostgreSQL/browser gaps; R29 PostgreSQL/timezone claims remain
  subject to T11 despite these confirmed H2 response fixes.

## Root causes and minimal production correction

Only **SavedResourceServiceImpl.java** changes in production: its save and notes
update each call `saveAndFlush(...)` instead of `save(...)` before mapping the DTO.

| Failure | Precise root cause | Correction and retained regression |
| --- | --- | --- |
| Null saved-resource timestamps | With UUID identity and deferred insert, `save()` returns before Hibernate flushes the insert. `@CreationTimestamp` and `@UpdateTimestamp` are still null when `SavedResourceResponse.from(...)` copies them. Commit later populates the entity, but cannot retroactively change the immutable DTO. | Flush the save before DTO mapping. `savedResponseMatchesCommittedRow` compares the complete returned record with a fresh committed read. |
| Stale notes-update updatedAt | The service loads a managed entity with the old updatedAt, mutates notes and maps a DTO before Hibernate dirty checking/update generation at flush. Commit changes the stored timestamp after the DTO has captured the old value. | Flush the update before DTO mapping. `updatedResponseMatchesCommittedRow` uses controlled historical test data and compares the complete returned record with a fresh committed read. |

The user explicitly authorized these two corrections after their failing tests
were documented. The two regression method bodies are byte-for-byte unchanged;
SHA-256 fingerprints were checked before/after. Mock and spy write targets follow
`saveAndFlush` so their existing field, ownership and failure assertions exercise
the actual operation. No tests are removed, disabled or converted to expected failures.

No artificial timestamp is assigned in production. Existing Hibernate annotations,
DTOs, repositories, validation, ownership checks, transaction annotations, schema,
dependencies and security configuration remain unchanged. The deterministic old
timestamp exists only as test data for the update regression.

**Flush is not commit.** It executes pending SQL and populates generated state
within the existing REQUIRED transaction; an enclosing transaction can still roll
back. The retained outer-transaction test now verifies rollback after the insert
has actually been flushed. Constraint/connection errors can surface earlier,
before response mapping; propagation/rollback remain intact. Flushing may include
other pending work in that persistence context. No new transaction or retry policy
is introduced. Actual PostgreSQL behavior remains T11.

## Actual saved-resource contract

`ResourceController` uses the authenticated principal email. The service resolves
that user and uses owner-scoped repository queries. Each saved row has one mandatory
user foreign key; there is no public shared saved-record API.

- Save accepts a DTO-valid snapshot for an existing account. It does not verify
  provider existence/capability. Identity is `(user, externalId, sourceApi)`.
- Listing is user-scoped and newest-first. Foreign and missing update/delete IDs
  both yield the same not-found contract / HTTP 404.
- Duplicate pre-check yields HTTP 409; the database also has tuple uniqueness.
  Concurrent race-to-conflict error translation is not added by T10.
- Null/blank notes clear notes; nonblank whitespace remains. DTO/UUID validation is
  tested at the HTTP boundary; no new direct-null-service argument contract is imposed.
- Saved-row deletion does not cascade to its user. Referenced-owner deletion is
  restricted by the existing foreign key; no account-deletion feature is invented.

## Test coverage added

Files below are under `backend/src/test/java/com/veteransconnect/`.

| File | Cases | Verified behavior |
| --- | --- | --- |
| `service/SavedResourceServiceTest.java` | 21 | Save/response field mapping, owner-scoped ordered/empty lists, duplicates, deletion, notes normalization, missing accounts, foreign/missing rows and repository failures. |
| `repository/SavedResourceRepositoryTest.java` | 8 | Migrated H2 queries/order, full mapping/reload and generated timestamps, owner/source tuple identity, uniqueness, foreign key/not-null and deletion constraints. |
| `service/SavedResourceServicePersistenceTest.java` | 7 | Commit across independent transactions; both timestamp regressions; two-user isolation; REQUIRED outer rollback; dirty-note rollback on injected DAO failure; read-only/write transaction attributes. |
| `security/CustomUserDetailsServiceTest.java` | 3 | Stored identity/hash/ROLE_VETERAN mapping, unknown identity and DAO failure. |
| `security/SavedResourceSecurityTest.java` | 13 | Actual application/security/services/H2, signed JWTs, real CSRF bootstrap, owner flow, foreign/missing 404, duplicate 409, missing CSRF, anonymous/forged/unknown account and DTO/UUID validation. |
| `support/SavedResourceFixtures.java` | Helper | Synthetic users/snapshots only; no real identities, credentials or provider calls. |

Transaction tests disable the test-managed transaction so real proxied service
commits/rollbacks are observable from subsequent reads. Repository spies inject
failures and observe transaction attributes; separate repository tests execute the
actual queries. Security tests use the real filter chain, not the older permissive
controller test chain. They do not disable filters or bypass CSRF with `csrf()`.
MockMvc secure requests are not real deployed TLS/ingress evidence.

## Final acceptance matrix

| Requirement | Status | Evidence / limitation |
| --- | --- | --- |
| T09 baseline and requested worktree/branch | Pass | Main `aba80c1`; existing isolated T10 worktree retained; original checkout untouched by this fix. |
| Applicable saved-resource service behavior | Pass | All 21 unit cases and seven service/persistence cases pass. |
| Persistence mapping, queries, ownership and constraints | Pass | Eight migrated H2 repository cases and real service transactions. PostgreSQL remains T11. |
| Input validation and failure handling | Pass | Existing required fields/notes bound/UUID conversion; DAO propagation and rollback. No invented validation or API race policy. |
| Authentication/ownership/security regressions | Pass | All 13 real-chain HTTP cases and existing security tests pass. Foreign records remain unchanged. |
| Both timestamp corrections | Pass | Original save/update response regressions retained unchanged and passing against fresh committed reads. |
| Transaction boundaries and rollback | Pass | REQUIRED/read-only annotations unchanged; outer rollback and injected write-failure rollback pass after flush changes. |
| Full clean verify / packaging | Pass | Exit 0; 269 tests, zero failures/errors/skips; production JAR packaged. |
| Normal JaCoCo gate | Pass | Verify executes `jacoco:check`; 780/850 lines = 91.76%, unchanged 70% minimum. |
| Focused class coverage | Pass | SavedResourceServiceImpl 45/45 lines and 8/8 branches; CustomUserDetailsService 7/7 lines. |
| Narrow production scope / regression preservation | Pass | Exactly two production call replacements in one service; no DTO, repository, migration, dependency, security or CI changes. |
| T10 completion | Pass | All applicable H2 tests and required backend gates pass. No PostgreSQL/AWS readiness claim. |

## Commands and evidence

Environment: Temurin **21.0.13+9**, Maven **3.9.9**, Boot **4.1.2**, H2 **2.5.252**,
JaCoCo **0.8.14**, macOS ARM64. Existing test profile keeps Flyway enabled/clean
disabled and Hibernate validate. Commands ran in the T10 worktree's backend folder
with the actual Java 21 JAVA_HOME; loopback fixtures required authorized execution
outside the sandbox.

| Command | Exit | Result |
| --- | --- | --- |
| Baseline `./mvnw clean verify -B -ntp` | 0 | 217 tests; baseline gate passes. |
| Pre-fix timestamp-only regression run | 1 | Both confirmed failures reproduced without production changes. |
| `./mvnw test -B -ntp -Dtest=SavedResourceServiceTest,SavedResourceRepositoryTest,SavedResourceServicePersistenceTest,SavedResourceSecurityTest,CustomUserDetailsServiceTest` | 0 | All 52 focused cases pass after the fix, including 13 HTTP security cases. |
| Final `./mvnw clean verify -B -ntp` | 0 | 269 tests, zero failures/errors/skips; package and normal JaCoCo gate pass. |
| Whitespace, regression fingerprints and production-scope review | 0 | Two regression bodies unchanged; no changes beyond the approved production file. |

Current evidence: `/private/tmp/nextsitrep-t10/approved-fix-targeted.log`,
`approved-fix-verify.log`, `approved-fix-results.json`, and copied reports in
`approved-fix-evidence/`. Earlier red-state evidence remains in
`timestamp-regressions-before.log` and the prior `final-verify.log`/`results.json`;
those are historical, not the final result. No test-failure ignore flag, skip,
coverage exclusion or threshold reduction was used.

Surefire's existing nested-suite aggregate attributes undercount two cases; totals
count actual testcase elements and agree with Maven's 269-test summary. Existing
JWT deprecation, test JVM/Mockito sharing and authentication-provider configuration
warnings remain; no new production warning or test error is introduced by the fix.

## Remaining limitations and Git state

PostgreSQL precision/timezone behavior, schema upgrades, grants/TLS, concurrency
races, optimistic notes conflicts, provider provenance, and real HTTPS/browser/AWS
acceptance remain outside T10. No T11/T12 or infrastructure work was performed.

Branch `test/t10-saved-resource-persistence`, existing worktree
`/private/tmp/nextsitrep-t10-worktree`. One tracked production file is modified;
six test/helper files and these two documents remain new/untracked. No files are
staged or committed. No original-checkout modification, push, PR, merge or deployment
was performed for the approved fixes.
