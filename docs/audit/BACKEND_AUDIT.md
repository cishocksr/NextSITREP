# NextSITREP backend and application security audit

Audit date: November 2, 2026 (America/New_York). Repository root: `/Users/agoge/Developer/repos/github/veterans-connect`. Baseline: `5a99f2f` plus existing working-tree changes. This assessment was derived independently from backend source, configuration, tests, fresh build output, isolated verification, and primary-source advisories; the frontend audit was not used as evidence.

## Scope and assessment

The implemented backend is a Java 21-targeted Spring Boot 3.4.13 servlet REST application with Spring Security, JJWT, Spring Data JPA/Hibernate, PostgreSQL, Flyway, Actuator, and two synchronous external clients. It is not implemented with Next.js API routes or Server Actions. No Next.js route handlers or Server Actions were found. AWS deployment is a stated project objective, not a confirmed deployed capability.

The backend has useful production foundations: layered controllers/services/repositories; response DTOs that omit password hashes; BCrypt; signed, expiring JWTs in HttpOnly cookies; CSRF and exact-origin credentialed CORS; self-only profile access; saved-resource ownership checks; database uniqueness/foreign keys; migrations and Hibernate schema validation; external connection/read timeouts; and real tests.

It is **not ready for production data** without remediation. The highest-priority risks are a known fallback signing key, unsupported/vulnerable framework dependencies, weak abuse protection, production configuration that does not fail closed, and resource provenance/freshness guarantees that the implementation does not establish. Isolated persistence verification also found a concrete response-timestamp defect absent from the existing mocked service/controller tests.

Only this audit document was added. No application, configuration, migration, test, or dependency file was modified. Existing frontend edits and the other audit documents were preserved. Generated `backend/target` output was rebuilt. Temporary verification programs ran outside the repository against synthetic data in process-local H2; no existing PostgreSQL database, real account, live VA/Nominatim service, or AWS resource was contacted or changed.

### Finding classifications

- **Critical:** Severe compromise possible under the explicitly stated configuration; production blocker.
- **High:** Significant security, privacy, resource-integrity, or release-control deficiency; resolve before public production use.
- **Medium:** Meaningful correctness, reliability, scalability, or maintainability issue.
- **Low:** Cleanup or defense-in-depth refinement with limited immediate impact.
- **Confirmed** means source or isolated execution establishes the behavior. **Conditional** identifies a specific trigger/deployment prerequisite, not a demonstrated live incident. **Readiness gap** means the repository does not establish an operating capability; it does not prove that external infrastructure lacks it.

## Backend architecture overview

```text
HTTP client
  → servlet/Spring Security chain
       CSRF cookie/header validation + exact-origin CORS
       JWT cookie or bearer verification → user lookup → ROLE_VETERAN
  → /api/v1 controllers
       AuthController → authentication manager / UserService / JWT cookies
       UserController → self-only profile lookup
       ResourceController → search or personal saved resources
  → transactional services
       UserServiceImpl → BCrypt + UserRepository
       SavedResourceServiceImpl → ownership checks + SavedResourceRepository
       ResourceSearchServiceImpl
          → Nominatim geocoding client
          → VA Facilities client (up to three sequential requests)
          → repositories to mark saved results
  → JPA/Hibernate + HikariCP → PostgreSQL
       Flyway V1/V2; ddl-auto=validate

Operational surface: Actuator health; local Docker Compose health check.
Local process state: auth rate-limit map and ZIP-coordinate cache.
```

### Modules inspected

All 38 main Java source files were inspected, including interfaces, DTO records, small exceptions, and enums. Configuration, both migrations, Docker/Compose, Maven/wrapper, relevant environment templates/workflows, and all 12 backend test classes plus their test security configuration were reviewed.

| Module / files | Responsibility and assessment |
| --- | --- |
| [backend/src/main/java/com/veteransconnect/VeteransConnectApplication.java:1–13](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/VeteransConnectApplication.java:1) | Standard Boot entry point; no additional services or scheduled work implied. |
| [backend/src/main/java/com/veteransconnect/controller/AuthController.java:37–168](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/controller/AuthController.java:37) | Register/login/logout/me/CSRF; cookie issuance; partial session lifecycle. |
| [backend/src/main/java/com/veteransconnect/controller/UserController.java:18–66](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/controller/UserController.java:18) | Caller-only lookup; conditional response shape and filter semantics need cleanup. |
| [backend/src/main/java/com/veteransconnect/controller/ResourceController.java:23–92](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/controller/ResourceController.java:23) | Resource search, save/list/notes/delete; no pagination. |
| [backend/src/main/java/com/veteransconnect/config/SecurityConfig.java:36–147](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/config/SecurityConfig.java:36) | Production filter chain, password encoder, authentication provider, CORS and headers. |
| [backend/src/main/java/com/veteransconnect/security/JwtService.java:20–81](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/security/JwtService.java:20) | HMAC key parsing, signing, claims/expiry checks; no issuer/audience or revocation contract. |
| [backend/src/main/java/com/veteransconnect/security/JwtAuthenticationFilter.java:28–114](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/security/JwtAuthenticationFilter.java:28) | Public-auth bypass, cookie/bearer extraction and DB-backed user loading. |
| [backend/src/main/java/com/veteransconnect/security/CustomUserDetailsService.java:14–33](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/security/CustomUserDetailsService.java:14) | Email lookup; fixed VETERAN role, no account-status flags. |
| [backend/src/main/java/com/veteransconnect/security/AuthRateLimiter.java:21–82](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/security/AuthRateLimiter.java:21) | Endpoint/IP/email sliding-window buckets; unbounded process-local key map. |
| [backend/src/main/java/com/veteransconnect/service/UserService.java:14–59](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/service/UserService.java:14); [backend/src/main/java/com/veteransconnect/service/UserServiceImpl.java:22–91](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/service/UserServiceImpl.java:22) | Registration and profile queries; normalization/concurrency/lifecycle gaps. |
| [backend/src/main/java/com/veteransconnect/service/SavedResourceService.java:12–26](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/service/SavedResourceService.java:12); [backend/src/main/java/com/veteransconnect/service/SavedResourceServiceImpl.java:24–116](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/service/SavedResourceServiceImpl.java:24) | Personal resource snapshots and notes; ownership implemented, provider provenance not verified. |
| [backend/src/main/java/com/veteransconnect/service/ResourceSearchService.java:16–35](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/service/ResourceSearchService.java:16); [backend/src/main/java/com/veteransconnect/service/ResourceSearchServiceImpl.java:23–158](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/service/ResourceSearchServiceImpl.java:23) | ZIP/radius normalization, provider orchestration, local keyword filtering, saved flags. |
| [backend/src/main/java/com/veteransconnect/client/GeocodingService.java:21–159](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/client/GeocodingService.java:21) | Nominatim HTTP adapter and success cache; no aggregate quota control; non-finite coordinates accepted. |
| [backend/src/main/java/com/veteransconnect/client/VaFacilitiesClient.java:26–269](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/client/VaFacilitiesClient.java:26) | API-key adapter, response records and distances; only first provider page; no freshness/verification metadata. |
| [backend/src/main/java/com/veteransconnect/model/User.java:16–66](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/model/User.java:16); [backend/src/main/java/com/veteransconnect/model/SavedResource.java:15–84](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/model/SavedResource.java:15) | UUID entities; lazy owner relationship, generated timestamps; missing optimistic concurrency. |
| [backend/src/main/java/com/veteransconnect/repository/UserRepository.java:11–19](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/repository/UserRepository.java:11); [backend/src/main/java/com/veteransconnect/repository/SavedResourceRepository.java:11–22](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/repository/SavedResourceRepository.java:11) | Derived JPA queries; no custom SQL/native sorting; lists are unbounded. |
| [backend/src/main/java/com/veteransconnect/dto/LoginRequest.java:6–15](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/dto/LoginRequest.java:6); [backend/src/main/java/com/veteransconnect/dto/UserRegistrationRequest.java:6–29](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/dto/UserRegistrationRequest.java:6) | Required/email/ZIP/minimum password constraints; missing aligned upper bounds. |
| [backend/src/main/java/com/veteransconnect/dto/SaveResourceRequest.java:11–37](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/dto/SaveResourceRequest.java:11); [backend/src/main/java/com/veteransconnect/dto/UpdateNotesRequest.java:8–13](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/dto/UpdateNotesRequest.java:8) | Notes bounded to 5,000; most facility fields trusted as strings. |
| [backend/src/main/java/com/veteransconnect/dto/AuthResponse.java:10–29](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/dto/AuthResponse.java:10); [backend/src/main/java/com/veteransconnect/dto/UserResponse.java:9–31](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/dto/UserResponse.java:9); [backend/src/main/java/com/veteransconnect/dto/ResourceSearchResult.java:8–24](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/dto/ResourceSearchResult.java:8); [backend/src/main/java/com/veteransconnect/dto/SavedResourceResponse.java:12–50](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/dto/SavedResourceResponse.java:12) | Explicit DTO mapping avoids entity/hash serialization; session expiry and resource timestamps/provenance need work. |
| [backend/src/main/java/com/veteransconnect/exception/GlobalExceptionHandler.java:16–187](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/exception/GlobalExceptionHandler.java:16) | Domain 400/401/403/404/409/429/503 handlers; inconsistent with filter/framework error paths. |
| [backend/src/main/java/com/veteransconnect/exception/DuplicateEmailException.java:1–15](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/exception/DuplicateEmailException.java:1); [backend/src/main/java/com/veteransconnect/exception/UserNotFoundException.java:1–15](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/exception/UserNotFoundException.java:1); [backend/src/main/java/com/veteransconnect/exception/RateLimitExceededException.java:1–11](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/exception/RateLimitExceededException.java:1); [backend/src/main/java/com/veteransconnect/exception/ResourceAlreadySavedException.java:1–11](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/exception/ResourceAlreadySavedException.java:1); [backend/src/main/java/com/veteransconnect/exception/SavedResourceNotFoundException.java:1–11](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/exception/SavedResourceNotFoundException.java:1) | Small domain exceptions; no hidden notification/recovery implementation. |
| [backend/src/main/java/com/veteransconnect/model/enums/BranchOfService.java:1–28](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/model/enums/BranchOfService.java:1); [backend/src/main/java/com/veteransconnect/model/enums/ResourceCategory.java:1–26](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/model/enums/ResourceCategory.java:1); [backend/src/main/java/com/veteransconnect/model/enums/PreferredContactMethod.java:1–27](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/model/enums/PreferredContactMethod.java:1) | Branch/category metadata; category mappings overstate service specificity; contact enum unused. |

### Resolved technology inventory

Versions below came from Maven configuration and libraries in the freshly packaged JAR, not an assumed latest-version list.

| Technology | Confirmed version / state |
| --- | --- |
| Java | Target/CI/Docker 21; local audit runtime Temurin 25.0.2 |
| Spring Boot | 3.4.13 parent/BOM |
| Spring MVC/Web | 6.2.15 |
| Spring Security | 6.4.13 (config/web/core/crypto) |
| Spring Data JPA / Hibernate | 3.4.13 / 6.6.39.Final |
| Embedded Tomcat | 10.1.50 |
| PostgreSQL JDBC / local database image | 42.7.8 / postgres:15-alpine; live database version unverified |
| HikariCP / Flyway | 5.1.0 / 10.20.1, including PostgreSQL module |
| Jackson databind / JJWT | 2.18.5 / 0.12.6 |
| Micrometer core | 1.14.14; Actuator present, no configured export/alert service |
| Maven / wrapper | 3.9.9 / wrapper 3.3.4; distribution checksum not pinned in wrapper properties |
| Tests | JUnit Jupiter, Mockito, AssertJ, Spring Security Test, H2 2.3.232; Boot-managed |
| JaCoCo | 0.8.14; configured minimum bundle line coverage 70% |

Evidence: [backend/pom.xml:5–160](/Users/agoge/Developer/repos/github/veterans-connect/backend/pom.xml:5), [backend/.mvn/wrapper/maven-wrapper.properties:1–3](/Users/agoge/Developer/repos/github/veterans-connect/backend/.mvn/wrapper/maven-wrapper.properties:1), [backend/Dockerfile:1–22](/Users/agoge/Developer/repos/github/veterans-connect/backend/Dockerfile:1). Lombok is compile-time code generation and excluded from runtime packaging. No AWS SDK, hosted auth, Redis, queue, mail delivery, or search-engine dependency was found.

## Existing capabilities and API surface

### Capability status

| Capability | Status | Confirmed implementation / limits |
| --- | --- | --- |
| Versioned REST API | Implemented | `/api/v1`; three controllers; JSON DTOs. |
| Registration and password login | Implemented with gaps | BCrypt + validation, JWT cookie; email unverified, no recovery or account disabling. |
| Authentication | Implemented | Signed expiring JWT, cookie and bearer extraction, user DB lookup per protected request. |
| Authorization | Implemented for current private data | Self-only profile endpoints; personal lists; explicit notes/delete ownership checks. No admin role model or community visibility model. |
| CSRF / CORS | Implemented, deployment-dependent | Cookie/header CSRF even on public writes; exact allowed origins and credentials. Separate-host token transport is incomplete. |
| Session lifecycle | Partial | Cookie issuance/expiry/clearing; no revocation/rotation/refresh/logout-all or remaining-expiry response. |
| Abuse prevention | Partial | Only auth endpoint/IP/email buckets; no aggregate search/write quotas or bounded key cleanup. |
| PostgreSQL persistence | Implemented in code/config | Two tables, JPA repositories, unique/FK constraints; no live deployment confirmed. |
| Schema migrations | Implemented | Flyway V1 creates tables; V2 fixes branch values/check; Hibernate validates. |
| Nearby resource search | Implemented, limited | Nominatim ZIP geocoding, VA sandbox default, 3 facility types, local name/classification keyword filter, radius 1–100 miles. |
| Saved resources/notes | Implemented with integrity gaps | Per-user copies of client-supplied facility data; 5,000-char notes; no resource detail refresh/version. |
| Resource verification/freshness/reporting | Missing | No verified status, source timestamp, reconciliation, retirement flag, correction report or triage workflow. |
| Health and metrics foundation | Partial | Actuator + Micrometer dependencies and Compose health check; no application SLOs/export/alerts/correlation contract. |
| Backups, restore, privacy operations | Missing in repository | No backup/PITR/restore drill, account export/deletion workflow, or retention implementation. |
| Veteran-to-veteran connection | Missing | No messages, groups, posts, user discovery, community authorization/moderation or schema. |
| Email/MFA/federation/admin | Missing | No delivery provider, MFA/OIDC/OAuth server, email verification, administrative tools, or authorization requirements implemented. These are not all mandatory for initial release. |
| AWS dev/prod deployment | Planned by project objective; implementation unconfirmed | Local containers exist; no tracked AWS IaC, deploy/promotion workflow, IAM policy, RDS/secrets configuration, or operating runbook. |
| Next.js API routes / Server Actions | Not present | Server-side business logic is Spring, not Next.js. |

“Missing” means not found in the inspected repository, not a claim about an external system or a requirement to build every feature. Except AWS's stated objective, unfinished enums/interfaces are not evidence of an approved implementation plan.

### Endpoint map and contracts

| Method / path | Access | Success / relevant behavior |
| --- | --- | --- |
| POST `/api/v1/auth/register` | Public, CSRF-protected, rate limited after DTO validation | 201 + session cookie and profile; 409 existing exact email |
| POST `/api/v1/auth/login` | Public, CSRF-protected, rate limited after DTO validation | 200 + cookie/profile; 401 bad credentials; 429 rate limit |
| POST `/api/v1/auth/logout` | Public, CSRF-protected | 204; clears cookie only, does not revoke token |
| GET `/api/v1/auth/csrf` | Public | 204; materializes token cookie, no JSON token body |
| GET `/api/v1/auth/me` | Authenticated | 200; current profile with configured full lifetime, not token's remaining lifetime |
| GET `/api/v1/users/{id}` | Authenticated, caller UUID only | 200 self; 403 any other UUID |
| GET `/api/v1/users` | Authenticated, self only | Email returns object; branch/ZIP return list; no filters returns `[]`; multiple filters use precedence rather than intersection |
| GET `/api/v1/resources/search` | Authenticated | 200 list; required ZIP, optional category/keyword/radius; provider failures mapped to 503 |
| GET `/api/v1/resources/saved` | Authenticated | 200 full caller list, newest saved first |
| POST `/api/v1/resources/saved` | Authenticated + CSRF | 201 snapshot; 409 duplicate precheck; no Location header |
| PATCH `/api/v1/resources/saved/{id}/notes` | Authenticated + CSRF + owner | 200 DTO; 404 missing or not owned; null/blank notes clear field |
| DELETE `/api/v1/resources/saved/{id}` | Authenticated + CSRF + owner | 204; 404 missing or not owned |
| GET `/actuator/health` | Public authorization rule | Boot health response; custom JWT filter can reject an invalid supplied token before endpoint |

Source: controllers and SecurityConfig in module inventory. Invalid/missing CSRF on unsafe requests produces 403; absence/invalid authentication produces 401 when reached. Exact filter order and framework error responses need full-chain tests. Public endpoints are not exempt from CSRF simply because they are permitAll. There is no intentional API route for public veteran lookup, arbitrary user data access, token JSON issuance, bulk resource ingestion, or resource correction reporting.

## Data model and integrity overview

| Table | Relationships, indexes, and constraints |
| --- | --- |
| `users` | UUID PK; unique case-sensitive email; required names, branch, hash and timestamps; nullable ZIP in migration despite entity validation. V2 restricts branch to six enum values. |
| `saved_resources` | UUID PK; non-null user FK; unique `(user_id, external_id, source_api)`; separate user index; facility snapshot, category, notes and timestamps. No category/notes-format check, optimistic version, provider verification/freshness fields, or deletion/retirement state. |

Evidence: [backend/src/main/resources/db/migration/V1__create_initial_schema.sql:1–37](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/resources/db/migration/V1__create_initial_schema.sql:1); [backend/src/main/resources/db/migration/V2__fix_branch_of_service_constraint.sql:1–16](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/resources/db/migration/V2__fix_branch_of_service_constraint.sql:1); entity/repository files above. The foreign key has no cascading account-delete behavior; deletion must be deliberately ordered if introduced. The standalone user index may overlap the unique index's leading column, but do not remove it without query-plan and workload evidence. No branch/ZIP index is needed merely for unused query methods.

## Findings

### B01 — Known fallback signing key allows account impersonation if used

**Severity: Critical. Status: Confirmed configuration vulnerability; deployment exposure conditional.**

**References:** [backend/src/main/resources/application.properties:22–32](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/resources/application.properties:22); [backend/src/main/java/com/veteransconnect/security/JwtService.java:33–40](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/security/JwtService.java:33), [backend/src/main/java/com/veteransconnect/security/JwtService.java:61–79](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/security/JwtService.java:61); [backend/src/main/java/com/veteransconnect/security/JwtAuthenticationFilter.java:64–79](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/security/JwtAuthenticationFilter.java:64); [docker-compose.yml:60–67](/Users/agoge/Developer/repos/github/veterans-connect/docker-compose.yml:60).

**Issue and rationale:** Direct backend startup silently uses a publicly committed valid signing key when JWT_SECRET is absent. With that key and an existing account email, an attacker can sign an accepted token for the account. Compose requires a secret, but that guard does not protect other launch/deploy paths. No deployed token or account was attacked.

**Recommended fix:** Require an environment-specific secret, reject known/default/weak keys and invalid lifetime/cookie settings at startup, and isolate dev/prod signing material. Rotate wherever the fallback may have been used. Validate once and retain the parsed key securely; never log it. Keep a deliberate, test-only key in isolated test configuration.

### B02 — Unsupported Spring line and confirmed affected security dependency

**Severity: High. Status: Confirmed support/affected-version gap; application exploit conditions unverified.**

**References:** [backend/pom.xml:5–8](/Users/agoge/Developer/repos/github/veterans-connect/backend/pom.xml:5), [backend/pom.xml:35–61](/Users/agoge/Developer/repos/github/veterans-connect/backend/pom.xml:35); [backend/src/main/java/com/veteransconnect/config/SecurityConfig.java:89–102](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/config/SecurityConfig.java:89); [.github/workflows/dependency-check.yml:35–39](/Users/agoge/Developer/repos/github/veterans-connect/.github/workflows/dependency-check.yml:35).

**Issue and rationale:** Boot 3.4.13 is the end of open-source support for its line, per the [official release notice](https://spring.io/blog/2025/12/18/spring-boot-3-4-13-available-now/). Packaged Spring Security 6.4.13 falls within [CVE-2026-22732](https://spring.io/security/cve-2026-22732/): under certain response-header conditions security headers can be omitted, including protection against sensitive caching. The advisory rates the upstream issue Critical; this audit rates deployment remediation High because the triggering path was not reproduced here. Maven dependency tree/version reports are not vulnerability scanning.

**Recommended fix:** Move using a currently supported Boot BOM and compatible Java/runtime, verify response/cache headers on real responses, and add effective SCA/SBOM/container scans. Do not prescribe 6.4.15 as a publicly available patch: the advisory identifies that branch's fix as enterprise-only. Review transitive Tomcat/Jackson/JDBC/JJWT advisories too; this was a targeted advisory review, not a complete vulnerability scan.

**Applicability guard:** [CVE-2026-47834](https://spring.io/security/cve-2026-47834/) includes the packaged Data JPA version but requires untrusted sorting on native-query repository methods; neither native queries nor such sorting exist here. No exploitable SQL injection is claimed from that advisory. Reviewed DPoP/AES encryptor/authorization-server advisories likewise do not establish use of those features in this application.

### B03 — Production security and datasource requirements are not enforced

**Severity: High. Status: Confirmed unsafe defaults; production exposure conditional.**

**References:** [backend/src/main/resources/application.properties:9–16](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/resources/application.properties:9), [backend/src/main/resources/application.properties:29–50](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/resources/application.properties:29); [backend/.env.example:1–8](/Users/agoge/Developer/repos/github/veterans-connect/backend/.env.example:1); [docker-compose.yml:3–15](/Users/agoge/Developer/repos/github/veterans-connect/docker-compose.yml:3), [docker-compose.yml:25–34](/Users/agoge/Developer/repos/github/veterans-connect/docker-compose.yml:25), [docker-compose.yml:55–75](/Users/agoge/Developer/repos/github/veterans-connect/docker-compose.yml:55).

**Issue and rationale:** Database credentials default to postgres; cookie Secure defaults false; sandbox/placeholder provider configuration remains acceptable at startup. No profile-gated production validation or datasource TLS requirement exists. Setting SPRING_PROFILES_ACTIVE=prod alone adds no safeguards. Compose publishes database/admin ports without loopback binding and uses weak local defaults; these are local scaffolding, not proof of a publicly exposed deployment.

**Recommended fix:** Establish validated production configuration: mandatory secrets/HTTPS origins, Secure cookies, correct SameSite, trusted proxy scheme handling, provider environment, verified database TLS, and separate least-privilege runtime/migration roles. Keep dev-only defaults and ports explicitly local; provision production settings through a controlled secret/config mechanism.

### B04 — Authentication limiter is bypassable and leaks bucket memory

**Severity: High. Status: Confirmed abuse-control gap.**

**References:** [backend/src/main/java/com/veteransconnect/security/AuthRateLimiter.java:24–28](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/security/AuthRateLimiter.java:24), [backend/src/main/java/com/veteransconnect/security/AuthRateLimiter.java:49–80](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/security/AuthRateLimiter.java:49); [backend/src/main/java/com/veteransconnect/controller/AuthController.java:57–65](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/controller/AuthController.java:57), [backend/src/main/java/com/veteransconnect/controller/AuthController.java:84–97](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/controller/AuthController.java:84); [backend/src/main/java/com/veteransconnect/exception/GlobalExceptionHandler.java:134–145](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/exception/GlobalExceptionHandler.java:134).

**Issue and rationale:** The sole bucket is endpoint+IP+email. Rotating emails avoids an aggregate IP cap; rotating IPs avoids an account cap. Entries are never removed, so distinct identities grow memory indefinitely. State resets on restart and is independent per replica. Trusting the first X-Forwarded-For value without a protected trusted-proxy boundary permits spoofing; ignoring forwarding can group real users behind ingress. Invalid DTO requests occur before the limiter. 429 responses provide no Retry-After.

**Recommended fix:** Add bounded expiring buckets plus aggregate/account controls and ingress-level request limits, with explicit trusted-proxy handling and validated settings. Return retry guidance and record privacy-safe abuse metrics. Select an affordable shared or edge strategy only when deployment topology requires it; Redis is not automatically necessary.

### B05 — Sessions cannot be revoked or constrained across environments

**Severity: High. Status: Confirmed lifecycle/containment gap; replay requires possession of a valid token.**

**References:** [backend/src/main/java/com/veteransconnect/controller/AuthController.java:118–136](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/controller/AuthController.java:118), [backend/src/main/java/com/veteransconnect/controller/AuthController.java:145–166](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/controller/AuthController.java:145); [backend/src/main/java/com/veteransconnect/security/JwtService.java:33–79](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/security/JwtService.java:33); [backend/src/main/java/com/veteransconnect/security/CustomUserDetailsService.java:20–31](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/security/CustomUserDetailsService.java:20).

**Issue and rationale:** Logout only clears a browser cookie. A copied token remains valid for its original lifetime (24 hours by default); there is no token/session version, revocation, disabled state, or logout-all. Claims do not constrain issuer/audience/environment. If environments reuse the same key and account email, tokens are not cryptographically separated by environment. `/me` reports configured full lifetime instead of actual remaining expiry. Lack of revocation is an explicit stateless-JWT tradeoff, not proof of token theft.

**Recommended fix:** Define a small-team session/revocation policy, consider a DB-backed session or account token-version check using the DB lookup already performed, issue/validate issuer/audience and mandatory temporal claims, separate environment keys, and return absolute actual expiry. Test logout/replay, expired/malformed claims, key rotation and disabled accounts. A refresh-token system should be added only with a clear need and secure rotation design.

### B06 — Account recovery, verification and identity normalization are incomplete

**Severity: Medium. Status: Confirmed missing capabilities / identity ambiguity.**

**References:** [backend/src/main/java/com/veteransconnect/controller/AuthController.java:57–115](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/controller/AuthController.java:57); [backend/src/main/java/com/veteransconnect/service/UserServiceImpl.java:30–42](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/service/UserServiceImpl.java:30), [backend/src/main/java/com/veteransconnect/service/UserServiceImpl.java:81–89](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/service/UserServiceImpl.java:81); [backend/src/main/java/com/veteransconnect/repository/UserRepository.java:11–18](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/repository/UserRepository.java:11); [backend/src/main/java/com/veteransconnect/model/User.java:29–53](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/model/User.java:29); [backend/src/main/java/com/veteransconnect/security/CustomUserDetailsService.java:20–31](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/security/CustomUserDetailsService.java:20).

**Issue and rationale:** Emails are not canonicalized consistently for registration/login, while the limiter normalizes them and SQL uniqueness is case-sensitive. Duplicate-email registration explicitly discloses whether an address is registered. Email ownership, password recovery/change, account disabling and admin intervention are absent. VETERAN is a fixed role assigned to every registrant; branch selection is self-reported, not military-service verification. No role-escalation API was found.

**Recommended fix:** Choose/document canonical identity rules, reconcile existing duplicates before applying a DB uniqueness migration, and apply the same rules end-to-end. Provide a secure recovery/disable process before broad enrollment, weigh enumeration tradeoffs, and avoid representing self-registration as verified veteran status. MFA/federation may remain a later scoped decision rather than an automatic new service.

### B07 — Password DTO policy accepts values the encoder rejects

**Severity: Medium. Status: Confirmed by isolated execution.**

**References:** [backend/src/main/java/com/veteransconnect/dto/UserRegistrationRequest.java:25–27](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/dto/UserRegistrationRequest.java:25); [backend/src/main/java/com/veteransconnect/dto/LoginRequest.java:8–13](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/dto/LoginRequest.java:8); [backend/src/main/java/com/veteransconnect/config/SecurityConfig.java:143–146](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/config/SecurityConfig.java:143); [backend/src/main/java/com/veteransconnect/service/UserServiceImpl.java:81–89](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/service/UserServiceImpl.java:81); [backend/src/main/java/com/veteransconnect/exception/GlobalExceptionHandler.java:69–79](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/exception/GlobalExceptionHandler.java:69).

**Issue and rationale:** Registration validates only a minimum of eight characters; login has no length cap. A 73-byte ASCII password passed DTO validation but the installed BCrypt encoder rejected it with an IllegalArgumentException; 72 bytes encoded successfully. Multibyte text reaches that limit with fewer characters. The existing policy promises more than hashing supports and leaves excessive input work poorly bounded.

**Recommended fix:** Establish a documented byte-aware policy consistent with the chosen password algorithm and user needs; validate before hashing and return field-specific errors. Never silently truncate or normalize passwords. If longer passphrases require an algorithm change, design/test hash migration and cost parameters rather than wrapping BCrypt in an ad hoc prehash.

### B08 — Request validation does not align with schema or resource identity

**Severity: Medium. Status: Confirmed by source and isolated validator checks.**

**References:** [backend/src/main/java/com/veteransconnect/dto/UserRegistrationRequest.java:8–27](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/dto/UserRegistrationRequest.java:8); [backend/src/main/java/com/veteransconnect/dto/SaveResourceRequest.java:13–35](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/dto/SaveResourceRequest.java:13); [backend/src/main/java/com/veteransconnect/dto/UpdateNotesRequest.java:8–13](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/dto/UpdateNotesRequest.java:8); [backend/src/main/java/com/veteransconnect/controller/ResourceController.java:31–44](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/controller/ResourceController.java:31); [backend/src/main/resources/db/migration/V1__create_initial_schema.sql:3–29](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/resources/db/migration/V1__create_initial_schema.sql:3).

**Issue and rationale:** Names and many saved fields lack database-aligned upper bounds, source/URL/phone/state checks; descriptions and keyword are unbounded at application level. A 300-character name, unsupported source, file-scheme website and invalid state all passed DTO validation in synthetic checks. DB limits then reject some inputs at flush, outside the intended field-validation path. Notes are bounded through these HTTP DTOs, which is positive; no explicit application-wide JSON body/ingress budget is configured. Framework/parser limits may still exist and were not assumed absent.

**Recommended fix:** Define shared, reasonable input limits and canonical external identity rules; validate source allowlists, http/https URLs and field lengths without overrestricting legitimate contact formats. Bound keywords/body sizes at appropriate layers, preserve structured field errors, and retain service-level safeguards for future non-HTTP callers.

### B09 — Concurrent duplicates escape the domain-conflict path

**Severity: Medium. Status: Confirmed race design; not load-tested.**

**References:** [backend/src/main/java/com/veteransconnect/service/UserServiceImpl.java:36–42](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/service/UserServiceImpl.java:36); [backend/src/main/java/com/veteransconnect/service/SavedResourceServiceImpl.java:37–62](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/service/SavedResourceServiceImpl.java:37); [backend/src/main/resources/db/migration/V1__create_initial_schema.sql:11–12](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/resources/db/migration/V1__create_initial_schema.sql:11), [backend/src/main/resources/db/migration/V1__create_initial_schema.sql:32–34](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/resources/db/migration/V1__create_initial_schema.sql:32); [backend/src/main/java/com/veteransconnect/exception/GlobalExceptionHandler.java:25–79](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/exception/GlobalExceptionHandler.java:25).

**Issue and rationale:** Check-then-insert is not atomic. Concurrent identical requests can both pass the existence check; the unique constraints correctly stop duplicate rows, but there is no deliberate translation of the resulting integrity exception to 409/idempotent success. Account registration commits before JWT generation/cookie issuance; later failure can leave an account created despite a failed registration response.

**Recommended fix:** Keep DB uniqueness as authority, translate known constraint violations safely outside the failed transaction, and define duplicate-save/idempotency behavior. Validate signing configuration before accepting registrations; document/recover partial account-created/session-failed outcomes. Do not catch every integrity error as “duplicate.”

### B10 — Error and user-query contracts vary across paths

**Severity: Medium. Status: Confirmed API inconsistency.**

**References:** [backend/src/main/java/com/veteransconnect/exception/GlobalExceptionHandler.java:19–79](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/exception/GlobalExceptionHandler.java:19), [backend/src/main/java/com/veteransconnect/exception/GlobalExceptionHandler.java:134–185](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/exception/GlobalExceptionHandler.java:134); [backend/src/main/java/com/veteransconnect/config/SecurityConfig.java:68–81](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/config/SecurityConfig.java:68); [backend/src/main/java/com/veteransconnect/security/JwtAuthenticationFilter.java:82–88](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/security/JwtAuthenticationFilter.java:82); [backend/src/main/java/com/veteransconnect/controller/UserController.java:36–64](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/controller/UserController.java:36); [backend/src/main/java/com/veteransconnect/controller/ResourceController.java:60–68](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/controller/ResourceController.java:60).

**Issue and rationale:** Controller errors include timestamps/optional field maps; filter errors omit them; missing/invalid query types, JSON errors, DB failures and unexpected exceptions have no consistent application contract. A broad IllegalArgumentException handler exposes messages beyond deliberate user validation. `/users` returns either object or array, and multiple filters silently use email→branch→ZIP precedence. Creation responses omit Location. No OpenAPI contract exists.

**Recommended fix:** Standardize a small error envelope or ProblemDetail with stable error code, UTC timestamp, safe message, field errors and request ID; handle common conversion/integrity/upstream/unexpected failures without changing correct 4xx/5xx semantics. Use an explicit self-profile contract and predictable filter semantics; add creation Location where useful and document the API. Never return raw SQL/stack traces to callers.

### B11 — CSRF token delivery and mixed credential modes need a deployment contract

**Severity: High. Status: Confirmed backend transport limitation; separate-host impact conditional.**

**References:** [backend/src/main/java/com/veteransconnect/config/SecurityConfig.java:49–66](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/config/SecurityConfig.java:49), [backend/src/main/java/com/veteransconnect/config/SecurityConfig.java:107–126](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/config/SecurityConfig.java:107); [backend/src/main/java/com/veteransconnect/controller/AuthController.java:139–164](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/controller/AuthController.java:139); [backend/src/main/java/com/veteransconnect/security/JwtAuthenticationFilter.java:95–109](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/security/JwtAuthenticationFilter.java:95).

**Issue and rationale:** CSRF bootstrap returns no token body and relies on default cookie scope. A browser app on another hostname cannot read an API-host cookie to echo it in a header; CORS alone does not solve scope. SameSite=Lax and Secure=false defaults also require a deliberate cross-site/HTTPS decision. Bearer extraction exists but unsafe bearer requests still require CSRF, and login does not issue a JSON bearer token: this is not a complete standalone token-client API.

**Recommended fix:** Choose same-origin ingress or an explicitly designed token bootstrap strategy, validate cookies/allowed origins, and test the production browser topology. Document which credential modes are supported; if distinct token clients are required, separate their security rules deliberately without weakening cookie-authenticated writes. Keep CSRF active for cookie flows, including login/logout.

### B12 — Sensitive user interests and generated object strings can enter logs

**Severity: High. Status: Confirmed sensitive logging; accidental credential logging risk conditional.**

**References:** [backend/src/main/java/com/veteransconnect/service/ResourceSearchServiceImpl.java:48–51](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/service/ResourceSearchServiceImpl.java:48); [backend/src/main/java/com/veteransconnect/service/SavedResourceServiceImpl.java:59–60](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/service/SavedResourceServiceImpl.java:59), [backend/src/main/java/com/veteransconnect/service/SavedResourceServiceImpl.java:82–90](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/service/SavedResourceServiceImpl.java:82); [backend/src/main/java/com/veteransconnect/client/GeocodingService.java:118–125](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/client/GeocodingService.java:118); [backend/src/main/java/com/veteransconnect/client/VaFacilitiesClient.java:126–130](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/client/VaFacilitiesClient.java:126); [backend/src/main/java/com/veteransconnect/model/User.java:18–21](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/model/User.java:18); [backend/src/main/java/com/veteransconnect/dto/LoginRequest.java:6–15](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/dto/LoginRequest.java:6); [backend/src/main/java/com/veteransconnect/dto/UserRegistrationRequest.java:6–29](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/dto/UserRegistrationRequest.java:6).

**Issue and rationale:** INFO logs record ZIP/free-text support searches and email/facility associations; exception messages can include upstream response bodies. User `@Data` generates a toString containing passwordHash; credential records' default toString includes passwords. Isolated synthetic checks confirmed these generated-string behaviors without printing credentials. No current explicit password logger was found. User-controlled free text can also disrupt plain-text logs if control characters are retained.

**Recommended fix:** Remove/redact search/account content from routine logs, use structured events and opaque identifiers with controlled retention/access, exclude credentials and associations from generated strings, and sanitize untrusted log fields. Keep useful status/latency/error-category metrics without provider bodies, tokens, keys, notes or passwords.

### B13 — Saved provider attribution is supplied by the client

**Severity: High. Status: Confirmed resource-integrity defect; scope is caller's own library.**

**References:** [backend/src/main/java/com/veteransconnect/dto/SaveResourceRequest.java:11–35](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/dto/SaveResourceRequest.java:11); [backend/src/main/java/com/veteransconnect/service/SavedResourceServiceImpl.java:34–62](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/service/SavedResourceServiceImpl.java:34); [backend/src/main/java/com/veteransconnect/service/ResourceSearchServiceImpl.java:125–138](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/service/ResourceSearchServiceImpl.java:125), [backend/src/main/java/com/veteransconnect/service/ResourceSearchServiceImpl.java:151–156](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/service/ResourceSearchServiceImpl.java:151).

**Issue and rationale:** The server copies arbitrary client sourceApi/externalId/name/contact/category into a provider-labelled saved resource without resolving or authenticating the provider record. A caller can label fabricated details VA_FACILITIES. No other user's library or global directory is modified, so this is not a demonstrated cross-user poisoning vulnerability. Search's saved flag compares externalId alone while DB uniqueness also includes sourceApi, causing source collisions and incorrect saved status.

**Recommended fix:** Accept a canonical source+ID and resolve trusted details server-side or validate a server-issued snapshot; represent user-authored records explicitly as unverified. Compare saved identities as `(source, externalId)` consistently. Separate user notes from provider fields and version the snapshot/provenance contract.

### B14 — Category results assert services the provider mapping does not verify

**Severity: High. Status: Confirmed resource-semantics defect.**

**References:** [backend/src/main/java/com/veteransconnect/model/enums/ResourceCategory.java:9–24](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/model/enums/ResourceCategory.java:9); [backend/src/main/java/com/veteransconnect/service/ResourceSearchServiceImpl.java:81–85](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/service/ResourceSearchServiceImpl.java:81), [backend/src/main/java/com/veteransconnect/service/ResourceSearchServiceImpl.java:104–147](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/service/ResourceSearchServiceImpl.java:104).

**Issue and rationale:** Education, housing and financial assistance all query benefits facilities; results are assigned the requested category. A benefits office is not proof of a specific program, eligibility, shelter availability or emergency funding. Keyword matches only facility name/classification, not a verified service catalogue. Unknown provider types default to benefits.

**Recommended fix:** Distinguish facility type from verified service/program capabilities, preserve unknown classifications, and label broad referral searches honestly. Use actual provider capability metadata or an independently maintained verified source before promising narrower categories. Add contract tests for each mapping and avoid treating a self-chosen search category as evidence.

### B15 — Resource freshness, verification, retirement and correction workflow are missing

**Severity: High. Status: Confirmed data-model/readiness gap.**

**References:** [backend/src/main/java/com/veteransconnect/model/SavedResource.java:40–83](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/model/SavedResource.java:40); [backend/src/main/java/com/veteransconnect/dto/ResourceSearchResult.java:8–24](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/dto/ResourceSearchResult.java:8); [backend/src/main/java/com/veteransconnect/dto/SavedResourceResponse.java:12–28](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/dto/SavedResourceResponse.java:12); [backend/src/main/java/com/veteransconnect/controller/ResourceController.java:31–90](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/controller/ResourceController.java:31); [backend/src/main/resources/application.properties:46–50](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/resources/application.properties:46).

**Issue and rationale:** savedAt/updatedAt describe the bookmark/notes, not when provider data was updated or verified. There is no source-environment indicator, lastFetchedAt/providerUpdatedAt/lastVerifiedAt, availability status, snapshot refresh, discontinued flag, correction report or review owner. Sandbox is the default; production source access/quality has not been verified. Private saved copies can remain stale indefinitely after provider contact details change.

**Recommended fix:** Add minimal trustworthy provenance/fetch time/source environment and distinguish verification from retrieval. Provide resource refresh, unavailable/retired handling and a small report/triage process with ownership and audit history. Never infer that a successful API response means the service has capacity or that the user is eligible. Bound any background refresh to provider quotas; no scheduler is currently implemented.

### B16 — Search truncates provider results and converts unknown distance to zero

**Severity: Medium. Status: Confirmed result-integrity defects.**

**References:** [backend/src/main/java/com/veteransconnect/client/VaFacilitiesClient.java:30–32](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/client/VaFacilitiesClient.java:30), [backend/src/main/java/com/veteransconnect/client/VaFacilitiesClient.java:82–117](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/client/VaFacilitiesClient.java:82); [backend/src/main/java/com/veteransconnect/service/ResourceSearchServiceImpl.java:73–78](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/service/ResourceSearchServiceImpl.java:73), [backend/src/main/java/com/veteransconnect/service/ResourceSearchServiceImpl.java:104–113](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/service/ResourceSearchServiceImpl.java:104).

**Issue and rationale:** Only per_page=20 is requested, without following provider pages or returning total/cursor/truncated status. Keyword filtering happens on that subset, so a no-match result is not exhaustive. Missing/null distance is changed to 0.0 and sorts before known positive distances. Different requests can misleadingly appear complete or immediately adjacent.

**Recommended fix:** Preserve null for unknown distance, validate finite/nonnegative distance, and design bounded pagination/partial-result metadata. Apply supported server-side filters where verified, and disclose local-subset filtering. Test missing metadata, multiple pages, unknown distance and stable ordering.

### B17 — Upstream payload validation is insufficient and conflates failure with no matches

**Severity: Medium. Status: Confirmed validation gap; malformed-response impact conditional.**

**References:** [backend/src/main/java/com/veteransconnect/client/GeocodingService.java:107–139](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/client/GeocodingService.java:107); [backend/src/main/java/com/veteransconnect/client/VaFacilitiesClient.java:97–117](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/client/VaFacilitiesClient.java:97), [backend/src/main/java/com/veteransconnect/client/VaFacilitiesClient.java:178–247](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/client/VaFacilitiesClient.java:178).

**Issue and rationale:** Double.parseDouble accepts NaN/Infinity and out-of-range coordinates; an isolated parser probe confirmed non-finite values are accepted. VA records need only a non-null ID, not a usable name/type; null distance-list elements can cause NPE. A null response/missing data becomes a successful empty list, concealing a broken upstream contract. Missing coordinate fields are reported as client ZIP failures even when the provider payload is malformed.

**Recommended fix:** Validate finite latitude/longitude ranges and usable provider records, bound payload processing, reject or annotate malformed responses as upstream failures with privacy-safe diagnostics, and preserve the difference between valid zero matches and invalid data. Keep tolerant aliases for documented schema variants, with recorded fixtures/contract checks.

### B18 — External quotas and costly endpoints have no aggregate admission control

**Severity: High. Status: Confirmed missing safeguards; outage/abuse conditional on traffic.**

**References:** [backend/src/main/java/com/veteransconnect/client/GeocodingService.java:30–39](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/client/GeocodingService.java:30), [backend/src/main/java/com/veteransconnect/client/GeocodingService.java:82–120](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/client/GeocodingService.java:82); [backend/src/main/java/com/veteransconnect/controller/ResourceController.java:31–66](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/controller/ResourceController.java:31); [backend/src/main/java/com/veteransconnect/service/ResourceSearchServiceImpl.java:53–69](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/service/ResourceSearchServiceImpl.java:53); [backend/src/main/resources/application.properties:55–61](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/resources/application.properties:55).

**Issue and rationale:** Concurrent uncached geocoding calls and multiple replicas can exceed public Nominatim's application-wide [one-request-per-second policy](https://operations.osmfoundation.org/policies/nominatim/). Cache lookup/fill is not single-flight; there is no throttle, negative cache or TTL. Valid five-digit keys bound distinct cache entries to at most 100,000, so this cache is not an unlimited arbitrary-string key space; it still has no explicit size/age budget. Any authenticated registrant can repeatedly trigger geocoding/VA calls or save unique records without endpoint/account quotas. Configured User-Agent contact ownership and attribution compliance are unverified.

**Recommended fix:** Enforce provider-wide budgets across actual replicas, coalesce cache misses, use bounded/expiring caching appropriate to ZIP stability, and apply per-user/ingress quotas and storage limits. Verify provider terms/contact/attribution; consider a suitable ZIP dataset/provider rather than trying to evade limits. Cache invalid ZIP misses briefly where appropriate and avoid blind retry storms.

### B19 — Sequential external failures block the whole search without a total deadline

**Severity: Medium. Status: Confirmed reliability design gap.**

**References:** [backend/src/main/java/com/veteransconnect/client/GeocodingService.java:56–60](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/client/GeocodingService.java:56), [backend/src/main/java/com/veteransconnect/client/GeocodingService.java:122–125](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/client/GeocodingService.java:122); [backend/src/main/java/com/veteransconnect/client/VaFacilitiesClient.java:59–63](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/client/VaFacilitiesClient.java:59), [backend/src/main/java/com/veteransconnect/client/VaFacilitiesClient.java:119–132](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/client/VaFacilitiesClient.java:119); [backend/src/main/java/com/veteransconnect/service/ResourceSearchServiceImpl.java:53–78](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/service/ResourceSearchServiceImpl.java:53).

**Issue and rationale:** Connect/read timeouts are present, but a broad search performs up to four blocking calls sequentially and has no end-to-end budget, concurrency budget or circuit behavior. One facility-type failure discards earlier successful types. Provider 429/5xx and network timeouts become generic unavailability without retry guidance. No retry is implemented; absence of retries alone is not a defect and currently avoids amplification.

**Recommended fix:** Define a total request budget and explicit all-or-partial result contract; use bounded concurrency only within provider quotas. Add circuit/admission control as measured necessary and privacy-safe upstream status/latency metrics. Retry only safe transient GETs with capped backoff/jitter and provider Retry-After, within the total budget. Never silently return a partial list as complete.

### B20 — Search transaction spans provider network waits

**Severity: Medium. Status: Confirmed transaction scope; pool impact requires measurement.**

**References:** [backend/src/main/java/com/veteransconnect/service/ResourceSearchServiceImpl.java:37–78](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/service/ResourceSearchServiceImpl.java:37), [backend/src/main/java/com/veteransconnect/service/ResourceSearchServiceImpl.java:151–156](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/service/ResourceSearchServiceImpl.java:151); [backend/src/main/resources/application.properties:9–16](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/resources/application.properties:9).

**Issue and rationale:** A read-only transaction wraps geocoding and all VA calls before repository access. Depending on transaction/connection acquisition behavior this can hold a DB connection across slow network waits; even with delayed acquisition, the transaction is unnecessarily broad. No explicit connection-pool/statement/transaction budgets or open-in-view decision is configured. Hikari is present automatically; lack of explicit settings does not mean no connection pool exists.

**Recommended fix:** Separate provider work from a short repository projection transaction, disable reliance on open-in-view after verifying boundaries, and size total replica pool connections against database capacity. Measure connection occupancy, query count, thread utilization and timeout behavior under slow upstream conditions before tuning.

### B21 — Unbounded saved-resource reads load unnecessary private fields

**Severity: Medium. Status: Confirmed query/scale limitation.**

**References:** [backend/src/main/java/com/veteransconnect/repository/SavedResourceRepository.java:11–21](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/repository/SavedResourceRepository.java:11); [backend/src/main/java/com/veteransconnect/service/SavedResourceServiceImpl.java:65–72](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/service/SavedResourceServiceImpl.java:65); [backend/src/main/java/com/veteransconnect/service/ResourceSearchServiceImpl.java:151–155](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/service/ResourceSearchServiceImpl.java:151); [backend/src/main/resources/db/migration/V1__create_initial_schema.sql:34–37](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/resources/db/migration/V1__create_initial_schema.sql:34).

**Issue and rationale:** Saved lists return every row; search loads full saved entities, including potentially large notes/descriptions, to calculate an ID set. There is no page cap, per-user resource quota or query timeout policy. Saved-time ordering lacks an explicit composite ordering index/tiebreaker. No measured slow query or N+1 problem was demonstrated; the current lazy relationship is not itself a defect.

**Recommended fix:** Project only source/ID for flags, add bounded pagination with stable savedAt+id ordering, and provide small summary/count queries if needed. Consider `(user_id, saved_at, id)` index after PostgreSQL plans/workload validation; do not add indexes merely for unused methods. Bound save volume to control storage and database cost.

### B22 — Database constraints do not fully express application invariants

**Severity: Medium. Status: Confirmed schema gap.**

**References:** [backend/src/main/resources/db/migration/V1__create_initial_schema.sql:1–37](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/resources/db/migration/V1__create_initial_schema.sql:1); [backend/src/main/resources/db/migration/V2__fix_branch_of_service_constraint.sql:1–16](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/resources/db/migration/V2__fix_branch_of_service_constraint.sql:1); [backend/src/main/java/com/veteransconnect/model/User.java:47–53](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/model/User.java:47); [backend/src/main/java/com/veteransconnect/model/SavedResource.java:43–75](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/model/SavedResource.java:43); [backend/src/main/java/com/veteransconnect/controller/UserController.java:58–60](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/controller/UserController.java:58).

**Issue and rationale:** DB permits null ZIP while Java validation rejects it; UserController dereferences it without null protection. Saved category/source/notes have few DB domain checks, so direct imports or future paths can create values the application cannot interpret. JPA validate does not verify all semantic CHECK/uniqueness/format expectations. Foreign-key restriction is intentional default behavior, but no account-delete policy exists.

**Recommended fix:** Reconcile existing rows before adding non-null/domain/length checks in new forward migrations, define canonical email/source identity, and design explicit deletion ordering/retention. Test migrations and constraints on PostgreSQL. Do not modify already-applied V1/V2 migrations to repair production schema.

### B23 — DTO mapping occurs before timestamp generation/refresh

**Severity: Medium. Status: Confirmed by isolated real-service/JPA execution.**

**References:** [backend/src/main/java/com/veteransconnect/service/SavedResourceServiceImpl.java:59–62](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/service/SavedResourceServiceImpl.java:59), [backend/src/main/java/com/veteransconnect/service/SavedResourceServiceImpl.java:76–83](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/service/SavedResourceServiceImpl.java:76); [backend/src/main/java/com/veteransconnect/model/SavedResource.java:77–83](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/model/SavedResource.java:77); [backend/src/main/java/com/veteransconnect/dto/SavedResourceResponse.java:31–47](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/dto/SavedResourceResponse.java:31).

**Issue and rationale:** Inside the service transaction, DTOs are built immediately after save, before flush generates insertion/update timestamps. The H2/JPA probe using the actual service returned null savedAt/updatedAt on creation, while the committed row had both. After notes update, response updatedAt differed from the persisted value. The immutable DTO does not update when the entity flushes at transaction completion.

**Recommended fix:** Deliberately flush (and refresh where generation requires it) before mapping, or manage the authoritative timestamps before mapping using a consistent application/database policy. Add service+persistence response-contract tests for create/update and failure cases; reproduce on PostgreSQL before release. Avoid blindly adding flush to every repository call.

### B24 — Concurrent note edits silently overwrite each other

**Severity: Medium. Status: Confirmed missing conflict detection; race not load-tested.**

**References:** [backend/src/main/java/com/veteransconnect/model/SavedResource.java:29–83](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/model/SavedResource.java:29); [backend/src/main/java/com/veteransconnect/service/SavedResourceServiceImpl.java:75–89](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/service/SavedResourceServiceImpl.java:75); [backend/src/main/java/com/veteransconnect/controller/ResourceController.java:71–90](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/controller/ResourceController.java:71); [backend/src/main/resources/db/migration/V1__create_initial_schema.sql:15–35](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/resources/db/migration/V1__create_initial_schema.sql:15).

**Issue and rationale:** No @Version, expected-version field or conditional request detects concurrent edits/deletes. Two tabs can read the same notes and the later commit silently replaces the earlier update. A timestamp alone is not an enforced concurrency check.

**Recommended fix:** Add optimistic versioning with a forward migration and an explicit 409/412 conflict contract; require the version/ETag for updates and provide recoverable conflict behavior. Test same-version updates and update/delete races without introducing unnecessary pessimistic locks.

### B25 — Time semantics are ambiguous across environments

**Severity: Medium. Status: Confirmed data/API modeling limitation.**

**References:** [backend/src/main/java/com/veteransconnect/model/User.java:55–61](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/model/User.java:55); [backend/src/main/java/com/veteransconnect/model/SavedResource.java:77–83](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/model/SavedResource.java:77); [backend/src/main/java/com/veteransconnect/exception/GlobalExceptionHandler.java:19–32](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/exception/GlobalExceptionHandler.java:19); [backend/src/main/resources/db/migration/V1__create_initial_schema.sql:9–10](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/resources/db/migration/V1__create_initial_schema.sql:9), [backend/src/main/resources/db/migration/V1__create_initial_schema.sql:30–31](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/resources/db/migration/V1__create_initial_schema.sql:30).

**Issue and rationale:** LocalDateTime and timestamp without time zone lack an offset/UTC convention; error timestamps also use process-local clock. AWS/JVM/database/browser timezone differences can make ordering, recency and incident correlation unreliable. No observed production time shift is claimed.

**Recommended fix:** Choose UTC instants/offset timestamps for event times, use a testable clock, and design a data-aware migration preserving known historical timezone interpretation. Distinguish resource source time from bookmark/note time (B15).

### B26 — Private-data retention/export/deletion and recovery ownership are undefined

**Severity: High. Status: Repository readiness gap.**

**References:** [backend/src/main/java/com/veteransconnect/model/User.java:29–61](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/model/User.java:29); [backend/src/main/java/com/veteransconnect/model/SavedResource.java:36–83](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/model/SavedResource.java:36); [backend/src/main/java/com/veteransconnect/controller/UserController.java:18–66](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/controller/UserController.java:18); [backend/src/main/java/com/veteransconnect/controller/ResourceController.java:50–90](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/controller/ResourceController.java:50); [backend/src/main/resources/db/migration/V1__create_initial_schema.sql:15–35](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/resources/db/migration/V1__create_initial_schema.sql:15).

**Issue and rationale:** Personal identity, location and arbitrary notes persist with no account export/delete/correction, retention schedule, access audit or incident containment workflow. Deleting one saved resource is implemented; deleting an account and its related rows/backups is not. Notes can contain sensitive records despite the product's informational purpose. No encryption-at-rest/access-control implementation outside the database is confirmed from source.

**Recommended fix:** Minimize collected data, define an owned and authenticated data-request process, implement appropriate retention/export/deletion and account disable behavior, and scope access to database/backups/logs. Decide backup-deletion limitations and encryption/key ownership before making user promises; no particular legal compliance status is asserted.

### B27 — Backup, restore and production migration execution are unproven

**Severity: High. Status: Repository readiness gap, not a claim that external backups do not exist.**

**References:** [docker-compose.yml:12–13](/Users/agoge/Developer/repos/github/veterans-connect/docker-compose.yml:12), [docker-compose.yml:112–116](/Users/agoge/Developer/repos/github/veterans-connect/docker-compose.yml:112); [backend/src/main/resources/application.properties:9–15](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/resources/application.properties:9); [backend/src/main/resources/db/migration/V1__create_initial_schema.sql:1–37](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/resources/db/migration/V1__create_initial_schema.sql:1); [backend/src/main/resources/db/migration/V2__fix_branch_of_service_constraint.sql:1–16](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/resources/db/migration/V2__fix_branch_of_service_constraint.sql:1); [backend/src/test/java/com/veteransconnect/repository/UserRepositoryTest.java:17–38](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/test/java/com/veteransconnect/repository/UserRepositoryTest.java:17).

**Issue and rationale:** A local Docker volume is persistence, not a recovery plan. No backup/PITR policy, restore drill, RPO/RTO, isolated restore environment, production baseline/adoption procedure or migration roll-forward/rollback process is defined. Flyway runs using the application's datasource permissions by default. H2 migration success is not PostgreSQL or real historical-schema compatibility evidence.

**Recommended fix:** Define affordable backup/retention/encryption/access settings, test restore and document ownership/RPO/RTO. Test PostgreSQL fresh and upgrade migrations, inventory existing schema history before baselining, and adopt a controlled migration step/role with backward-compatible rollout. Flyway locking helps coordinate migrations but does not replace deployment/recovery planning.

### B28 — Monitoring is present as a dependency, incomplete as an operating system

**Severity: Medium. Status: Confirmed instrumentation foundation / readiness gap.**

**References:** [backend/pom.xml:51–54](/Users/agoge/Developer/repos/github/veterans-connect/backend/pom.xml:51); [backend/src/main/resources/application.properties:18–20](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/resources/application.properties:18); [backend/src/main/java/com/veteransconnect/config/SecurityConfig.java:65–66](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/config/SecurityConfig.java:65); [docker-compose.yml:79–84](/Users/agoge/Developer/repos/github/veterans-connect/docker-compose.yml:79); [backend/src/main/java/com/veteransconnect/client/VaFacilitiesClient.java:119–132](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/client/VaFacilitiesClient.java:119).

**Issue and rationale:** Actuator/Micrometer and a local health check exist, but no explicit provider health/degradation signal, request correlation, structured event schema, metrics export, alert thresholds, audit event stream, or production readiness/liveness/shutdown verification exists. General process/DB health can be green with a missing VA key because validation is delayed until search. A dependency outage should not necessarily restart healthy app instances.

**Recommended fix:** Define minimal service objectives and privacy-safe request/provider/DB-pool/error metrics, actionable alerts and request IDs. Separate liveness from readiness/provider degradation, validate required config at startup, and verify ingress drain/graceful shutdown. Keep external health probes quota-safe and avoid exposing sensitive diagnostic details publicly.

### B29 — Actuator access and public health behavior need explicit boundaries

**Severity: Medium. Status: Conditional security/availability risk.**

**References:** [backend/src/main/java/com/veteransconnect/config/SecurityConfig.java:58–66](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/config/SecurityConfig.java:58); [backend/src/main/java/com/veteransconnect/security/JwtAuthenticationFilter.java:32–47](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/security/JwtAuthenticationFilter.java:32), [backend/src/main/java/com/veteransconnect/security/JwtAuthenticationFilter.java:82–89](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/security/JwtAuthenticationFilter.java:82); [backend/src/main/resources/application.properties:1–61](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/resources/application.properties:1).

**Issue and rationale:** Only health has a public rule; all remaining paths merely require authentication. If future deployment expands Actuator exposure, ordinary VETERAN users could reach management endpoints unless separately restricted. Current source does not expose env/heapdump endpoints, so no current diagnostic-data leak is alleged. The JWT filter does not exempt health; a stale supplied cookie/bearer causes 401 despite permitAll. Typical load-balancer probes carry no cookie, so this is not proof of failing probes today.

**Recommended fix:** Explicitly allow only intended Actuator exposure, protect management paths with a dedicated role/private listener/network boundary, and define whether public health should ignore unrelated invalid credentials. Test actual probe paths/headers through ingress before deployment.

### B30 — Production security and persistence behavior are insufficiently tested

**Severity: High. Status: Confirmed test gap.**

**References:** [backend/src/test/java/com/veteransconnect/controller/SecurityConfiguration.java:24–35](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/test/java/com/veteransconnect/controller/SecurityConfiguration.java:24); [backend/src/test/java/com/veteransconnect/controller/AuthControllerTest.java:50–78](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/test/java/com/veteransconnect/controller/AuthControllerTest.java:50); [backend/src/test/java/com/veteransconnect/controller/ResourceControllerTest.java:43–57](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/test/java/com/veteransconnect/controller/ResourceControllerTest.java:43); [backend/src/test/java/com/veteransconnect/controller/UserControllerTest.java:37–52](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/test/java/com/veteransconnect/controller/UserControllerTest.java:37); [backend/src/test/java/com/veteransconnect/security/JwtAuthenticationFilterTest.java:25–70](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/test/java/com/veteransconnect/security/JwtAuthenticationFilterTest.java:25); [backend/src/test/resources/application-test.properties:1–16](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/test/resources/application-test.properties:1); [backend/src/test/java/com/veteransconnect/repository/UserRepositoryTest.java:17–38](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/test/java/com/veteransconnect/repository/UserRepositoryTest.java:17).

**Issue and rationale:** MVC slices exclude real security and use test configuration with CSRF disabled/permitAll; service mocks do not prove persistence/ownership. No committed SavedResourceService integration tests, JwtService tests, full production-chain suite, real PostgreSQL migration tests or provider deadline/quota tests exist. JaCoCo reports 0/55 SecurityConfig, 0/24 JwtService, 0/45 SavedResourceServiceImpl and 0/7 CustomUserDetailsService lines covered in the clean run. This audit's temporary ownership/persistence probes are useful evidence, not a replacement for reproducible committed regression tests.

**Recommended fix:** Add focused full-chain tests for anonymous access, cookie/bearer/CSRF/CORS, tamper/expiry/logout behavior and user isolation; service+persistence tests for cross-user notes/delete, timestamps, constraints and concurrency; PostgreSQL migration checks and controlled provider failure fixtures. Keep thin controller tests, but do not interpret them as security integration tests.

### B31 — CI never reaches the declared coverage gate or packaged runtime validation

**Severity: High. Status: Confirmed release-control defect.**

**References:** [backend/pom.xml:127–166](/Users/agoge/Developer/repos/github/veterans-connect/backend/pom.xml:127); [.github/workflows/ci.yml:54–69](/Users/agoge/Developer/repos/github/veterans-connect/.github/workflows/ci.yml:54); [backend/Dockerfile:7–10](/Users/agoge/Developer/repos/github/veterans-connect/backend/Dockerfile:7); [.github/workflows/dependency-check.yml:35–39](/Users/agoge/Developer/repos/github/veterans-connect/.github/workflows/dependency-check.yml:35).

**Issue and rationale:** CI runs compile and test, not verify, so the 70% coverage check is not enforced. Clean local verify ran 105 passing tests and packaged the JAR, then failed with 429/696 lines covered (61.64%). Docker packaging skips tests. No backend container smoke/security scan or artifact promotion validation is configured. Dependency reporting is not an SCA gate.

**Recommended fix:** Gate on clean verify with meaningful missing-risk tests, not a lowered percentage to hide the failure; publish coverage/test results and scan the resolved artifact/image. Exercise the packaged runtime health/auth/migration contract and identify immutable release artifacts. Avoid requiring every Docker layer to rerun all tests if the same tested artifact is promoted with traceable provenance.

### B32 — Container/AWS delivery lacks explicit least privilege and capacity budgets

**Severity: Medium. Status: Confirmed container defaults / repository deployment gap.**

**References:** [backend/Dockerfile:1–22](/Users/agoge/Developer/repos/github/veterans-connect/backend/Dockerfile:1); [backend/.mvn/wrapper/maven-wrapper.properties:1–3](/Users/agoge/Developer/repos/github/veterans-connect/backend/.mvn/wrapper/maven-wrapper.properties:1); [.github/workflows/ci.yml:28–44](/Users/agoge/Developer/repos/github/veterans-connect/.github/workflows/ci.yml:28); [docker-compose.yml:47–88](/Users/agoge/Developer/repos/github/veterans-connect/docker-compose.yml:47); [backend/src/main/resources/application.properties:1–61](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/resources/application.properties:1).

**Issue and rationale:** Runtime does not set USER; Java/database/admin image tags float; wrapper download checksum and action immutable pins are not defined. No deployment IAM/private network/secret source, per-replica connection budget, CPU/memory/request concurrency limit, autoscaling trigger, log retention, rollout rollback, or cost alert is confirmed. The backend Dockerfile copies only selected inputs/JAR; unlike a whole-directory runtime copy, it does not by itself demonstrate env-file packaging.

**Recommended fix:** Use a tested pinned non-root runtime, verify build/download provenance, scan/rebuild images, set container and DB capacity limits and environment-specific secrets/network access. Define TLS proxy forwarding and minimal AWS permissions using the chosen deployment service. Establish dev/prod data/credential isolation and budgets without prematurely choosing Kubernetes or adding Redis/queues/microservices.

### B33 — Repeated token parsing and account reads add avoidable work

**Severity: Low. Status: Confirmed repeated work; performance impact unmeasured.**

**References:** [backend/src/main/java/com/veteransconnect/security/JwtAuthenticationFilter.java:64–70](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/security/JwtAuthenticationFilter.java:64); [backend/src/main/java/com/veteransconnect/security/JwtService.java:43–74](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/security/JwtService.java:43); [backend/src/main/java/com/veteransconnect/controller/AuthController.java:92–103](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/controller/AuthController.java:92), [backend/src/main/java/com/veteransconnect/controller/AuthController.java:124–129](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/controller/AuthController.java:124); [backend/src/main/java/com/veteransconnect/controller/UserController.java:25–32](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/controller/UserController.java:25).

**Issue and rationale:** Filter extracts claims and isTokenValid re-parses for subject and expiry, repeatedly rebuilding key/parser. Protected requests load user details and controllers/services often query the same account again; login authenticates then reloads details and response separately. This DB lookup also enables account existence validation, a useful security property; “stateless JWT” does not mean “no DB operations.”

**Recommended fix:** Verify/parse once per request, reuse a validated parsed key/parser as appropriate to JJWT, and consider an application principal with immutable user ID and relevant state. Preserve current user-status checks and ownership; profile before introducing an identity cache with stale-disable risks.

### B34 — Ownership protection is correct but should remain explicit as features expand

**Severity: Low. Status: Defense-in-depth improvement, not a confirmed access-control defect.**

**References:** [backend/src/main/java/com/veteransconnect/controller/UserController.java:25–64](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/controller/UserController.java:25); [backend/src/main/java/com/veteransconnect/service/SavedResourceServiceImpl.java:93–114](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/service/SavedResourceServiceImpl.java:93); [backend/src/main/java/com/veteransconnect/repository/SavedResourceRepository.java:11–21](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/repository/SavedResourceRepository.java:11); [backend/src/main/java/com/veteransconnect/service/UserServiceImpl.java:61–74](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/service/UserServiceImpl.java:61).

**Issue and rationale:** Saved rows are loaded by ID and then ownership checked; current code returns the same 404 for missing/not owned. Isolated service tests confirmed another user's list was empty and their update/delete attempts were blocked. Unrestricted branch/ZIP listing service methods still exist without current controller callers. Future callers could bypass controller-only self restrictions if they assume services authorize all reads.

**Recommended fix:** Prefer owner-scoped repository lookup for private resources, clearly document service authorization boundaries, and remove/restrict unused broad profile queries until explicit requirements exist. Retain cross-user negative tests. Method-level authorization is optional additional defense, not evidence that current checks fail.

### B35 — Low-impact configuration and code debt obscure intent

**Severity: Low. Status: Confirmed cleanup opportunities.**

**References:** [backend/src/main/java/com/veteransconnect/model/enums/PreferredContactMethod.java:1–27](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/model/enums/PreferredContactMethod.java:1); [backend/src/main/java/com/veteransconnect/client/GeocodingService.java:76–78](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/client/GeocodingService.java:76); [backend/src/main/java/com/veteransconnect/repository/SavedResourceRepository.java:15–16](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/repository/SavedResourceRepository.java:15); [backend/src/main/java/com/veteransconnect/service/UserServiceImpl.java:61–74](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/service/UserServiceImpl.java:61); [backend/src/main/resources/application.properties:51](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/resources/application.properties:51); [backend/src/main/java/com/veteransconnect/service/ResourceSearchServiceImpl.java:33–35](/Users/agoge/Developer/repos/github/veterans-connect/backend/src/main/java/com/veteransconnect/service/ResourceSearchServiceImpl.java:33); [backend/pom.xml:85–89](/Users/agoge/Developer/repos/github/veterans-connect/backend/pom.xml:85); [backend/.env.example:1–8](/Users/agoge/Developer/repos/github/veterans-connect/backend/.env.example:1); [.github/workflows/ci.yml:31–44](/Users/agoge/Developer/repos/github/veterans-connect/.github/workflows/ci.yml:31).

**Issue and rationale:** Unused contact enum/geocoding helper/repository lookup and unused-in-production broad user query methods remain. Config default-radius is unused in favor of a service constant. AssertJ is already supplied by starter-test; Maven caching is configured twice; backend and root environment templates use different datasource conventions. No backend formatter/static-analysis plugin is configured. None of these is a reason for an architectural rewrite.

**Recommended fix:** Remove confirmed dead code or document concrete consumers, centralize validated configuration, simplify redundant build settings and add an affordable Java format/static-analysis check. Use explicit accessors/toString/equality for entities rather than broad @Data where it creates sensitive output, lazy-loading or mutable-identity surprises (B12). Keep interfaces where they support real boundaries rather than multiplying layers mechanically.

## OWASP coverage and non-findings

The following mapping uses [OWASP Top 10:2025](https://top10.owasp.org/2025/) as an awareness checklist, not a compliance certification or claim of exhaustive penetration testing.

| Category | Assessment |
| --- | --- |
| A01 Broken Access Control | Self/owner checks present; isolated cross-user mutations blocked. Preserve/test boundaries, B30/B34. No confirmed IDOR. |
| A02 Security Misconfiguration | Signing/cookie/DB/proxy/Actuator boundaries, B01/B03/B11/B29/B32. |
| A03 Software Supply Chain Failures | Unsupported/affected dependencies and missing scan/gates, B02/B31/B32. |
| A04 Cryptographic Failures | Known fallback key, environment separation and password-policy mismatch, B01/B05/B07. No plaintext password storage observed. |
| A05 Injection | Derived JPA queries, no native/dynamic SQL or shell execution found. Provider URLs are configuration-controlled, not caller-selected; no demonstrated SQL injection/SSRF. B08/B12/B13 remain validation concerns. |
| A06 Insecure Design | Abuse, lifecycle, data-trust and recovery gaps, B04/B05/B15/B18/B26/B27. |
| A07 Authentication Failures | Recovery/revocation/environment controls incomplete, B01/B04–B07. No client-selected administrator role. |
| A08 Software or Data Integrity Failures | Unverified provider-labelled snapshots, freshness and partial results, B13–B17/B23/B24. |
| A09 Security Logging and Alerting Failures | Sensitive logs and operating alerts, B12/B28. |
| A10 Mishandling of Exceptional Conditions | Error schemas, duplicate races, malformed provider data and budgets, B09/B10/B17/B19. |

No Java native object deserialization, template/script execution, upload handler, user-controlled server-side HTTP destination, administrative command endpoint, or intentional cross-user sharing surface was found. JPA entities are mapped to DTOs rather than returned directly. CORS is not treated as authentication. No evidence of live compromise, leaked real environment credentials, a complete clean secret history, or secure AWS account configuration is asserted. A full history secret scan, resolved-dependency/image scan, dynamic security test, and deployment review remain outstanding.

## Verification evidence and limitations

### Fresh backend checks

- Executed `./mvnw -o clean verify -B` from backend with the local Maven cache and Java 25.0.2; source/target is Java 21, so this does not replace a Java 21 CI check.
- Fresh compilation and Spring Boot packaging succeeded. **105 tests passed; zero failures, errors, or skipped tests.** Verify then failed the existing coverage gate: **429/696 lines = 61.64%, below 70%**. Testcase elements across Surefire XML confirm 105; nested suite root counters can be zero and should not be summed naively.
- H2 ran both migrations successfully. Flyway warned that the installed H2 2.3.232 exceeds its tested H2 version; this was not a migration failure. Local Jansi/Unsafe warnings are tooling/runtime compatibility observations.
- Packaged JAR libraries were inspected for the technology inventory. No complete dependency/SCA or image vulnerability scan was run; earlier offline plugin availability is not evidence of a scan. Current Spring support and targeted advisory applicability were checked against primary sources.

### Isolated audit probes

Temporary programs in `/private/tmp/nextsitrep-backend-probe` used existing packaged libraries/classes and a new in-memory H2 database, with external HTTP calls disabled/not invoked. They did not edit repository tests or contribute to the coverage figure above.

| Probe | Result |
| --- | --- |
| DTO validation with 300-char names/unsupported source/invalid website scheme/state | Zero validation violations for the tested cases; confirms missing constraints, not successful PostgreSQL insertion. |
| BCrypt 72/73-byte ASCII input | 72 accepted, 73 rejected after DTO minimum-length validation accepts it. |
| Credential/User generated string behavior | Synthetic password/hash marker included; no real credential printed. |
| Geocoding parser NaN/Infinity | Non-finite coordinates accepted without external network call. |
| Actual SavedResourceService + Hibernate/Flyway/H2 save | Returned savedAt/updatedAt null; committed entity timestamps present. |
| Actual notes update | Returned updatedAt did not match refreshed committed updatedAt. |
| Another account listing/update/delete | Other account list empty; notes update and deletion both rejected with SavedResourceNotFoundException. |

Not executed: full production Spring Security chain via HTTP, JWT forgery against any deployed app, real PostgreSQL concurrency/migration/restore, Docker startup/build, load testing, real VA/Nominatim calls, network/proxy/TLS tests, AWS account inspection, or destructive tests. Readiness findings explicitly identify these limits. Browser-specific frontend rendering was outside this audit.

## Prioritized remediation roadmap

| Phase | Priority / findings | Concrete outcome and acceptance evidence |
| --- | --- | --- |
| 1. Production security baseline | Critical/High: B01–B05, B11; coordinate B02/B31 | Startup rejects fallback/missing/weak keys and invalid production cookie config; independent dev/prod keys; supported patched BOM and visible scans; documented revocation policy; real ingress CSRF/CORS/cookie and unauthorized/tampered/expired-token tests. |
| 2. Trustworthy release verification | High: B30/B31; fixes B07–B10/B23 | CI executes clean verify and packaged artifact checks on Java 21; risk-focused tests satisfy the declared gate; timestamps/input/conflict responses verified with actual persistence; PostgreSQL migration checks added. Do this alongside each fix, not only after feature work. |
| 3. Resource integrity and graceful failure | High/Medium: B13–B19, B21 | Server-authenticated source identity; honest category and pagination semantics; source/fetch/verification/environment metadata; unknown distance preserved; malformed provider data distinct from empty results; quota-safe total deadlines and reporting/triage ownership. |
| 4. Private-data lifecycle and recovery | High/Medium: B06/B12/B22/B24–B27 | Minimized/redacted logs; consistent identity; account disable/recovery/export/deletion process; concurrency conflict protection and UTC semantics; encrypted access-scoped backups with a successful restore drill and documented RPO/RTO. |
| 5. Measured operational deployment | Medium: B20/B21/B28/B29/B32 | Short DB transactions, measured pool/query/request budgets, bounded lists/quotas, health/readiness and privacy-safe actionable alerts, private management/database boundaries, immutable non-root image, cost-reviewed isolated dev/prod deployment and rollback procedure. |
| 6. Maintainability improvements | Low: B33–B35 | Parse credentials once, simplify redundant lookups/config/tooling, preserve explicit ownership tests, remove dead broad query surfaces and add lightweight formatting/static analysis. |

For a small team, retain the conventional Spring/PostgreSQL design and keep the initial operating footprint small. Shared-origin routing, validated configuration, a DB-aware session containment policy, targeted tests, disciplined provider contracts and a tested restore procedure provide more immediate value than microservices or additional distributed infrastructure. AWS service selection and cost estimates should follow actual traffic, data sensitivity, availability and budget requirements; none was provisioned during this audit.

**Backend audit-only work is complete. Awaiting approval before implementation, dependency upgrades, configuration changes, migrations, or deployment actions.**
