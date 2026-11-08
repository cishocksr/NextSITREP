# NextSITREP audit reconciliation

Reviewed **2026-11-05**, against clean tracked commit **a6a7fdc**. This is a source review, fresh local verification and remediation proposal, not approval to implement or deploy. No application code, dependencies, secrets or AWS resources were changed. The frontend and backend remain separate applications.

## Executive assessment

**C1, H1 and H2-A are fixed in the current code. H2-B is partially fixed:** HTTPS, exact-peer forwarding, normal-document CSP and cookie/header protections exist, but a fresh HTTP probe found HTML error responses that bypass the nonce middleware. No forged session, XSS, deployed compromise or AWS control failure was demonstrated.

The local quality gates pass. That does **not** establish deployment readiness: dependency/support gaps, CI omissions, unverified container/PostgreSQL behavior and unexecuted cloud delivery/recovery controls remain Development gates. Public launch additionally needs authentication lifecycle/error handling, privacy, trustworthy resource discovery and accessibility work. There is no newly confirmed open Critical finding; R01 retains the historical Critical severity and is Fixed.

**A running Next.js server is required by the current design.** Root layout request-time rendering and per-request CSP nonces conflict with the old static-export proposal. Do not remove nonce CSP, weaken cookies or merge backend responsibilities into Next to reduce hosting costs. The existing H2-C EC2/container proposal remains a reviewable option, not an approved or implemented deployment.

## Scope, evidence and limits

Inspected the current frontend routes/layouts/components/hooks/context/utilities, backend controllers/security/configuration/services/clients/entities/repositories/DTOs, migrations, configuration, Docker/Compose, Maven/Bun tooling and GitHub workflows. Reconciled [Project](PROJECT_AUDIT.md), [Frontend](FRONTEND_AUDIT.md), [Backend](BACKEND_AUDIT.md), [Production readiness](PRODUCTION_READINESS.md), all four [H2-C architecture documents](architecture/aws-development-architecture.md), [H2-A configuration guide](../backend/CONFIGURATION.md), [H2-B HTTPS guide](../backend/HTTPS_SECURITY.md), and historical CI/security documentation. Historical documents remain evidence of past assessments, not current authority when they conflict with this dated report.

The repository is now located at `/Users/agoge/Developer/repos/github/NextSITREP`; old `veterans-connect` paths in reports/tool context are stale. No repository AGENTS.md instruction file was found. All 138 tracked files were fingerprinted before verification. Commands ran in an isolated source copy with the already installed dependencies; no install or upgrade was performed. No real environment file/secret was copied into the verification tree.

Source links below identify the exact current file and one-based supporting line. Negative findings (for example no recovery endpoint) also rely on the complete repository inventory, not just the single cited class. Blocker labels are engineering acceptance recommendations, not claims that an uninspected AWS account is insecure.

**Status definitions:** Fixed = the original scoped defect is closed by current evidence; Partially Fixed = concrete controls landed but a related current gap remains; Open = the gap is confirmed in source/current checks; Needs Verification = an operational, historical runtime or requirement-dependent claim cannot responsibly be closed or asserted as a current reproduced defect. Improvements are explicitly labeled. A row with mixed subclaims states their limits.

**Deployment scope:** Development means an explicitly restricted, synthetic-data environment in the separate Development account, with named testers and no public reliance on results. “Dev blocker: Yes” means before accepting that deployment, not before booting an isolated verification stack. R25 gates normal live-provider acceptance; approved stub-only validation may precede it. Publicly reachable unrestricted Development or real veteran/production data requires the Production gates as well. “No” is not permission to ignore the risk. Unknown backup/cloud controls block acceptance until evidence exists. Proposed changes still need review before implementation.

Priorities: **P0** = before accepted AWS Development; **P1** = security, trustworthy core flows and accessibility before public launch; **P2** = remaining public-launch UX/bounds or conditional operational verification; **P3** = measured improvement, cleanup or requirement decision. Rows explicitly marked Production Yes remain launch gates regardless of P1/P2 ordering. Fixed controls must remain regression-protected.

## Fresh verification

| Check | Current result | Interpretation |
| --- | --- | --- |
| Backend `./mvnw -o clean verify -B` | **PASS: 214 tests; 0 failures/errors/skips; JAR packaged** | Offline, installed Maven cache only. Real loopback Tomcat security tests ran. |
| JaCoCo line gate | **PASS: 671/851 = 78.85%, minimum 70%** | Gate was not lowered. Coverage is line coverage, not a security guarantee. |
| Frontend `bun run test:run` | **PASS: 28 tests in 5 files** | Existing unit/component suite; not full browser E2E. |
| `bun run lint:check` | **PASS** | Read-only lint command. |
| `bun run format:check` | **PASS** | Old formatting failure is obsolete. |
| `bun run type-check` | **PASS** | Strict compile checks do not validate runtime JSON. |
| `bun run build` | **PASS** | All ten page routes emitted dynamic (ƒ); Proxy active. |
| Production Next HTTP probes | **Confirmed R04** | Normal `/` and normal missing page have CSP. Three excluded-looking HTML 404 routes do not. |
| Packaged BCrypt boundary probe | **Confirmed R20** | 73 ASCII bytes / 40 accented characters (80 UTF-8 bytes) rejected by the packaged encoder. No passwords logged. |
| Production CSS contrast calculation | **Confirmed R37 token gap** | slate-400 on white ≈2.63:1; slate-300 ≈1.48:1. Not whole-site WCAG certification. |

Execution environment: Java **25.0.2**, compiler release **21**; Node **24.13.0**, Bun **1.3.8**. **Java 21 runtime execution was not available locally.** A release-21 compile is not proof of Java 21 runtime/container compatibility. This review did not install a JDK. Existing CI/runtime declarations need actual execution evidence (R07/R08).

Fresh JaCoCo class examples: SecurityConfig **58/62**, JwtService **37/37**, HttpsRequirementFilter **10/10**, TrustedProxyConfiguration **28/30**; SavedResourceServiceImpl **0/45**, CustomUserDetailsService **0/7**. Old claims of no JWT/security tests are obsolete; persistent-data coverage remains missing.

The header probe used an isolated production Next server on loopback, then stopped it. `/favicon.ico-extra`, `/favicon.ico/not-an-icon`, `/_next/image-extra` returned **404 text/html without CSP**; `/_next/static/not-a-real-file` was text/plain and is not itself a missing-document-policy defect. This probe did not establish deployment HSTS/TLS behavior. Cookie/forwarded-header configuration was reviewed with existing targeted tests, not a real AWS ingress/browser deployment.

No current browser end-to-end, screen-reader/mobile, real PostgreSQL persistence/restore, image architecture/capacity, AWS-account or full lockfile/image SCA verification was performed. Tests needing external providers should use owned stubs; this review did not load-test VA/Nominatim.

## Consolidated register

Every detailed finding below includes current evidence, remedy, tests and separate Development/Production gate decisions. Original IDs map to these canonical IDs later in the report; do not open duplicate tickets for each historical ID.

| ID | Severity | Area / finding | Status | Dev blocker | Production blocker | Order |
| --- | --- | --- | --- | --- | --- | --- |
| [R01](#r01) | Critical | JWT configuration: C1: known fallback signing key | Fixed | No | No | Retain |
| [R02](#r02) | High | Frontend/API integration: H1: shared-origin browser API/CSRF contract | Fixed | No | No | Retain |
| [R03](#r03) | High | Spring configuration: H2-A: explicit profiles and startup validation | Fixed | No | No | Retain |
| [R04](#r04) | Medium | HTTP security and Next Proxy: H2-B: headers/proxy controls exist, but CSP matcher misses HTML errors | Partially Fixed | No | Yes | P1 |
| [R05](#r05) | High | Frontend/backend dependencies: Affected/unsupported dependency baseline | Open | Yes | Yes | P0 |
| [R06](#r06) | High | Supply chain/CI: Dependency scanning and artifact provenance are not effective gates | Open | Yes | Yes | P0 |
| [R07](#r07) | High | Release controls: Local checks pass but CI omits required test/gate commands | Open | Yes | Yes | P0 |
| [R08](#r08) | High | Container/runtime delivery: Containers/toolchains lack reproducibility, isolation and capacity proof | Open | Yes | Yes | P0 |
| [R09](#r09) | High | Architecture/documentation: Static-export architecture conflicts with request-time CSP | Partially Fixed | Yes | Yes | P0 |
| [R10](#r10) | High | AWS Development/Production delivery: AWS-specific secure delivery/ingress/secrets are planned, not proven | Open | Yes | Yes | P0 |
| [R11](#r11) | High | Database operations: Backup/restore and migration least privilege lack execution evidence | Needs Verification | Yes | Yes | P0 |
| [R12](#r12) | Medium | Reliability/operations: Observability/readiness exists only in part | Partially Fixed | Yes | Yes | P0 |
| [R13](#r13) | High | Testing: Security coverage improved; persistence/real-PG/browser coverage is still missing | Partially Fixed | Yes | Yes | P0 |
| [R14](#r14) | High | Abuse prevention: Authentication/resource admission is still bypassable and unbounded | Partially Fixed | No | Yes | P1 |
| [R15](#r15) | High | Authentication UX/API client: Logout/auth-transition failures and 403 handling remain unsafe UX | Open | No | Yes | P1 |
| [R16](#r16) | Medium | Client session state: Browser persistence, hydration and cross-tab expiry are fragile | Open | No | Yes | P1 |
| [R17](#r17) | High | Backend authentication lifecycle: Session lifecycle, account recovery and environment claims are incomplete | Open | No | Yes | P1 |
| [R18](#r18) | High | Privacy/logging/entities: Sensitive logs and generated object strings remain | Open | No | Yes | P1 |
| [R19](#r19) | High | Privacy/product/API: Privacy contact, retention and account data operations are absent | Open | No | Yes | P1 |
| [R20](#r20) | Medium | Validation/frontend links: Input bounds, BCrypt byte limit and URL schemes are not aligned | Open | No | Yes | P1 |
| [R21](#r21) | Medium | Accounts/API errors: Email identity, duplicate races and error contracts remain inconsistent | Open | No | Yes | P1 |
| [R22](#r22) | High | Resource data integrity: Provider provenance and capability claims are not verified | Open | No | Yes | P1 |
| [R23](#r23) | High | Resource reliability/product: Resource freshness/verification/correction is not modeled | Open | No | Yes | P1 |
| [R24](#r24) | Medium | Provider search/UI: Pagination and unknown-distance semantics mislead results | Open | No | Yes | P1 |
| [R25](#r25) | High | External integration/abuse: Provider quotas, attribution and live readiness are not enforced | Open | Yes | Yes | P0 |
| [R26](#r26) | Medium | Upstream boundary validation: Provider payload validation conflates failure and empty results | Open | No | Yes | P1 |
| [R27](#r27) | Medium | Backend performance/reliability: Search transaction/network deadline scope is excessive | Open | No | No | P3 |
| [R28](#r28) | Medium | Persistence/API scalability: Saved-resource reads and counts are unbounded | Open | No | Yes | P2 |
| [R29](#r29) | Medium | Saved-resource persistence/time: Timestamp response and timezone semantics need persistence verification | Needs Verification | No | Yes | P1 |
| [R30](#r30) | Medium | Data integrity: Concurrent notes can silently overwrite updates | Open | No | Yes | P2 |
| [R31](#r31) | Medium | Schema integrity: Database domain invariants remain weaker than application rules | Open | No | No | P3 |
| [R32](#r32) | Medium | Resource discovery state: Search results can be stale, mislabeled or overwritten | Open | No | Yes | P1 |
| [R33](#r33) | Medium | Navigation/filter validation: Search URLs/form values are not canonical | Open | No | No | P2 |
| [R34](#r34) | Medium | Saved/dashboard UX: Saved-list/mutation failure and empty states are misleading | Open | No | Yes | P2 |
| [R35](#r35) | Medium | Notes editing UX: Notes pending/draft transitions can discard or overwrite work | Open | No | Yes | P2 |
| [R36](#r36) | High | Accessibility: Notes dialog lacks a keyboard-modal interaction contract | Open | No | Yes | P1 |
| [R37](#r37) | High | Accessibility/visual tokens: Small text and placeholder contrast still fails the intended AA target | Open | No | Yes | P1 |
| [R38](#r38) | Medium | Accessibility/semantics: Nested interactive controls, landmarks and form associations remain | Open | No | Yes | P1 |
| [R39](#r39) | Medium | Accessibility/responsive UX: Accessible announcements, control context and reflow need work | Open | No | Yes | P2 |
| [R40](#r40) | Medium | Type safety/runtime contracts: API/cache/form TypeScript boundaries remain unchecked | Open | No | No | P2 |
| [R41](#r41) | Medium | Frontend architecture/performance: Dashboard duplication and error-boundary recovery are maintainability gaps | Open | No | No | P3 |
| [R42](#r42) | Low | Navigation/content quality: Metadata, return navigation, mobile details and brand need product decisions | Partially Fixed | No | No | P3 |
| [R43](#r43) | Low | Product/policy contract: Consent checkbox is not a server-side policy record | Needs Verification | No | No | P3 |
| [R44](#r44) | Low | Maintainability/tooling: Low-impact dead code, build duplication and tooling debt remain | Open | No | No | P3 |
| [R45](#r45) | Low | Authorization: Ownership is a positive control, not a confirmed IDOR | Fixed | No | No | Retain |
| [R46](#r46) | Medium | Actuator/health authorization: Management exposure and stale-token health behavior remain conditional | Needs Verification | No | No | P2 |
| [R47](#r47) | Medium | Local quality gates: Historical coverage and formatting failures are obsolete | Fixed | No | No | Retain |
| [R48](#r48) | Low | Documentation/repository delivery: Reports/examples and deployment proposals need durable reconciliation | Partially Fixed | No | No | P3 |

<a id="r01"></a>

### R01 — C1: known fallback signing key

**Critical · Fixed · JWT configuration · Fixed code control**  
Development blocker: **No**. Production blocker: **No**. Implementation order: **Retain**.

**Evidence:** [backend/src/main/java/com/veteransconnect/security/JwtService.java:88](../backend/src/main/java/com/veteransconnect/security/JwtService.java#L88); [backend/src/test/java/com/veteransconnect/security/JwtServiceTest.java:53](../backend/src/test/java/com/veteransconnect/security/JwtServiceTest.java#L53).

**Current finding and rationale:** The old value is a denylist constant, not a fallback. Missing/blank/malformed/short keys and the decoded legacy key are rejected. The current 16 JWT tests pass. This closes the code defect, not proof of secret rotation outside the repository.

**Recommended remediation:** Preserve validation. Record rotation or non-use of the old key wherever an environment previously existed; include that operational evidence in R10. Never flag the denylist literal itself as a usable default.

**Required tests/evidence:** Keep missing/legacy/padding/weak-key, signing/verification and independent-key rejection tests. Verify new environment key ownership/rotation without exposing values.

<a id="r02"></a>

### R02 — H1: shared-origin browser API/CSRF contract

**High · Fixed · Frontend/API integration · Fixed code control**  
Development blocker: **No**. Production blocker: **No**. Implementation order: **Retain**.

**Evidence:** [frontend/lib/api.ts:42](../frontend/lib/api.ts#L42); [frontend/next.config.ts:4](../frontend/next.config.ts#L4); [backend/src/test/java/com/veteransconnect/security/CsrfTransportTest.java:93](../backend/src/test/java/com/veteransconnect/security/CsrfTransportTest.java#L93).

**Current finding and rationale:** Browser calls are relative; CSRF bootstrap now checks status and readable-cookie availability before a write. Next rewrites and deployment routing contracts exist. The old localhost browser URL and separate-host-cookie defect are obsolete for this contract. API_PROXY_TARGET remains a server-side build-time routing setting.

**Recommended remediation:** Keep one browser origin and preserve cookies/Origin/CSRF headers. Account-local HTTPS ingress verification is R10, not a reason to reopen the old browser URL defect.

**Required tests/evidence:** Existing API and CSRF tests pass; verify login/save/notes/logout through actual Dev HTTPS ingress and ensure missing/incorrect CSRF stays forbidden.

<a id="r03"></a>

### R03 — H2-A: explicit profiles and startup validation

**High · Fixed · Spring configuration · Fixed code control**  
Development blocker: **No**. Production blocker: **No**. Implementation order: **Retain**.

**Evidence:** [backend/src/main/resources/application.properties:5](../backend/src/main/resources/application.properties#L5); [backend/src/main/java/com/veteransconnect/config/StartupConfigurationValidator.java:30](../backend/src/main/java/com/veteransconnect/config/StartupConfigurationValidator.java#L30); [backend/src/test/java/com/veteransconnect/config/StartupConfigurationValidatorTest.java:73](../backend/src/test/java/com/veteransconnect/config/StartupConfigurationValidatorTest.java#L73).

**Current finding and rationale:** local/test and aws-dev/prod->deploy are separate. Deployment credentials, exact HTTPS origins, Secure cookies, lifetime/schema/proxy settings fail closed. Local defaults are profile-scoped; packaged test activation is prohibited. Current configuration tests pass. JDBC TLS enforcement remains a deployment obligation, not an implemented validator feature.

**Recommended remediation:** Preserve hardened groups and explicit activation. Satisfy JDBC TLS, secret delivery and role requirements in R10/R11 without enabling local in AWS.

**Required tests/evidence:** Retain valid/invalid profile, secret-redaction, cookie, CORS, migration, HTTPS and exact-peer tests; exercise Java 21 packaged startup and actual DB TLS separately.

<a id="r04"></a>

### R04 — H2-B: headers/proxy controls exist, but CSP matcher misses HTML errors

**Medium · Partially Fixed · HTTP security and Next Proxy · Confirmed new regression gap**  
Development blocker: **No**. Production blocker: **Yes**. Implementation order: **P1**.

**Evidence:** [frontend/proxy.ts:77](../frontend/proxy.ts#L77); [backend/src/main/java/com/veteransconnect/config/TrustedProxyConfiguration.java:25](../backend/src/main/java/com/veteransconnect/config/TrustedProxyConfiguration.java#L25); [backend/src/main/java/com/veteransconnect/config/SecurityConfig.java:113](../backend/src/main/java/com/veteransconnect/config/SecurityConfig.java#L113); [backend/src/test/java/com/veteransconnect/config/TrustedProxyIntegrationTest.java:124](../backend/src/test/java/com/veteransconnect/config/TrustedProxyIntegrationTest.java#L124).

**Current finding and rationale:** Exact-IP forwarding, HTTPS rejection, host-only HSTS, Secure cookies and normal document nonce CSP are implemented and tested. A fresh HTTP probe confirms HTML 404s at /favicon.ico-extra, /favicon.ico/not-an-icon and /_next/image-extra omit CSP because exclusions match prefixes. Normal / and ordinary 404s have CSP. This is a header-coverage defect, not demonstrated XSS.

**Recommended remediation:** Make exclusions/error handling content- and route-safe so every HTML document/error receives its matching nonce policy; keep real assets efficient and JSON API policy separate. Preserve host-only HSTS and proxy guards. Do not patch missing nonces with script unsafe-inline.

**Required tests/evidence:** Add HTTP integration cases for valid assets, excluded-looking paths, normal/encoded/missing routes and errors, both HTTPS flags, nonce/header matching and no HTML caching. Preserve existing real-Tomcat spoofing and cookie tests.

<a id="r05"></a>

### R05 — Affected/unsupported dependency baseline

**High · Open · Frontend/backend dependencies · Confirmed version/support gap; exploitability conditional**  
Development blocker: **Yes**. Production blocker: **Yes**. Implementation order: **P0**.

**Evidence:** [frontend/package.json:18](../frontend/package.json#L18); [frontend/bun.lock:376](../frontend/bun.lock#L376); [backend/pom.xml:8](../backend/pom.xml#L8).

**Current finding and rationale:** Current package/lock pins remain Next 16.1.1, React 19.2.3 and sharp 0.34.5. Fresh packaging contains Spring Security 6.4.13. The [Next security update](https://nextjs.org/blog/nextjs-security-update-october-14-2026) identifies later Next/sharp fixes, and [Spring CVE-2026-22732](https://spring.io/security/cve-2026-22732/) includes Security 6.4.13. [Boot 3.4.13 ended OSS support](https://spring.io/blog/2025/12/18/spring-boot-3-4-13-available-now/). React is included in the version inventory, not asserted here to have every conditional exploit. Relevant feature/libc/exploit conditions were not demonstrated; passing header tests does not close a dependency advisory.

**Recommended remediation:** Review maintainer advisories and select a currently supported compatible framework/BOM baseline in separate frontend/backend changes. Regenerate only the corresponding lock/resolution and scan the resulting artifacts; do not assume an old cited fixed version is the newest safe target.

**Required tests/evidence:** Lock-aware SCA, image/SBOM scan, Java 21 verify, frontend tests/types/build, nonce/CSRF/header/browser regressions and target-container startup.

<a id="r06"></a>

### R06 — Dependency scanning and artifact provenance are not effective gates

**High · Open · Supply chain/CI · Confirmed gap**  
Development blocker: **Yes**. Production blocker: **Yes**. Implementation order: **P0**.

**Evidence:** [.github/workflows/dependency-check.yml:65](../.github/workflows/dependency-check.yml#L65); [.github/workflows/dependency-check.yml:36](../.github/workflows/dependency-check.yml#L36); [backend/.mvn/wrapper/maven-wrapper.properties:3](../backend/.mvn/wrapper/maven-wrapper.properties#L3).

**Current finding and rationale:** Dependency tree/update reporting is not a vulnerability scan. The frontend broadens script trust and suppresses audit failures; Bun lockfile and npm audit are not demonstrated to form a valid gate. Runtime/action/wrapper provenance is not pinned/verified comprehensively.

**Recommended remediation:** Replace swallowed checks with supported lock-aware scanners and reviewed lifecycle-script trust, visible failures and artifact provenance. Verify wrapper download integrity and pin appropriate actions/base images. Do not claim a clean full scan from this reconciliation.

**Required tests/evidence:** Prove a known vulnerable fixture/invalid scanner invocation fails the gate; verify frozen lock use, approved scripts, checksum verification and generated image/SBOM identity.

<a id="r07"></a>

### R07 — Local checks pass but CI omits required test/gate commands

**High · Open · Release controls · Confirmed gap**  
Development blocker: **Yes**. Production blocker: **Yes**. Implementation order: **P0**.

**Evidence:** [.github/workflows/ci.yml:58](../.github/workflows/ci.yml#L58); [.github/workflows/ci.yml:112](../.github/workflows/ci.yml#L112); [backend/pom.xml:160](../backend/pom.xml#L160).

**Current finding and rationale:** Fresh verify passes 214 tests/78.85%; frontend passes 28 tests/lint/format/types/build. CI still never invokes frontend test:run or backend verify. Historical coverage/format failures are obsolete, but their workflow omission remains. Docker packaging skips tests and CI does not validate the packaged runtime.

**Recommended remediation:** Run the actual required commands under supported pinned runtimes, retain reports and make failures required branch/environment gates. Build/deploy only artifacts from the verified commit; keep performance optimizations to CI secondary.

**Required tests/evidence:** A failing frontend test and coverage below 70% must each fail CI; Java 21 execution, protected-branch job requirements and artifact traceability need current evidence.

<a id="r08"></a>

### R08 — Containers/toolchains lack reproducibility, isolation and capacity proof

**High · Open · Container/runtime delivery · Confirmed gap**  
Development blocker: **Yes**. Production blocker: **Yes**. Implementation order: **P0**.

**Evidence:** [frontend/Dockerfile:22](../frontend/Dockerfile#L22); [frontend/.dockerignore:4](../frontend/.dockerignore#L4); [backend/Dockerfile:12](../backend/Dockerfile#L12); [.github/workflows/ci.yml:88](../.github/workflows/ci.yml#L88).

**Current finding and rationale:** No explicit USER; floating runtime tags; full frontend builder copy; incomplete env-variant exclusions; no actual ARM64/Bun/Next/Java21 image smoke/capacity proof. CI NODE_VERSION is declared but unused, so it is not evidence of Node 20 execution. No measured footprint justifies downsizing the nonce SSR/JVM/DB host.

**Recommended remediation:** Pin/test the real runtime, exclude all secrets, use a minimal non-root artifact and service-specific writable paths, drop capabilities, define health/shutdown/resource budgets. Verify ARM or cost an x86 fallback. Preserve frontend/backend separation.

**Required tests/evidence:** Actual architecture image build, secret-context inspection, non-root/read-only startup, SIGTERM, private ports, health, SSR nonces, memory/CPU/backups under bounded load.

<a id="r09"></a>

### R09 — Static-export architecture conflicts with request-time CSP

**High · Partially Fixed · Architecture/documentation · Confirmed gap**  
Development blocker: **Yes**. Production blocker: **Yes**. Implementation order: **P0**.

**Evidence:** [frontend/app/layout.tsx:23](../frontend/app/layout.tsx#L23); [frontend/proxy.ts:45](../frontend/proxy.ts#L45); [docs/PRODUCTION_READINESS.md:9](../docs/PRODUCTION_READINESS.md#L9); [docs/architecture/aws-development-architecture.md:22](../docs/architecture/aws-development-architecture.md#L22).

**Current finding and rationale:** Fresh build marks all ten routes dynamic. Current H2-B and H2-C planning correctly require Next SSR; the older production assessment still proposes S3 static export and static cost assumptions. A planning document is not an implemented/approved architecture.

**Recommended remediation:** Approve a running Next-server topology and explicitly supersede the older static recommendation/cost model. Any future static/hash-CSP alternative is a separately reviewed design, not a reason to disable CSP or cache nonce HTML.

**Required tests/evidence:** Architecture acceptance must match build route output; real HTML responses must be no-store with fresh matching nonces and correct same-origin API routing.

<a id="r10"></a>

### R10 — AWS-specific secure delivery/ingress/secrets are planned, not proven

**High · Open · AWS Development/Production delivery · Confirmed gap**  
Development blocker: **Yes**. Production blocker: **Yes**. Implementation order: **P0**.

**Evidence:** [docker-compose.yml:57](../docker-compose.yml#L57); [docs/architecture/aws-deployment-plan.md:3](../docs/architecture/aws-deployment-plan.md#L3); [backend/src/main/java/com/veteransconnect/config/StartupConfigurationValidator.java:119](../backend/src/main/java/com/veteransconnect/config/StartupConfigurationValidator.java#L119).

**Current finding and rationale:** H2-C now specifies IAM/OIDC, TLS, proxy identity, secret delivery, networks and approval gates. No deploy workflow/IaC/real ingress or account evidence is present. This does not establish that an external AWS account lacks controls; its state was not inspected. Existing local Compose is deliberately unsuitable for AWS.

**Recommended remediation:** Review/approve and then separately implement the Dev runtime, identity, secret/rotation, exact peer, DB TLS and network boundaries. Keep aws-dev hardened; never use local to get a cloud deployment running. Verify C1 rotation/non-use and account separation.

**Required tests/evidence:** Private boot plus HTTPS/browser acceptance, direct-origin/forged-header denial, account/role scope, secret absence from logs/images, wrong-CA/hostname/plaintext DB failures and no public app/DB/admin ports.

<a id="r11"></a>

### R11 — Backup/restore and migration least privilege lack execution evidence

**High · Needs Verification · Database operations · Confirmed gap**  
Development blocker: **Yes**. Production blocker: **Yes**. Implementation order: **P0**.

**Evidence:** [backend/src/main/resources/application.properties:15](../backend/src/main/resources/application.properties#L15); [backend/src/main/resources/db/migration/V1__create_initial_schema.sql:1](../backend/src/main/resources/db/migration/V1__create_initial_schema.sql#L1); [docs/architecture/aws-deployment-plan.md:28](../docs/architecture/aws-deployment-plan.md#L28).

**Current finding and rationale:** Flyway/Hibernate safeguards and recovery planning exist. No real PostgreSQL/managed DB restore, restricted runtime grant, migration-job or rollback drill has been established. RPO/RTO and cost figures are proposed objectives, not measured results. H2 migrations do not prove PostgreSQL historical-schema compatibility.

**Recommended remediation:** Define a tested pre-deploy migration role/job and DML runtime role while retaining Flyway enabled/clean disabled and Hibernate validate. Test startup with pre-applied history/restricted grants. Assign backup/CA/restore owners and demonstrate off-host recovery before Dev acceptance.

**Required tests/evidence:** Actual selected PostgreSQL version, clean/upgrade migrations, restricted grants, pending-change failure, missing-mount refusal, encrypted backup/restore and compatible/incompatible rollback drills.

<a id="r12"></a>

### R12 — Observability/readiness exists only in part

**Medium · Partially Fixed · Reliability/operations · Confirmed gap**  
Development blocker: **Yes**. Production blocker: **Yes**. Implementation order: **P0**.

**Evidence:** [backend/pom.xml:53](../backend/pom.xml#L53); [docker-compose.yml:81](../docker-compose.yml#L81); [backend/src/main/java/com/veteransconnect/client/VaFacilitiesClient.java:136](../backend/src/main/java/com/veteransconnect/client/VaFacilitiesClient.java#L136).

**Current finding and rationale:** Actuator, timeouts and local health probes exist; H2-C defines operational checks. No actual log/metric export, backup/cert alerts or provider readiness proof was observed. API key validation happens at search time, so process/DB health alone is insufficient.

**Recommended remediation:** Implement bounded redacted logging/metrics and independent host/disk/backup/certificate alerts for the chosen Dev stack. Separate liveness from integration readiness; avoid restarting healthy instances merely because a provider is down.

**Required tests/evidence:** Missing/wrong provider key, upstream outage, disk/backup/certificate failure signals, shutdown/readiness, retained log limits and scheduled-off behavior.

<a id="r13"></a>

### R13 — Security coverage improved; persistence/real-PG/browser coverage is still missing

**High · Partially Fixed · Testing · Confirmed gap**  
Development blocker: **Yes**. Production blocker: **Yes**. Implementation order: **P0**.

**Evidence:** [backend/src/test/java/com/veteransconnect/config/TrustedProxyIntegrationTest.java:39](../backend/src/test/java/com/veteransconnect/config/TrustedProxyIntegrationTest.java#L39); [backend/src/test/java/com/veteransconnect/security/CsrfTransportTest.java:40](../backend/src/test/java/com/veteransconnect/security/CsrfTransportTest.java#L40); [backend/src/main/java/com/veteransconnect/service/SavedResourceServiceImpl.java:34](../backend/src/main/java/com/veteransconnect/service/SavedResourceServiceImpl.java#L34).

**Current finding and rationale:** JWT/config/full-security-chain/Tomcat tests now exist. Fresh coverage is SecurityConfig 58/62, JwtService 37/37, HTTPS filter 10/10, but SavedResourceServiceImpl 0/45 and CustomUserDetailsService 0/7. No committed real-PostgreSQL saved-resource ownership/timestamp/concurrency suite or browser/a11y suite was found. Temporary historical probes are not durable regressions.

**Recommended remediation:** Add focused saved-service and actual-PostgreSQL migration/ownership tests before relying on Dev acceptance; follow with browser critical flows, auth failure paths and accessibility checks. Preserve useful isolated controller tests; do not equate aggregate coverage with trust-boundary completeness.

**Required tests/evidence:** Two-user list/update/delete denial, real persistence/timestamps/constraints, migrations, token/cookie/CSRF/CORS, browser login/search/save/notes/logout and keyboard navigation.

<a id="r14"></a>

### R14 — Authentication/resource admission is still bypassable and unbounded

**High · Partially Fixed · Abuse prevention · Confirmed gap**  
Development blocker: **No**. Production blocker: **Yes**. Implementation order: **P1**.

**Evidence:** [backend/src/main/java/com/veteransconnect/security/AuthRateLimiter.java:24](../backend/src/main/java/com/veteransconnect/security/AuthRateLimiter.java#L24); [backend/src/main/java/com/veteransconnect/security/AuthRateLimiter.java:47](../backend/src/main/java/com/veteransconnect/security/AuthRateLimiter.java#L47); [backend/src/main/java/com/veteransconnect/security/AuthRateLimiter.java:70](../backend/src/main/java/com/veteransconnect/security/AuthRateLimiter.java#L70).

**Current finding and rationale:** H2-B removed raw XFF trust and established container-normalized identity. The limiter still keys endpoint+IP+email without aggregate account/IP caps or eviction; invalid DTO paths precede it, restart/replicas reset state and Retry-After is absent. Memory/cost abuse is not closed by safe forwarding.

**Recommended remediation:** Use bounded expiring single-instance state, independent aggregate limits and deliberate 429/retry semantics; validate identity at the actual ingress. Revisit shared state only when scaling requires it, not by adding Redis preemptively.

**Required tests/evidence:** Rotate emails/IPs, invalid bodies, eviction/clock edges/concurrency, spoofed headers and restart/replica policy. Restricted synthetic Dev must not be treated as public attack-ready.

<a id="r15"></a>

### R15 — Logout/auth-transition failures and 403 handling remain unsafe UX

**High · Open · Authentication UX/API client · Confirmed gap**  
Development blocker: **No**. Production blocker: **Yes**. Implementation order: **P1**.

**Evidence:** [frontend/context/AuthContext.tsx:47](../frontend/context/AuthContext.tsx#L47); [frontend/lib/api.ts:81](../frontend/lib/api.ts#L81); [backend/src/main/java/com/veteransconnect/controller/AuthController.java:119](../backend/src/main/java/com/veteransconnect/controller/AuthController.java#L119).

**Current finding and rationale:** Logout is fire-and-forget, suppresses server failure and clears the UI before HttpOnly cookie removal is confirmed; a late response may clear a later login. Protected 403 responses still trigger global logout. H1 fixed bootstrap status handling, so that old subclaim must not be repeated.

**Recommended remediation:** Coordinate/await auth transitions with pending/error/retry state. Separate session expiry (401) from CSRF/permission errors (403). Keep private data hidden during termination without claiming that local cleanup removed the server cookie.

**Required tests/evidence:** Failed/slow logout, rapid logout-login, stale request 401, valid-session 403, CSRF failure, bootstrap failure and reload/cookie reconciliation.

<a id="r16"></a>

### R16 — Browser persistence, hydration and cross-tab expiry are fragile

**Medium · Open · Client session state · Confirmed gap**  
Development blocker: **No**. Production blocker: **Yes**. Implementation order: **P1**.

**Evidence:** [frontend/lib/auth.ts:6](../frontend/lib/auth.ts#L6); [frontend/lib/auth.ts:38](../frontend/lib/auth.ts#L38); [frontend/context/AuthContext.tsx:81](../frontend/context/AuthContext.tsx#L81); [frontend/app/(dashboard)/dashboard/page.tsx:186](../frontend/app/%28dashboard%29/dashboard/page.tsx#L186).

**Current finding and rationale:** localStorage can throw outside bootstrap try/finally; parsed profiles are trusted and persist identity/ZIP without a profile TTL. Invalid branches can crash rendering before /me reconciles. Cookie-only restoration lacks reliable expiry/cross-tab coordination; page effects can start above the guard and race auth transitions.

**Recommended remediation:** Prefer minimal in-memory profile plus authoritative /me, with exception-safe optional persistence and session-scoped/cancelled requests. Validate any retained cache, coordinate account/expiry events and do not render unverified stale identity.

**Required tests/evidence:** Denied reads/writes/removal, corrupt/invalid cache, cookie-only load, account switching across tabs, expired timers, hydration/deep-link races and stale-user data cleanup.

<a id="r17"></a>

### R17 — Session lifecycle, account recovery and environment claims are incomplete

**High · Open · Backend authentication lifecycle · Confirmed gap**  
Development blocker: **No**. Production blocker: **Yes**. Implementation order: **P1**.

**Evidence:** [backend/src/main/java/com/veteransconnect/controller/AuthController.java:125](../backend/src/main/java/com/veteransconnect/controller/AuthController.java#L125); [backend/src/main/java/com/veteransconnect/security/JwtService.java:46](../backend/src/main/java/com/veteransconnect/security/JwtService.java#L46); [backend/src/main/java/com/veteransconnect/model/User.java:22](../backend/src/main/java/com/veteransconnect/model/User.java#L22).

**Current finding and rationale:** JWT logout does not revoke copied tokens; /me reports configured full lifetime, not actual remaining expiry. No account disable/version, recovery/change-password or email verification flow exists. Independent keys/profile guidance now improve environment separation, but issuer/audience claims remain absent. These are lifecycle/design gaps, not evidence of stolen tokens.

**Recommended remediation:** Agree a small-team public-launch session/recovery/containment policy. Return truthful absolute expiry; implement selected revocation/disable/recovery mechanisms and independent keys, with issuer/audience where the contract requires them. Do not invent a new auth provider or assert verified veteran status.

**Required tests/evidence:** Expiry/remaining time, stolen-token containment policy, disable/reset/recovery, email ownership, key rotation and dev/prod cross-token rejection.

<a id="r18"></a>

### R18 — Sensitive logs and generated object strings remain

**High · Open · Privacy/logging/entities · Confirmed gap**  
Development blocker: **No**. Production blocker: **Yes**. Implementation order: **P1**.

**Evidence:** [backend/src/main/java/com/veteransconnect/service/ResourceSearchServiceImpl.java:50](../backend/src/main/java/com/veteransconnect/service/ResourceSearchServiceImpl.java#L50); [backend/src/main/java/com/veteransconnect/service/SavedResourceServiceImpl.java:60](../backend/src/main/java/com/veteransconnect/service/SavedResourceServiceImpl.java#L60); [backend/src/main/java/com/veteransconnect/model/User.java:18](../backend/src/main/java/com/veteransconnect/model/User.java#L18); [backend/src/main/java/com/veteransconnect/client/VaFacilitiesClient.java:126](../backend/src/main/java/com/veteransconnect/client/VaFacilitiesClient.java#L126).

**Current finding and rationale:** INFO includes ZIP/category/free text and email/resource associations; upstream exception messages may contain payloads. User @Data/default credential-record strings can include sensitive fields. No current explicit password logger or deployed log leak was demonstrated.

**Recommended remediation:** Remove/minimize identifying search/account data and upstream bodies; constrain log fields, control characters and retention. Replace unsafe generated toString/equality where needed. Restrict actual log/backup readers; synthetic Dev does not authorize real personal data.

**Required tests/evidence:** Capture synthetic credential/notes/search sentinels across success/error/debug paths and assert absence from logs/serialized strings; verify retention/access without exposing values.

<a id="r19"></a>

### R19 — Privacy contact, retention and account data operations are absent

**High · Open · Privacy/product/API · Confirmed gap**  
Development blocker: **No**. Production blocker: **Yes**. Implementation order: **P1**.

**Evidence:** [frontend/app/privacy/page.tsx:49](../frontend/app/privacy/page.tsx#L49); [backend/src/main/java/com/veteransconnect/controller/UserController.java:19](../backend/src/main/java/com/veteransconnect/controller/UserController.java#L19); [backend/src/main/java/com/veteransconnect/model/SavedResource.java:75](../backend/src/main/java/com/veteransconnect/model/SavedResource.java#L75).

**Current finding and rationale:** The published privacy action has no actionable contact/request path. Account export/deletion/correction, retention and backup deletion/incident ownership are not implemented. Notes can contain sensitive material; removing a single bookmark is not account erasure.

**Recommended remediation:** Define a workable verified data-request channel, retention/backup policy and minimal account operations/support ownership. Add contextual sensitive-notes guidance. Avoid legal compliance claims without review; do not collect extra identity data unnecessarily.

**Required tests/evidence:** Verified request/export/delete/correction flow, related-row and backup handling, unauthorized requests, note-entry guidance and consistency of published policy.

<a id="r20"></a>

### R20 — Input bounds, BCrypt byte limit and URL schemes are not aligned

**Medium · Open · Validation/frontend links · Confirmed gap**  
Development blocker: **No**. Production blocker: **Yes**. Implementation order: **P1**.

**Evidence:** [backend/src/main/java/com/veteransconnect/dto/UserRegistrationRequest.java:26](../backend/src/main/java/com/veteransconnect/dto/UserRegistrationRequest.java#L26); [backend/src/main/java/com/veteransconnect/dto/SaveResourceRequest.java:28](../backend/src/main/java/com/veteransconnect/dto/SaveResourceRequest.java#L28); [frontend/components/resources/ResourceCard.tsx:110](../frontend/components/resources/ResourceCard.tsx#L110); [backend/src/main/java/com/veteransconnect/service/UserServiceImpl.java:88](../backend/src/main/java/com/veteransconnect/service/UserServiceImpl.java#L88).

**Current finding and rationale:** Names/email/password and many saved fields lack database-aligned limits; websites have no http/https allowlist. A fresh isolated probe of the packaged encoder rejects 73 ASCII bytes and 80-byte UTF-8 input even though the DTO has only a minimum. No executable URL-XSS, SQL injection or SSRF was demonstrated.

**Recommended remediation:** Validate byte-aware password policy, schema/URL/source/state limits and reasonable body/query budgets at the backend; align frontend field feedback without relying on client checks. Keep notes plain text unless a separately reviewed renderer is needed.

**Required tests/evidence:** Boundary/multibyte passwords, oversize fields/bodies, allowed/disallowed URL schemes, invalid enum/source/state and backend/frontend error agreement.

<a id="r21"></a>

### R21 — Email identity, duplicate races and error contracts remain inconsistent

**Medium · Open · Accounts/API errors · Confirmed gap**  
Development blocker: **No**. Production blocker: **Yes**. Implementation order: **P1**.

**Evidence:** [backend/src/main/java/com/veteransconnect/service/UserServiceImpl.java:36](../backend/src/main/java/com/veteransconnect/service/UserServiceImpl.java#L36); [backend/src/main/java/com/veteransconnect/service/SavedResourceServiceImpl.java:37](../backend/src/main/java/com/veteransconnect/service/SavedResourceServiceImpl.java#L37); [backend/src/main/java/com/veteransconnect/exception/GlobalExceptionHandler.java:70](../backend/src/main/java/com/veteransconnect/exception/GlobalExceptionHandler.java#L70); [backend/src/main/java/com/veteransconnect/controller/UserController.java:37](../backend/src/main/java/com/veteransconnect/controller/UserController.java#L37).

**Current finding and rationale:** Persistence/login do not canonicalize email like the limiter. Check-then-insert races rely on DB constraints without deliberate conflict mapping. Filter/controller/validation errors vary, broad exception messages escape, and /users can return object/array with silent filter precedence. Existing unique constraints correctly prevent duplicates.

**Recommended remediation:** Choose canonical identity/migration policy, translate real constraint races to a consistent safe API contract and retain field errors. Simplify self-query shapes and document filter semantics; use lightweight contracts rather than a large generation framework by default.

**Required tests/evidence:** Case/whitespace identity, simultaneous duplicate registration/save, malformed JSON/UUID/enum, integrity errors, safe messages and preserved frontend field details.

<a id="r22"></a>

### R22 — Provider provenance and capability claims are not verified

**High · Open · Resource data integrity · Confirmed gap**  
Development blocker: **No**. Production blocker: **Yes**. Implementation order: **P1**.

**Evidence:** [backend/src/main/java/com/veteransconnect/service/SavedResourceServiceImpl.java:46](../backend/src/main/java/com/veteransconnect/service/SavedResourceServiceImpl.java#L46); [backend/src/main/java/com/veteransconnect/service/ResourceSearchServiceImpl.java:121](../backend/src/main/java/com/veteransconnect/service/ResourceSearchServiceImpl.java#L121); [backend/src/main/java/com/veteransconnect/model/enums/ResourceCategory.java:13](../backend/src/main/java/com/veteransconnect/model/enums/ResourceCategory.java#L13); [backend/src/main/java/com/veteransconnect/service/ResourceSearchServiceImpl.java:138](../backend/src/main/java/com/veteransconnect/service/ResourceSearchServiceImpl.java#L138).

**Current finding and rationale:** A user can save fabricated fields under a provider label in their own library; identity checks do not authenticate the provider record. Requested categories relabel facilities even when the provider does not establish those capabilities. Saved-state lookup ignores sourceApi even though uniqueness includes it. No cross-user/global poisoning is alleged.

**Recommended remediation:** Resolve/validate provider identity or explicitly label user-entered snapshots, key saved status by source+external ID and make category/copy semantics reflect verified service data. Keep ownership controls intact.

**Required tests/evidence:** Forged source/record payloads, source-ID collisions, supported/unknown facility types and category/capability/copy consistency.

<a id="r23"></a>

### R23 — Resource freshness/verification/correction is not modeled

**High · Open · Resource reliability/product · Confirmed gap**  
Development blocker: **No**. Production blocker: **Yes**. Implementation order: **P1**.

**Evidence:** [backend/src/main/java/com/veteransconnect/model/SavedResource.java:79](../backend/src/main/java/com/veteransconnect/model/SavedResource.java#L79); [backend/src/main/resources/application.properties:48](../backend/src/main/resources/application.properties#L48); [frontend/app/page.tsx:50](../frontend/app/page.tsx#L50).

**Current finding and rationale:** Bookmark timestamps are not provider verification dates. There is no provider/source environment, last fetch/verification, stale/retired status or correction owner. Sandbox defaults and broad discovery copy do not establish live service availability. Legal disclaimers improve caution but do not verify the data.

**Recommended remediation:** Identify sandbox/source/coverage clearly, record freshness and verification semantics, handle stale/unavailable records and provide a correction/review path before public reliance. Do not imply that adding a timestamp proves verification.

**Required tests/evidence:** Stale/changed/deleted provider records, sandbox/live labeling, snapshot refresh/correction routing and honest empty/partial messages.

<a id="r24"></a>

### R24 — Pagination and unknown-distance semantics mislead results

**Medium · Open · Provider search/UI · Confirmed gap**  
Development blocker: **No**. Production blocker: **Yes**. Implementation order: **P1**.

**Evidence:** [backend/src/main/java/com/veteransconnect/client/VaFacilitiesClient.java:90](../backend/src/main/java/com/veteransconnect/client/VaFacilitiesClient.java#L90); [backend/src/main/java/com/veteransconnect/client/VaFacilitiesClient.java:116](../backend/src/main/java/com/veteransconnect/client/VaFacilitiesClient.java#L116); [frontend/components/resources/ResourceCard.tsx:65](../frontend/components/resources/ResourceCard.tsx#L65).

**Current finding and rationale:** Only the initial provider page is consumed; no partial-result indication reaches the UI. Missing distance becomes real zero, influencing sort/display. The query is not a comprehensive directory, and filtering the first page cannot prove no matches.

**Recommended remediation:** Preserve nullable unknown distance; expose explicit bounded pagination/partial-result metadata and truthful labels before adding more traffic or broad provider fan-out.

**Required tests/evidence:** More than one provider page, missing/null distances, stable ordering, no-match within a partial page and UI partial/unknown labels.

<a id="r25"></a>

### R25 — Provider quotas, attribution and live readiness are not enforced

**High · Open · External integration/abuse · Confirmed gap**  
Development blocker: **Yes**. Production blocker: **Yes**. Implementation order: **P0**.

**Evidence:** [backend/src/main/java/com/veteransconnect/client/GeocodingService.java:115](../backend/src/main/java/com/veteransconnect/client/GeocodingService.java#L115); [backend/src/main/java/com/veteransconnect/client/GeocodingService.java:84](../backend/src/main/java/com/veteransconnect/client/GeocodingService.java#L84); [frontend/components/layout/Footer.tsx:37](../frontend/components/layout/Footer.tsx#L37); [backend/src/main/java/com/veteransconnect/client/VaFacilitiesClient.java:136](../backend/src/main/java/com/veteransconnect/client/VaFacilitiesClient.java#L136).

**Current finding and rationale:** No aggregate Nominatim throttle/single-flight/TTL is present; concurrent misses can violate the current [application-wide usage policy](https://operations.osmfoundation.org/policies/nominatim/). Footer omits geocoding attribution, and configured contact ownership is unverified. Provider key validation is late. This blocks normal live-provider Dev acceptance; isolated approved stub-only tests can precede it without calling public services.

**Recommended remediation:** Use bounded single-instance quota/concurrency/caching, correct attribution and a valid owned contact; validate sandbox credentials/contract. Add whole-search admission/cost budgets. Do not use distributed infrastructure solely for a future replica count or load-test a public provider.

**Required tests/evidence:** Concurrent distinct/same ZIP calls, aggregate request cadence, cache expiry/size, provider 429/timeout/config failure, attribution and stub-only load tests.

<a id="r26"></a>

### R26 — Provider payload validation conflates failure and empty results

**Medium · Open · Upstream boundary validation · Confirmed gap**  
Development blocker: **No**. Production blocker: **Yes**. Implementation order: **P1**.

**Evidence:** [backend/src/main/java/com/veteransconnect/client/GeocodingService.java:135](../backend/src/main/java/com/veteransconnect/client/GeocodingService.java#L135); [backend/src/main/java/com/veteransconnect/client/VaFacilitiesClient.java:97](../backend/src/main/java/com/veteransconnect/client/VaFacilitiesClient.java#L97); [backend/src/main/java/com/veteransconnect/client/VaFacilitiesClient.java:105](../backend/src/main/java/com/veteransconnect/client/VaFacilitiesClient.java#L105).

**Current finding and rationale:** Non-finite/out-of-range coordinates are not rejected; null distance entries can dereference null; usable names/types are not required. Missing upstream data can become a successful empty list. Current source confirms missing guards; not every failure variant was executed in this review.

**Recommended remediation:** Validate finite coordinate ranges and required provider fields, handle null entries and distinguish invalid/unavailable payloads from valid no matches. Preserve sanitized user errors and useful non-sensitive diagnostics.

**Required tests/evidence:** NaN/Infinity/range violations, null distance-list items, absent/malformed data, unknown type/name and valid empty response fixtures.

<a id="r27"></a>

### R27 — Search transaction/network deadline scope is excessive

**Medium · Open · Backend performance/reliability · Confirmed broad scope; impact unmeasured**  
Development blocker: **No**. Production blocker: **No**. Implementation order: **P3**.

**Evidence:** [backend/src/main/java/com/veteransconnect/service/ResourceSearchServiceImpl.java:38](../backend/src/main/java/com/veteransconnect/service/ResourceSearchServiceImpl.java#L38); [backend/src/main/java/com/veteransconnect/service/ResourceSearchServiceImpl.java:60](../backend/src/main/java/com/veteransconnect/service/ResourceSearchServiceImpl.java#L60); [backend/src/main/java/com/veteransconnect/client/VaFacilitiesClient.java:62](../backend/src/main/java/com/veteransconnect/client/VaFacilitiesClient.java#L62).

**Current finding and rationale:** External calls run sequentially inside a read-only service transaction; per-call timeouts exist but no total request budget or partial-result strategy. DB connection occupancy and user latency have not been measured. Lack of retries alone is not a defect and avoids amplification.

**Recommended remediation:** Measure latency/pool acquisition, shorten DB transaction scope, define overall deadlines and deliberate partial/failure semantics before considering bounded concurrency/cache/circuit behavior. Capacity acceptance in R08 may elevate this if tests fail.

**Required tests/evidence:** Controlled slow/error providers, total latency bounds, pool occupancy, partial failure/cancellation and no quota-amplifying retries.

<a id="r28"></a>

### R28 — Saved-resource reads and counts are unbounded

**Medium · Open · Persistence/API scalability · Confirmed gap**  
Development blocker: **No**. Production blocker: **Yes**. Implementation order: **P2**.

**Evidence:** [backend/src/main/java/com/veteransconnect/service/SavedResourceServiceImpl.java:70](../backend/src/main/java/com/veteransconnect/service/SavedResourceServiceImpl.java#L70); [backend/src/main/java/com/veteransconnect/service/ResourceSearchServiceImpl.java:153](../backend/src/main/java/com/veteransconnect/service/ResourceSearchServiceImpl.java#L153); [frontend/app/(dashboard)/dashboard/page.tsx:224](../frontend/app/%28dashboard%29/dashboard/page.tsx#L224).

**Current finding and rationale:** Search loads full saved entities, dashboard downloads a complete list to count/show three, and no per-user quota/page bound exists. No measured slow query/N+1 is asserted. Public write/storage admission needs bounds even if small synthetic Dev is usable.

**Recommended remediation:** Add bounded list/summary and per-user save policies, use source-ID projections and deterministic pagination; verify indexes/plans before adding caches or changing database products.

**Required tests/evidence:** Large user fixtures, response/query byte budgets, quota rejection, pagination stability, summaries and mutation invalidation.

<a id="r29"></a>

### R29 — Timestamp response and timezone semantics need persistence verification

**Medium · Needs Verification · Saved-resource persistence/time · Confirmed gap**  
Development blocker: **No**. Production blocker: **Yes**. Implementation order: **P1**.

**Evidence:** [backend/src/main/java/com/veteransconnect/service/SavedResourceServiceImpl.java:62](../backend/src/main/java/com/veteransconnect/service/SavedResourceServiceImpl.java#L62); [backend/src/main/java/com/veteransconnect/model/SavedResource.java:77](../backend/src/main/java/com/veteransconnect/model/SavedResource.java#L77); [frontend/components/resources/SavedResourceCard.tsx:62](../frontend/components/resources/SavedResourceCard.tsx#L62).

**Current finding and rationale:** DTO mapping still precedes transaction flush, and LocalDateTime/SQL timestamps have no offset contract. Earlier temporary H2 probes reported null/stale response timestamps, but this review did not rerun that service persistence probe. Current service coverage is zero: do not call the old runtime observation newly reproduced.

**Recommended remediation:** First commit a reproduction on H2 and actual PostgreSQL; if confirmed map after authoritative timestamp assignment/flush. Establish an explicit UTC/offset wire convention and safe date display, with migration impact reviewed.

**Required tests/evidence:** Create/update response versus committed timestamps, invalid/null dates, timezone boundaries and old stored timestamp interpretation.

<a id="r30"></a>

### R30 — Concurrent notes can silently overwrite updates

**Medium · Open · Data integrity · Confirmed gap**  
Development blocker: **No**. Production blocker: **Yes**. Implementation order: **P2**.

**Evidence:** [backend/src/main/java/com/veteransconnect/model/SavedResource.java:29](../backend/src/main/java/com/veteransconnect/model/SavedResource.java#L29); [backend/src/main/java/com/veteransconnect/service/SavedResourceServiceImpl.java:79](../backend/src/main/java/com/veteransconnect/service/SavedResourceServiceImpl.java#L79).

**Current finding and rationale:** No version/conditional-write contract exists. The later of two valid note writes wins without a conflict indication; the UI also has draft races (R35). No multi-user ownership bypass is implied.

**Recommended remediation:** Choose a minimal optimistic version/expected-version or deliberate conflict policy and expose recoverable conflicts to the editor. Do not use a display timestamp as an unenforced version.

**Required tests/evidence:** Two-tab writes, stale updates, concurrent delete/update, conflict feedback and a recoverable draft.

<a id="r31"></a>

### R31 — Database domain invariants remain weaker than application rules

**Medium · Open · Schema integrity · Defense-in-depth improvement**  
Development blocker: **No**. Production blocker: **No**. Implementation order: **P3**.

**Evidence:** [backend/src/main/resources/db/migration/V1__create_initial_schema.sql:7](../backend/src/main/resources/db/migration/V1__create_initial_schema.sql#L7); [backend/src/main/java/com/veteransconnect/controller/UserController.java:60](../backend/src/main/java/com/veteransconnect/controller/UserController.java#L60); [backend/src/main/java/com/veteransconnect/model/SavedResource.java:75](../backend/src/main/java/com/veteransconnect/model/SavedResource.java#L75).

**Current finding and rationale:** DB permits nullable ZIP and unconstrained domain fields that normal validated API writes intend to reject; import/future paths could create rows the UI/controller cannot interpret. Hibernate validate is not validation of every CHECK or import rule. This is defensive integrity debt, not demonstrated current remote data corruption.

**Recommended remediation:** Align safe database invariants with DTOs and an explicit account-deletion policy, clean legacy rows before enforcing constraints, and make reads null-safe where the domain permits null.

**Required tests/evidence:** Invalid direct/import rows, nullable ZIP reads, migration/backfill safety and actual PostgreSQL CHECK/foreign-key behavior.

<a id="r32"></a>

### R32 — Search results can be stale, mislabeled or overwritten

**Medium · Open · Resource discovery state · Confirmed gap**  
Development blocker: **No**. Production blocker: **Yes**. Implementation order: **P1**.

**Evidence:** [frontend/app/(dashboard)/resources/page.tsx:59](../frontend/app/%28dashboard%29/resources/page.tsx#L59); [frontend/app/(dashboard)/resources/page.tsx:61](../frontend/app/%28dashboard%29/resources/page.tsx#L61); [frontend/app/(dashboard)/resources/page.tsx:140](../frontend/app/%28dashboard%29/resources/page.tsx#L140).

**Current finding and rationale:** A failed later search retains old results but labels them with the new parameters; requests have no latest-result/cancellation guard. Old locations can appear under a new ZIP, materially misleading resource discovery.

**Recommended remediation:** Bind results to successful query parameters and implement a clear pending/stale/error state with cancellation/latest-request identity. Scope results to the current user/session.

**Required tests/evidence:** A success then B failure, reversed response order, auto/manual overlap, account change, unmount and honest stale-result labeling.

<a id="r33"></a>

### R33 — Search URLs/form values are not canonical

**Medium · Open · Navigation/filter validation · Confirmed gap**  
Development blocker: **No**. Production blocker: **No**. Implementation order: **P2**.

**Evidence:** [frontend/app/(dashboard)/resources/page.tsx:34](../frontend/app/%28dashboard%29/resources/page.tsx#L34); [frontend/components/resources/ResourceFilters.tsx:26](../frontend/components/resources/ResourceFilters.tsx#L26); [frontend/lib/api.ts:142](../frontend/lib/api.ts#L142).

**Current finding and rationale:** Prototype properties pass category membership; radius parsing permits invalid/inconsistent values and zero is omitted. Form submissions do not update the URL, so back/refresh/share can restore old intent. Backend validation prevents these from being an authorization/injection bypass.

**Recommended remediation:** Use own-key/finite-number/exact-ZIP validation and one URL/form/API radius policy. Let canonical submitted state drive URL and fetching, and clarify shortcuts.

**Required tests/evidence:** toString category, Infinity/blank/zero/negative radius, unsupported valid radius, malformed ZIP and back/refresh/shared-link behavior.

<a id="r34"></a>

### R34 — Saved-list/mutation failure and empty states are misleading

**Medium · Open · Saved/dashboard UX · Confirmed gap**  
Development blocker: **No**. Production blocker: **Yes**. Implementation order: **P2**.

**Evidence:** [frontend/components/resources/ResourceCard.tsx:40](../frontend/components/resources/ResourceCard.tsx#L40); [frontend/components/resources/SavedResourceCard.tsx:34](../frontend/components/resources/SavedResourceCard.tsx#L34); [frontend/app/(dashboard)/saved/page.tsx:54](../frontend/app/%28dashboard%29/saved/page.tsx#L54); [frontend/app/(dashboard)/dashboard/page.tsx:510](../frontend/app/%28dashboard%29/dashboard/page.tsx#L510).

**Current finding and rationale:** Save/remove errors are console-only; removing a last selected category leaves an invisible invalid filter; dashboard failure can show zero/None/nothing saved. The latest-three metric is not a real recency window.

**Recommended remediation:** Show resource-scoped retry/errors, distinguish unavailable from empty, recover invalid filters and accurately name metrics. Preserve server conflict semantics and do not hide failed mutations.

**Required tests/evidence:** Failed/duplicate mutations, last-item category deletion with other rows remaining, dashboard API failure/retry and accurate count/recency states.

<a id="r35"></a>

### R35 — Notes pending/draft transitions can discard or overwrite work

**Medium · Open · Notes editing UX · Confirmed gap**  
Development blocker: **No**. Production blocker: **Yes**. Implementation order: **P2**.

**Evidence:** [frontend/components/resources/NotesModal.tsx:27](../frontend/components/resources/NotesModal.tsx#L27); [frontend/components/resources/NotesModal.tsx:38](../frontend/components/resources/NotesModal.tsx#L38); [frontend/components/resources/SavedResourceCard.tsx:163](../frontend/components/resources/SavedResourceCard.tsx#L163).

**Current finding and rationale:** Escape/backdrop/cancel dismiss regardless of dirty/pending state; a stale save callback can affect a reopened editor and both parent/child close the modal. Plain-text rendering also contradicts Markdown help; that copy issue is low priority, not a reason to add a renderer.

**Recommended remediation:** Coordinate one editor lifecycle, protect pending/dirty drafts and ignore stale callbacks; clarify plain-text help. Coordinate with version conflicts in R30.

**Required tests/evidence:** Dirty cancel, pending escape/backdrop, close/reopen before completion, failure/retry and saved-preview behavior.

<a id="r36"></a>

### R36 — Notes dialog lacks a keyboard-modal interaction contract

**High · Open · Accessibility · Confirmed gap**  
Development blocker: **No**. Production blocker: **Yes**. Implementation order: **P1**.

**Evidence:** [frontend/components/resources/NotesModal.tsx:57](../frontend/components/resources/NotesModal.tsx#L57); [frontend/components/resources/NotesModal.tsx:92](../frontend/components/resources/NotesModal.tsx#L92); [frontend/components/resources/NotesModal.tsx:22](../frontend/components/resources/NotesModal.tsx#L22).

**Current finding and rationale:** Initial focus and dialog naming exist, but no focus containment/background inertness/trigger restoration or textarea accessible name. aria-modal alone does not implement modal keyboard behavior.

**Recommended remediation:** Implement a native dialog or a small properly managed modal with labeled editor, controlled focus/background behavior and restoration; preserve safe pending/draft handling.

**Required tests/evidence:** Keyboard Tab/Shift-Tab, Escape policy, screen-reader names, inert background, trigger restoration, focus visibility and pending/draft cases.

<a id="r37"></a>

### R37 — Small text and placeholder contrast still fails the intended AA target

**High · Open · Accessibility/visual tokens · Confirmed gap**  
Development blocker: **No**. Production blocker: **Yes**. Implementation order: **P1**.

**Evidence:** [frontend/components/layout/Footer.tsx:36](../frontend/components/layout/Footer.tsx#L36); [frontend/components/ui/Input.tsx:27](../frontend/components/ui/Input.tsx#L27); [frontend/components/resources/NotesModal.tsx:101](../frontend/components/resources/NotesModal.tsx#L101).

**Current finding and rationale:** Fresh production CSS resolves slate-400 and slate-300 to the expected OKLCH colors. Using the installed color converter and WCAG luminance calculation gives about 2.63:1 and 1.48:1 against white, below the [WCAG 2.2 normal-text target](https://www.w3.org/TR/WCAG22/#contrast-minimum) of 4.5:1. This is token-level confirmation, not a complete browser/AA certification.

**Recommended remediation:** Choose sufficient-contrast tokens for normal text/placeholders on their actual backgrounds, preserve hierarchy and verify focus/error/disabled distinctions appropriately.

**Required tests/evidence:** Computed foreground/background contrast across affected states, keyboard focus, zoom/reflow and representative real browsers; do not assume a lint pass proves accessibility.

<a id="r38"></a>

### R38 — Nested interactive controls, landmarks and form associations remain

**Medium · Open · Accessibility/semantics · Confirmed gap**  
Development blocker: **No**. Production blocker: **Yes**. Implementation order: **P1**.

**Evidence:** [frontend/components/layout/Navbar.tsx:74](../frontend/components/layout/Navbar.tsx#L74); [frontend/app/(dashboard)/dashboard/page.tsx:253](../frontend/app/%28dashboard%29/dashboard/page.tsx#L253); [frontend/components/ui/Input.tsx:37](../frontend/components/ui/Input.tsx#L37); [frontend/components/ui/Select.tsx:52](../frontend/components/ui/Select.tsx#L52).

**Current finding and rationale:** Links still wrap native buttons; dashboard main is nested inside the root main, no skip target exists, and hint/error text lacks generated associations/invalid state. Native required/pattern labels are useful but do not close the error-association gap.

**Recommended remediation:** Render one interactive element per action, keep a single main/skip target, and wire unique field IDs, descriptions, invalid state and meaningful validation focus/feedback.

**Required tests/evidence:** DOM semantics, keyboard activation/skip navigation, accessible label/description/error relationships, unique IDs and field-level server errors.

<a id="r39"></a>

### R39 — Accessible announcements, control context and reflow need work

**Medium · Open · Accessibility/responsive UX · Confirmed gap**  
Development blocker: **No**. Production blocker: **Yes**. Implementation order: **P2**.

**Evidence:** [frontend/components/ui/LoadingSpinner.tsx:12](../frontend/components/ui/LoadingSpinner.tsx#L12); [frontend/components/ui/Alert.tsx:26](../frontend/components/ui/Alert.tsx#L26); [frontend/components/resources/SavedResourceCard.tsx:135](../frontend/components/resources/SavedResourceCard.tsx#L135); [frontend/app/globals.css:22](../frontend/app/globals.css#L22).

**Current finding and rationale:** Busy/results/selection/expanded state lack consistent accessible semantics, repeated card actions lack context and reduced-motion handling is absent. Target size, long-string wrapping, mobile focus zoom and full WCAG 2.2 reflow remain needs-verification subclaims; source alone does not prove every device fails.

**Recommended remediation:** Add deliberate status/live/busy/current/pressed/expanded semantics, contextual action names and reduced-motion support. Measure targets/reflow and adjust only confirmed layout defects; preserve zoom.

**Required tests/evidence:** Screen-reader announcements, results updates, long text, 320px/200–400% zoom, target sizes, mobile inputs and reduced-motion preferences.

<a id="r40"></a>

### R40 — API/cache/form TypeScript boundaries remain unchecked

**Medium · Open · Type safety/runtime contracts · Confirmed gap**  
Development blocker: **No**. Production blocker: **No**. Implementation order: **P2**.

**Evidence:** [frontend/lib/api.ts:102](../frontend/lib/api.ts#L102); [frontend/lib/api.ts:68](../frontend/lib/api.ts#L68); [frontend/lib/auth.ts:38](../frontend/lib/auth.ts#L38); [frontend/components/auth/RegisterForm.tsx:36](../frontend/components/auth/RegisterForm.tsx#L36).

**Current finding and rationale:** Strict TypeScript currently passes; no blanket any problem is asserted. Runtime JSON/cache shape casts, record-spread Headers assumptions and uncorrelated string/boolean form updates still exceed what types guarantee. Label-derived IDs can collide. Current wrappers do not exercise every unsafe RequestInit header shape.

**Recommended remediation:** Validate small boundary schemas, normalize headers through Headers and correlate form key/value types. Prefer a lightweight API contract/generated types only when change frequency justifies it. Coordinate storage safety with R16.

**Required tests/evidence:** Malformed response/cache shapes, Headers/tuple/record inputs, key/value compile checks and duplicate-label primitives.

<a id="r41"></a>

### R41 — Dashboard duplication and error-boundary recovery are maintainability gaps

**Medium · Open · Frontend architecture/performance · Practical improvement, not a demonstrated availability exploit**  
Development blocker: **No**. Production blocker: **No**. Implementation order: **P3**.

**Evidence:** [frontend/app/(dashboard)/dashboard/page.tsx:90](../frontend/app/%28dashboard%29/dashboard/page.tsx#L90); [frontend/components/resources/ResourceFilters.tsx:48](../frontend/components/resources/ResourceFilters.tsx#L48); [frontend/context/AuthContext.tsx:140](../frontend/context/AuthContext.tsx#L140).

**Current finding and rationale:** Dashboard combines large theme/search/summary/presentation concerns and duplicates filters; no app error/global-error boundary exists. Repeated private fetching/CSRF bootstrap and context churn merit measurement, not an unproven rerender performance diagnosis. Next framework error handling does exist.

**Recommended remediation:** Extract coherent reusable UI/state after correctness work, add scoped safe render recovery where useful and measure deduplication/cache/memoization. Never introduce cross-user shared caches or move DB/auth into Next merely to simplify the frontend.

**Required tests/evidence:** Existing flows after extraction, retry/navigation from a render failure, account-scoped cache invalidation and measured network/render budgets.

<a id="r42"></a>

### R42 — Metadata, return navigation, mobile details and brand need product decisions

**Low · Partially Fixed · Navigation/content quality · Confirmed gap**  
Development blocker: **No**. Production blocker: **No**. Implementation order: **P3**.

**Evidence:** [frontend/app/(auth)/login/page.tsx:4](../frontend/app/%28auth%29/login/page.tsx#L4); [frontend/app/privacy/page.tsx:3](../frontend/app/privacy/page.tsx#L3); [frontend/context/AuthContext.tsx:124](../frontend/context/AuthContext.tsx#L124); [frontend/app/layout.tsx:10](../frontend/app/layout.tsx#L10).

**Current finding and rationale:** Login/register metadata exists, but dashboard/search/saved/legal titles are generic. Navbar ignores hydration and return paths are lost. Product/package/report names differ; brand choice is not automatically a defect. Mobile input/select affordances and decorative content need targeted review, not a redesign.

**Recommended remediation:** Add route-appropriate metadata, settled-auth navigation and validated internal return paths; confirm branding and refine measured mobile/AT details. Do not accept arbitrary external redirects.

**Required tests/evidence:** Document titles, auth deep links, external-return rejection, hydration navigation, mobile controls and decorative content behavior.

<a id="r43"></a>

### R43 — Consent checkbox is not a server-side policy record

**Low · Needs Verification · Product/policy contract · Requirement-dependent improvement**  
Development blocker: **No**. Production blocker: **No**. Implementation order: **P3**.

**Evidence:** [frontend/components/auth/RegisterForm.tsx:33](../frontend/components/auth/RegisterForm.tsx#L33); [backend/src/main/java/com/veteransconnect/dto/UserRegistrationRequest.java:6](../backend/src/main/java/com/veteransconnect/dto/UserRegistrationRequest.java#L6).

**Current finding and rationale:** Acceptance gates the UI but is not sent/persisted; policy links can lose the draft. Whether versioned acceptance is required is a product/legal decision not established by an audit. It is not by itself an authentication bypass or proven legal violation.

**Recommended remediation:** Decide the actual policy and preserve form navigation. If records are required, design minimal version/time evidence consistently server-side; otherwise avoid unnecessary collection and misleading claims.

**Required tests/evidence:** UI/direct-API agreement with the chosen policy, policy-version handling and draft preservation on legal-link navigation.

<a id="r44"></a>

### R44 — Low-impact dead code, build duplication and tooling debt remain

**Low · Open · Maintainability/tooling · Cleanup/improvement**  
Development blocker: **No**. Production blocker: **No**. Implementation order: **P3**.

**Evidence:** [backend/src/main/java/com/veteransconnect/model/enums/PreferredContactMethod.java:3](../backend/src/main/java/com/veteransconnect/model/enums/PreferredContactMethod.java#L3); [backend/src/main/java/com/veteransconnect/repository/SavedResourceRepository.java:15](../backend/src/main/java/com/veteransconnect/repository/SavedResourceRepository.java#L15); [frontend/package.json:9](../frontend/package.json#L9); [.github/workflows/ci.yml:38](../.github/workflows/ci.yml#L38); [backend/src/main/java/com/veteransconnect/security/JwtAuthenticationFilter.java:65](../backend/src/main/java/com/veteransconnect/security/JwtAuthenticationFilter.java#L65).

**Current finding and rationale:** Unused helpers/query paths/default-radius, redundant AssertJ/cache/check steps and mutating lint naming remain. Bun workspace/trust metadata and missing engine/packageManager pins need verification; floating execution is covered by R08. Repeated JWT parsing remains a profiling/cleanup candidate, not proof of a slow authentication path. No unnecessary frontend framework/library stack or rewrite is justified.

**Recommended remediation:** Confirm consumers, remove genuine dead paths and redundant setup, clarify check/fix commands and adopt affordable Java formatting/static checks if useful. Preserve service boundaries; do not mechanically multiply layers.

**Required tests/evidence:** Symbol/consumer checks, unchanged behavior and reproducible documented commands/frozen install after a separately approved tooling change.

<a id="r45"></a>

### R45 — Ownership is a positive control, not a confirmed IDOR

**Low · Fixed · Authorization · Verified source control, not a new defect**  
Development blocker: **No**. Production blocker: **No**. Implementation order: **Retain**.

**Evidence:** [backend/src/main/java/com/veteransconnect/controller/UserController.java:29](../backend/src/main/java/com/veteransconnect/controller/UserController.java#L29); [backend/src/main/java/com/veteransconnect/service/SavedResourceServiceImpl.java:109](../backend/src/main/java/com/veteransconnect/service/SavedResourceServiceImpl.java#L109).

**Current finding and rationale:** Current self/owner checks remain and missing/not-owned saved resources return the same error. Prior B34 was a defense-in-depth observation, not an exploit. Broad unused service queries are cleanup R44; regression coverage remains R13.

**Recommended remediation:** Preserve checks and add owner-scoped lookup/method boundaries only when they simplify or protect real callers. Do not describe the existing authorization as absent.

**Required tests/evidence:** Committed two-user negative persistence/HTTP tests, invalid IDs, no information disclosure and all future callers.

<a id="r46"></a>

### R46 — Management exposure and stale-token health behavior remain conditional

**Medium · Needs Verification · Actuator/health authorization · Conditional defense-in-depth/operating check**  
Development blocker: **No**. Production blocker: **No**. Implementation order: **P2**.

**Evidence:** [backend/src/main/java/com/veteransconnect/config/SecurityConfig.java:80](../backend/src/main/java/com/veteransconnect/config/SecurityConfig.java#L80); [backend/src/main/java/com/veteransconnect/security/JwtAuthenticationFilter.java:32](../backend/src/main/java/com/veteransconnect/security/JwtAuthenticationFilter.java#L32).

**Current finding and rationale:** Only health is currently allowed publicly; other paths require authentication and no env/heapdump exposure configuration was found. An invalid supplied JWT can still reject health because it is not a filter bypass path. Typical cookie-free private probes are unaffected. Future management expansion needs explicit restriction.

**Recommended remediation:** Verify actual management exposure and keep it private/deny-by-default under R10. Decide stale-token probe semantics before changing filters; do not allege a current diagnostic data leak or universally broken health checks.

**Required tests/evidence:** Cookie-free and stale-token health, actual exposed endpoint inventory, ordinary-user management denial and ingress/private probe behavior.

<a id="r47"></a>

### R47 — Historical coverage and formatting failures are obsolete

**Medium · Fixed · Local quality gates · Fixed/obsolete old subfindings**  
Development blocker: **No**. Production blocker: **No**. Implementation order: **Retain**.

**Evidence:** [backend/pom.xml:160](../backend/pom.xml#L160); [frontend/components/layout/Navbar.test.tsx:13](../frontend/components/layout/Navbar.test.tsx#L13).

**Current finding and rationale:** Fresh clean verify passes 214 tests, 671/851 lines (78.85%); frontend lint/format/types/28 tests/build all pass. The old 105-test/61.64% and failing-assertion formatting statements must not be carried forward as current defects. This does not fix CI omissions or runtime/persistence test gaps.

**Recommended remediation:** Use this dated evidence as the current baseline; retain the 70% threshold and rerun relevant checks per change. No formatting repair is needed in this review.

**Required tests/evidence:** Keep read-only checks and backend verify; prove CI invokes them through R07.

<a id="r48"></a>

### R48 — Reports/examples and deployment proposals need durable reconciliation

**Low · Partially Fixed · Documentation/repository delivery · Documentation/inventory gap**  
Development blocker: **No**. Production blocker: **No**. Implementation order: **P3**.

**Evidence:** [.gitignore:33](../.gitignore#L33); [frontend/.gitignore:34](../frontend/.gitignore#L34); [docs/PRODUCTION_READINESS.md:3](../docs/PRODUCTION_READINESS.md#L3).

**Current finding and rationale:** New H2-A/B and H2-C guides exist, but older reports retain old paths/state/static assumptions. /docs and the frontend local env example/README are ignored and untracked, so a clean checkout lacks them. H2-C is architecture planning only; no AWS deployment is thereby complete.

**Recommended remediation:** Designate this dated consolidation as the current register, preserve historical reports without duplicate work and decide which safe docs/examples to version. Update architecture/cost decisions after approval without altering app protections.

**Required tests/evidence:** Clean-checkout onboarding, link/ID reconciliation and no secret files in tracked docs/examples. Preserve current ignore rules until approved.

## Reconciliation and obsolete claims

- **C1:** the legacy JWT value appears only to reject it. Do not remove its regression test or classify the denylist constant as an accepted default. Cloud secret rotation/non-use still needs operational evidence.
- **H1:** the old browser localhost API default/cross-host cookie design is superseded. CSRF bootstrap now fails on bad status/missing cookie. The remaining global-403/logout problem is R15, not a still-missing shared-origin implementation.
- **H2-A:** mandatory deployment profiles/settings and startup validation exist. Local Compose defaults are intentionally local; they are not evidence that hardened AWS profiles accept those defaults. A future deployment must activate `aws-dev`, never `local`.
- **H2-B:** reverse-proxy source validation and normal nonce security are present. The new R04 matcher gap and R05 framework advisory are separate: fixing the matcher alone does not resolve an affected dependency baseline.
- **Coverage/formatting:** the previous failing backend 70% gate, 105-test/61.64% baseline and frontend formatting failure are obsolete. Current checks pass, but CI does not run every gate and uncovered persistence paths remain.
- **Ownership:** owner/self checks exist. B34 was a positive control plus defense-in-depth recommendation, not a proven IDOR. Arbitrary provider-labelled snapshots affect the caller’s own saved list; this review does not allege shared-directory poisoning.
- **Architecture:** H2-C documents now correctly require a server. Older static-export and static-hosting cost proposals are incompatible with the current nonce design. Build success does not make a static export possible.
- **Security assertions:** React escapes notes; no current SQL injection, notes XSS, SSRF, leaked password or deployed compromise was demonstrated. Unsafe URL validation, sensitive logging and generated string risks remain actionable without overstating exploit evidence.
- **Historical persistence probes:** the timestamp observation in B23/B25 requires a committed current reproduction (R29). Do not label an old H2 probe as a fresh PostgreSQL confirmation.

## Complete original-ID crosswalk

Mappings split mixed old findings where fixes and remaining work differ. Current status/severity belongs to the canonical row, not to an entire historical paragraph. All F01–F38, B01–B35 and Project C1/H1–H8/M1–M14/L1–L3/D1–D4 are accounted for. H2 subphases are also listed explicitly.

### Project audit

| Original ID | Canonical findings |
| --- | --- |
| C1 | [R01](#r01), [R10](#r10) |
| H1 | [R02](#r02), [R10](#r10) |
| H2 | [R03](#r03), [R04](#r04), [R09](#r09), [R10](#r10), [R11](#r11) |
| H3 | [R14](#r14), [R04](#r04) |
| H4 | [R16](#r16), [R18](#r18), [R19](#r19) |
| H5 | [R07](#r07), [R47](#r47), [R13](#r13) |
| H6 | [R06](#r06) |
| H7 | [R25](#r25) |
| H8 | [R09](#r09), [R10](#r10), [R11](#r11), [R12](#r12) |
| M1 | [R15](#r15), [R17](#r17) |
| M2 | [R15](#r15), [R02](#r02) |
| M3 | [R20](#r20), [R21](#r21) |
| M4 | [R22](#r22) |
| M5 | [R24](#r24) |
| M6 | [R27](#r27) |
| M7 | [R28](#r28) |
| M8 | [R16](#r16), [R32](#r32) |
| M9 | [R34](#r34), [R35](#r35) |
| M10 | [R36](#r36), [R37](#r37), [R38](#r38), [R39](#r39) |
| M11 | [R13](#r13) |
| M12 | [R08](#r08) |
| M13 | [R02](#r02), [R09](#r09) |
| M14 | [R18](#r18), [R29](#r29), [R31](#r31) |
| L1 | [R44](#r44) |
| L2 | [R40](#r40) |
| L3 | [R44](#r44), [R06](#r06) |
| D1 | [R05](#r05) |
| D2 | [R05](#r05) |
| D3 | [R08](#r08) |
| D4 | [R44](#r44) |
| H2-A | [R03](#r03), [R10](#r10), [R11](#r11) |
| H2-B | [R04](#r04), [R05](#r05), [R10](#r10) |
| H2-C | [R09](#r09), [R10](#r10), [R11](#r11), [R12](#r12), [R48](#r48) |

### Frontend audit

| Original ID | Canonical findings |
| --- | --- |
| F01 | [R05](#r05), [R06](#r06) |
| F02 | [R02](#r02), [R10](#r10) |
| F03 | [R15](#r15), [R17](#r17) |
| F04 | [R16](#r16) |
| F05 | [R16](#r16) |
| F06 | [R16](#r16) |
| F07 | [R16](#r16), [R17](#r17) |
| F08 | [R32](#r32) |
| F09 | [R33](#r33) |
| F10 | [R33](#r33) |
| F11 | [R34](#r34) |
| F12 | [R34](#r34) |
| F13 | [R34](#r34) |
| F14 | [R35](#r35) |
| F15 | [R37](#r37) |
| F16 | [R38](#r38) |
| F17 | [R36](#r36) |
| F18 | [R39](#r39) |
| F19 | [R38](#r38) |
| F20 | [R38](#r38), [R21](#r21) |
| F21 | [R43](#r43) |
| F22 | [R35](#r35) |
| F23 | [R19](#r19), [R39](#r39) |
| F24 | [R04](#r04), [R20](#r20) |
| F25 | [R39](#r39) |
| F26 | [R40](#r40), [R16](#r16) |
| F27 | [R41](#r41) |
| F28 | [R28](#r28), [R27](#r27), [R41](#r41) |
| F29 | [R22](#r22), [R23](#r23), [R24](#r24), [R25](#r25) |
| F30 | [R42](#r42), [R39](#r39), [R17](#r17) |
| F31 | [R42](#r42) |
| F32 | [R41](#r41), [R40](#r40) |
| F33 | [R02](#r02), [R09](#r09) |
| F34 | [R13](#r13), [R07](#r07) |
| F35 | [R47](#r47), [R44](#r44) |
| F36 | [R39](#r39), [R42](#r42) |
| F37 | [R08](#r08), [R44](#r44), [R48](#r48) |
| F38 | [R08](#r08) |

### Backend audit

| Original ID | Canonical findings |
| --- | --- |
| B01 | [R01](#r01), [R10](#r10) |
| B02 | [R05](#r05), [R06](#r06) |
| B03 | [R03](#r03), [R10](#r10), [R25](#r25) |
| B04 | [R14](#r14), [R04](#r04) |
| B05 | [R17](#r17), [R03](#r03), [R10](#r10) |
| B06 | [R17](#r17), [R21](#r21) |
| B07 | [R20](#r20) |
| B08 | [R20](#r20) |
| B09 | [R21](#r21) |
| B10 | [R21](#r21), [R40](#r40) |
| B11 | [R02](#r02), [R10](#r10) |
| B12 | [R18](#r18) |
| B13 | [R22](#r22) |
| B14 | [R22](#r22) |
| B15 | [R23](#r23) |
| B16 | [R24](#r24) |
| B17 | [R26](#r26) |
| B18 | [R25](#r25), [R14](#r14) |
| B19 | [R27](#r27) |
| B20 | [R27](#r27) |
| B21 | [R28](#r28) |
| B22 | [R31](#r31) |
| B23 | [R29](#r29) |
| B24 | [R30](#r30) |
| B25 | [R29](#r29) |
| B26 | [R19](#r19) |
| B27 | [R11](#r11) |
| B28 | [R12](#r12) |
| B29 | [R46](#r46), [R10](#r10) |
| B30 | [R13](#r13) |
| B31 | [R07](#r07), [R47](#r47), [R08](#r08) |
| B32 | [R08](#r08), [R10](#r10) |
| B33 | [R27](#r27), [R44](#r44) |
| B34 | [R45](#r45), [R13](#r13) |
| B35 | [R44](#r44), [R18](#r18) |

### Production-readiness assessment and H2-C proposals

That report uses section/table entries rather than stable finding IDs. Reconcile its topics as follows; do not treat it as a second list of work.

| Existing topic | Canonical reconciliation |
| --- | --- |
| JWT fallback / missing environment guards | R01 Fixed, R03 Fixed; secret rotation and delivery R10 remain unproven. |
| Cookie/CSRF/browser API routing | R02 Fixed; auth transitions R15 and actual ingress R10 remain. |
| HTTPS, proxy, headers | R04 Partially Fixed; framework baseline R05 and ingress evidence R10 separate. |
| Static export / S3 or static-host frontend | Superseded by request-time rendering; R09. Preserve nonce CSP. |
| Dependencies / dependency-audit workflow | R05/R06 Open; no new clean full SCA claimed. |
| Quality gate failure / pipeline readiness | Old local failure R47 Fixed; CI omissions R07 and persistence/runtime tests R13/R08 remain. |
| Abuse, provider readiness and costs | R14/R25; live integration must respect application-wide quotas. |
| Privacy/session/user data | R15–R19; retention and data requests need a concrete owner/flow. |
| Schema validation, backup, restore and rollback | Existing Flyway/validate retained; R11 execution evidence and R29 timestamp verification needed. |
| Accessibility and user-flow blockers | R32/R34–R39; final browser/AT evidence still required. |
| Containers / IaC / DNS / IAM / secrets / promotion | R08/R10; existing plans are not implemented controls. |
| Monitoring / alerting / readiness | R12; no actual export/alerts claimed. |
| H2-C architecture, cost, checklist and staged delivery | Planning deliverables exist. R09–R12/R48 track approval, implementation and proof; no AWS resources inspected or created. |
| Old budget estimates | Needs current selected-region Calculator quote and explicit approval; static frontend assumptions are obsolete. |

## Deployment and budget decisions requiring approval

1. **Scope/access:** approve restricted synthetic Development, named testers and a separate account; decide how public ingress access is restricted without weakening browser/API controls. No real veteran data until privacy/security gates are satisfied.
2. **Server topology:** approve a running Next server plus separate Spring backend. Existing H2-C proposes single EC2 with containerized PostgreSQL as the initial cost option, with managed PostgreSQL as the next step. A local database transfers patching, disk, backup and recovery ownership to the team; architecture approval is conditional on an actual restore/capacity demonstration. No static hosting substitution is approved by this report.
3. **Budget:** existing [H2-C cost comparison](architecture/aws-cost-comparison.md) models about **$36–48/month** for always-on EC2/local PostgreSQL, **$50–70** for EC2/managed PostgreSQL, and **$95–120** for public-task Fargate/managed PostgreSQL (private-task/NAT model higher). These are inherited proposals with assumptions, **not refreshed or verified prices**. Domain/organizational controls, taxes/labor and extra recovery services may be additional. The $30–40 target is not a guarantee; approve a current quote, a higher ceiling or a Development runtime schedule. Do not cut security, backups or nonce rendering to force the estimate.
4. **Trust/TLS/identity:** approve certificate ownership/renewal, exact proxy peer identity, HTTPS-only origin reachability, private database/TLS policy, GitHub OIDC/deployment role and least-privilege secret delivery. Application guards alone cannot prove AWS networking.
5. **Recovery:** approve runtime versus migration privileges, encrypted off-host backups, an owner and measurable RPO/RTO, migration/restore/rollback drills. Never assume an application-image rollback safely reverses an incompatible database migration.
6. **Public-launch product policies:** agree session recovery/containment, email ownership, verified privacy requests/retention, accurate source/capability/freshness wording and provider contacts. Consent-record requirements and branding need explicit decisions before adding collection or changing copy.

The [remediation roadmap](REMEDIATION_ROADMAP.md) splits these into independent changes and evidence gates. Neither architecture approval nor a passing local build constitutes approval to provision/deploy.

## Current primary-source checks

- **Next advisory/support context:** the official [October 14, 2026 security update](https://nextjs.org/blog/nextjs-security-update-october-14-2026) places this old baseline behind later fixes. Applicability depends on features such as Cache Components/Server Actions/image optimization and image runtime conditions; those exploit paths were not reproduced and the current app does not establish their use merely by depending on Next. Its named fixed releases are not asserted to be the latest available today.
- **Spring:** [CVE-2026-22732](https://spring.io/security/cve-2026-22732/) includes packaged Security 6.4.13 in its affected range for conditional header omission. [Boot 3.4.13 announcement](https://spring.io/blog/2025/12/18/spring-boot-3-4-13-available-now/) marks the end of OSS support for that line. Choose a currently supported compatible BOM after a separate advisory review; do not cherry-pick a past audit’s version number as a complete patch policy.
- **Geocoding:** the [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/) imposes an application-wide request limit, identification/contact and attribution requirements. An unbounded cache is neither aggregate throttling nor permission to load-test the public endpoint.
- **Contrast:** [WCAG 2.2 contrast minimum](https://www.w3.org/TR/WCAG22/#contrast-minimum) specifies 4.5:1 for normal text, with defined exceptions. This review confirms specific token failures, not whole-application conformity.

These checks supplement repository evidence. They are not an exhaustive vulnerability scan, legal opinion, live AWS price quote or cloud assessment.

## Report handling

This report and the roadmap are documentation-only additions. Existing `/docs` ignore rules mean they are **ignored/untracked** unless a later approved change explicitly versions safe documentation. The same clean-checkout gap affects existing audit/architecture reports and the frontend local environment example/README. No ignore rule, existing report or application file was changed during reconciliation; preserve historical reports and approve a deliberate documentation-versioning change separately (R48).
