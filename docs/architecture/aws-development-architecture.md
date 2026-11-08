# NextSITREP: AWS Development architecture decision proposal

Date: **2026-11-05** (America/New_York). Inspected revision: **a6a7fdc**, clean working tree at inspection. Status: **proposed; not approved or deployed**. Region assumption: **us-east-1**. Accounts, domains, workload sizes and budget are not verified through AWS APIs.

Read together: [cost comparison](aws-cost-comparison.md), [security acceptance checklist](aws-security-checklist.md), [deployment stages](aws-deployment-plan.md). Existing contracts: [H2-A](../../backend/CONFIGURATION.md) and [H2-B](../../backend/HTTPS_SECURITY.md). This review creates only planning documents. No application, environment, IAM, infrastructure, credential, deployment, commit or push operation is authorized by it.

## Executive recommendation

Choose **Option A for the first, restricted AWS Development deployment**, using one 4 GiB EC2 host, containerized Next, Spring and PostgreSQL, encrypted persistent storage, a controlled Caddy HTTPS edge and off-host backups. Limit access to named testers and **synthetic data**. App/database ports stay private. This is a learning/integration environment with an accepted single-host failure boundary, not a Production availability design.

Budget approximately **$36–48/month in AWS charges**, plus domain registration/renewal, for low traffic and continuous operation; see the assumptions and provisional rates in the cost document. The $30–40 goal is plausible near the lower end, not guaranteed. If $40 is a hard ceiling, schedule Development compute off outside testing, retaining/budgeting its disks, backups and IP. Do not save money by removing TLS, secrets protection or restore-tested backups.

**Choose B instead** if a database/restore/certificate owner cannot be assigned or if Development must hold real personal data. B costs approximately **$50–70/month** but provides a managed database recovery path. It is the recommended next step before Production. C adds orchestration and ingress/network fixed costs; defer it until its benefits justify roughly **$95–120/month** for the lower-cost non-HA variant or **$130–160** with private tasks and one NAT gateway.

The priority is controlled access and recoverability. A is acceptable only within the synthetic-data scope and after the checks below pass. Enterprise practice here means explicit ownership, isolation, reproducibility and tested recovery, not claiming a small single-AZ stack is highly available.

## Evidence: facts versus assumptions

| Classification | Finding | Repository evidence / consequence |
| --- | --- | --- |
| Confirmed | Next 16.1.1, React 19.2.3, TypeScript; Spring Boot 3.4.13 targets Java 21 | [frontend/package.json](../../frontend/package.json), [backend/pom.xml](../../backend/pom.xml). No version upgrade performed. |
| Confirmed | A running Next server is required now | [root layout](../../frontend/app/layout.tsx) calls await connection(); [proxy](../../frontend/proxy.ts) generates per-request nonces and private/no-store HTML. No output: export configuration. Static S3 hosting is not compatible with the current nonce implementation. |
| Confirmed | Browser API calls are relative /api/v1 paths | [API client](../../frontend/lib/api.ts). [Rewrites](../../frontend/next.config.ts) capture API_PROXY_TARGET during build; the current Docker default is http://backend:8080. Route ingress /api directly to Spring rather than sending normal API traffic through Next. |
| Confirmed | Hardened deployment groups and startup preflight exist | [profiles](../../backend/src/main/resources/application.properties), [deploy defaults](../../backend/src/main/resources/application-deploy.properties), [validator](../../backend/src/main/java/com/veteransconnect/config/StartupConfigurationValidator.java). AWS Development must select aws-dev, never local/dev/test. |
| Confirmed | Proxy trust is an exact literal-IP list, not CIDRs or global framework forwarding | [Tomcat configuration](../../backend/src/main/java/com/veteransconnect/config/TrustedProxyConfiguration.java). TRUSTED_PROXY_IPS must match the actual immediate peer. Keep server.forward-headers-strategy=none and the raw limiter trust flag false. |
| Confirmed | Non-secure deployed requests fail; private health is the HTTP exception | [HTTPS filter](../../backend/src/main/java/com/veteransconnect/security/HttpsRequirementFilter.java). Public ingress must block /actuator/*; local container probes can use exact /actuator/health. |
| Confirmed | JWT cookies are HttpOnly/host-only/path /; CSRF cookies are readable by JS and forced Secure for deployment | [AuthController](../../backend/src/main/java/com/veteransconnect/controller/AuthController.java), [SecurityConfig](../../backend/src/main/java/com/veteransconnect/config/SecurityConfig.java). No broad cookie domain, CSRF disablement or new authentication design is proposed. |
| Confirmed | PostgreSQL + Flyway V1/V2 + Hibernate validate | [migrations](../../backend/src/main/resources/db/migration), shared properties. JDBC TLS and database grants are not enforced by the existing validator. |
| Confirmed | Local Compose is not a cloud definition | [Compose](../../docker-compose.yml) pins local, publishes DB/admin/app ports and supplies local defaults. Create a separate reviewed deployment definition later; do not copy it into AWS unchanged. |
| Confirmed | Container delivery/hardening is incomplete | [backend Dockerfile](../../backend/Dockerfile) targets Java 21 but skips tests when packaging; [frontend Dockerfile](../../frontend/Dockerfile) uses floating Bun tags and copies the whole build tree. Neither declares USER. ARM64 runtime, container health/shutdown and Bun/Next proxy compatibility need actual image verification. Frontend .dockerignore does not exclude every possible secret-file variant. |
| Confirmed | CI is build/test CI, not an AWS delivery pipeline | [ci.yml](../../.github/workflows/ci.yml) omits frontend test:run and backend verify; no AWS OIDC/ECR/deploy job exists. [dependency workflow](../../.github/workflows/dependency-check.yml) is not a reliable blocking vulnerability scan. |
| Confirmed | Sensitive resource interests/identity can enter application logs | [search service](../../backend/src/main/java/com/veteransconnect/service/ResourceSearchServiceImpl.java) logs ZIP/category/keyword; [saved service](../../backend/src/main/java/com/veteransconnect/service/SavedResourceServiceImpl.java) logs email/resource details. Synthetic data only until minimization/redaction is reviewed. |
| Historical evidence, not rerun | H2-B recorded 214 passing backend tests, 78.85% coverage, 28 frontend tests and an unrelated formatting failure | backend/HTTPS_SECURITY.md. No new tests/builds/scans were run for this documentation-only review; do not use these numbers as proof of a current CI or container result. |
| User-provided, not independently verified | Organizations has Management and Development accounts; Production is planned | No account, SCP, IAM, region, billing or DNS inspection was performed. |
| Assumption | Small tester population, low traffic, database under 1 GiB, planned outages acceptable | Validate before implementation; no real veteran records, copied Production snapshots or public enrollment. |

Older [production readiness notes](../PRODUCTION_READINESS.md) proposed static hosting and report earlier defects/costs. Their static-hosting recommendation is superseded by the current nonce contract. Older CI/phase-summary documentation is also less authoritative than the actual current workflows. Nothing in this review establishes that AWS is already configured securely.

## Architecture comparison

| Dimension | A: one EC2, apps and PostgreSQL | B: one EC2 app host plus managed PostgreSQL | C: ECS Fargate plus managed PostgreSQL |
| --- | --- | --- | --- |
| Network boundary | One VPC host; only controlled HTTPS edge published; isolated app/data container bridges; off-host backups. | Same app ingress; RDS in private DB subnet group, SG and verified TLS boundary; host/container DB egress must be controlled. | Public ALB in two AZs, distinct Next/API task SGs, API sidecar-local trust, private RDS; public tasks with restricted ingress or private tasks with priced egress. |
| Cost, continuous Dev | About $36–48 AWS/month; self-managed DB labor is extra. | About $50–70; no hidden assumption of a free managed DB. | About $95–120 public-task or $130–160 private/one-NAT; full HA is higher. |
| Operational complexity | Few resources, but highest hands-on DB, CA, patch/backup/restore burden. | Moderate: host remains operated, DB patch/backup platform is managed; grants/TLS/restore still owned. | Highest initial networking/IAM/service/sidecar complexity; managed hosts and repeatable service rollout can reduce later host work. |
| Security tradeoff | Single root/host failure domain covers app and DB; acceptable only with approved restrictions, encryption and tested recovery. | App-host compromise no longer directly exposes DB disks; app credentials still expose allowed data. DB isolation/grants remain essential. | Strong per-service SG/role isolation is possible; sidecar trust and egress are additional controls to verify, not automatic benefits. |
| Backup/recovery | Logical dumps + consistent snapshots, off-host retention; proposed RPO <=24 h, RTO <=4 h, measured. | Automated backups/PITR + pre-change snapshots + tested export/restore; proposed RPO <=15 min/RTO <=4 h, measured against latest restorable time. | Same managed DB approach as B; ECS redeploy does not replace database recovery. |
| Availability/SPOF | Host, AZ and local database outage stop everything; EBS is AZ-bound. | App host remains a SPOF; modeled DB is Single-AZ and has maintenance/recovery downtime. | Modeled one task per service and Single-AZ DB are still SPOFs; ALB alone does not create end-to-end HA. One-NAT variant also concentrates egress. |
| Delivery | OIDC/ECR/SSM, immutable manifests, controlled stop/cutover and explicit migration job. | Same host delivery plus RDS migration/backup orchestration. | OIDC/ECR/ECS update, execution/task roles, target health/circuit breakers and a separate migration task. |
| Production migration | Verify logical migration into an independent private RDS; preserve images/config contracts in a new Production account. | Strong incremental Production starting point; add app redundancy and Multi-AZ DB if objectives require them. | Add >=2 tasks/service, Multi-AZ RDS and resilient egress; operate and fund the extra complexity. |
| AWS learning value | EC2/VPC/SG/EBS/IAM/SSM/ECR/DNS/monitoring and recovery fundamentals, with explicit DBA responsibility. | Adds RDS subnet/TLS/PITR/parameter-group practice while reducing host DB chores. | Adds orchestrator/service/ALB/ENI/task identity practice, but can distract from first-deployment fundamentals. |

Recovery objectives above are proposals, not promises from AWS or measured results. Security acceptance, costs and the migration details below are necessary for every option.

## Proposed A: boundaries and routing

```text
Management account: Organizations/billing/federated administration only
  (no application containers, DB, application secrets or daily deployment workload)

Approved test clients -- HTTPS dev.example.com --> Development account
  Route 53 dev hostname -> one EC2 Elastic IPv4
  VPC / one public app subnet / EC2 4 GiB (ARM64 candidate)
    SG: 443 from approved tester source CIDRs only; no SSH
        80 only for ACME challenge traffic, never app/API forwarding
    +--------------------------- EC2 host -----------------------------+
    | Caddy container: only published HTTPS edge; pinned bridge IP      |
    |   /api and /api/* --> Spring container :8080 (preserve path)      |
    |   all page/static paths --> Next container :3000                  |
    |   /actuator/* blocked at public ingress                           |
    |                                                                  |
    | Front bridge: Caddy + Next + Spring; no published Next/API ports   |
    | Data bridge: Spring + PostgreSQL; no Next/Caddy membership         |
    | Spring -- verify-full TLS --> PostgreSQL :5432                    |
    |                 PostgreSQL PGDATA --> separate encrypted EBS      |
    | Root/image/Caddy-state EBS: encrypted, separate from DB data       |
    | Host agent: SSM/ECR/log delivery/backup; no app Docker socket       |
    +------------------------------------------------------------------+
       | HTTPS egress via Internet Gateway (no NAT Gateway charge)
       +--> ECR, Secrets Manager, SSM, CloudWatch, S3 backups, providers

GitHub Actions -- OIDC, reviewed Dev role --> ECR + bounded SSM deployment
Off-host encrypted backups --> private Development S3 backup prefix/bucket
Production account (future): independent identities, secrets, DB and runtime
```

The hostname/IPs are placeholders; no ownership, VPC range or actual peer has been selected. Choose Docker subnets that do not overlap the VPC, VPN or existing networks. Give Caddy a stable literal bridge IP and verify Spring sees that address before setting its sole trusted peer. Separate networking allows Next to reach neither the database bridge nor a trusted Spring ingress identity. Drop NET_RAW/NET_ADMIN and other unnecessary capabilities; test inter-bridge and metadata isolation rather than assuming network names enforce everything.

**Ingress decision requiring approval:** omit CloudFront/ALB for the first restricted Dev host and use Caddy as the public controlled TLS edge. H2-B's application contracts remain unchanged; this replaces its example CloudFront-to-origin topology, which was never implemented. There is no external CDN-to-origin hop to encrypt in A. Approve this topology explicitly. If CloudFront is required by policy, add authenticated/restricted HTTPS to Caddy, origin access controls, canonical viewer-header processing and a separate cost/configuration review; do not simply trust CloudFront-looking headers or cache HTML.

Caddy owns certificate issuance/renewal for the real Dev hostname using a public ACME CA, with persisted encrypted certificate/account state. Public TCP 80 is only an HTTP-01 challenge endpoint; all non-challenge traffic is rejected, especially API writes. Review automatic redirect/challenge precedence before use. TLS-ALPN validation cannot work through a tester-only 443 allowlist without an alternative challenge path. If policy disallows public 80, approve a DNS-01 workflow and narrowly scoped DNS credentials instead. No browser certificate-warning bypass or insecure certificate-verification mode is acceptable. [Caddy automatic HTTPS](https://caddyserver.com/docs/automatic-https).

For a direct public edge, derive client identity from its socket, not incoming Forwarded/X-Forwarded-* headers. Clear untrusted metadata, then create a single canonical client IP and https scheme on the verified TLS listener. Reject unknown Host values. Preserve Host/Origin as needed for the public hostname, cookies, Authorization, X-XSRF-TOKEN and request data. Internal HTTP is limited to the same-host protected container bridges. External transport uses TLS. Only the Caddy source IP is trusted by Spring; an untrusted Next request claiming https must fail. Keep HSTS host-only; no includeSubDomains or preload. Forward application CSP unchanged, including nonces and the documented style-attribute exception. Never add a global JSON CSP to HTML or replace the document policy with an edge static policy.

## Runtime and data policy

| Concern | Required design, not yet implementation |
| --- | --- |
| Host access | SSM with federated human access/MFA, no inbound 22, encrypted volumes, IMDSv2 plus tested container metadata blocking. Containers get no AWS credentials or Docker socket. Host root/deploy role is a privileged security boundary. |
| Images | Build/test in CI; immutable image digests and release manifest. Verify Linux ARM64 for every image and Bun/Next SSR/crypto. Use x86 only with revised price approval if ARM validation fails. Pin AMI/image versions; build nothing on the small host. |
| Config | aws-dev; exact HTTPS CORS origin; frontend HTTPS_DEPLOYMENT=true only behind the controlled edge; JWT_COOKIE_SECURE=true; supported SameSite; positive bounded JWT lifetime. API_PROXY_TARGET is a build-time fallback, not a browser URL or secret. Preserve the same image across accounts when internal routing names remain stable. |
| Secrets | Four proposed Secrets Manager objects: JWT, app DB credential, provider credential, migration credential. Fetch at deployment/start through the host's bounded identity, not an application AWS SDK. Deliver only each service's required values, preferably via read-only configtree mounts on protected tmpfs, after testing Spring property precedence; env injection is an alternative with Docker-inspect/root exposure explicitly accepted. Never bake values or pass them in command arguments/logs. |
| IAM separation | Human federated administrator; infrastructure bootstrap/change role; CI ECR publisher; bounded deployment role; EC2 host-agent role. Scope every role to Dev resources. Host may need the four explicit Dev secret ARNs for release/migration orchestration; app containers have no IAM and receive only runtime secrets. Host compromise can expose co-located data/secrets, a deliberate A limitation. No DB master, Management or future Production access. |
| Database | No host-published 5432; encrypted EBS; SCRAM credentials, owned schema and DML-only application user. Separate migration role; never run app queries as postgres/superuser. Proposed engine: a currently supported PostgreSQL 17 patch/digest, contingent on Flyway 10.20.1/driver/schema integration testing; do not blindly replace local 15 or assume newer engines work. |
| Database transport | TLS required even on the bridge. Private Dev CA + server certificate whose SAN matches the JDBC hostname, CA trust mounted read-only, sslmode=verify-full, reject hostnossl connections and wrong clients. CA signing key kept off-host; private server key restricted to PostgreSQL. The validator does not enforce this policy, so prove both positive and wrong-CA/hostname/plaintext negative cases. See [pgJDBC verification](https://jdbc.postgresql.org/documentation/ssl/). |
| Schema lifecycle | Dedicated pre-deployment migration step using the release's V1/V2/future SQL. Keep Flyway enabled/clean disabled and Hibernate validate on the API. Prove runtime startup works with pre-applied migrations under restricted grants and fails safely for unexpected pending changes. No migration job or role separation exists yet; resolving it is a deployment blocker, not permission to disable Flyway or grant permanent app DDL. |
| Logs/data | Synthetic-only records/searches. Bounded container logs, encrypted CloudWatch groups, short retention and scoped operator access; no bodies/tokens/cookies/query strings in access logs. Application logging findings remain open for real data. |

Secrets Manager's storage and rotation are separate from refreshing containers, updating a DB password and invalidating JWT sessions. JWT rotation requires restarting all affected issuers/verifiers and invalidates old sessions; never roll back to the known fallback. Coordinate DB secret/server-password changes and restart pools. Test certificate renewal/CA rollover and provider rotation. Root-readable Docker environment metadata may persist on encrypted host storage even if an injection file was temporary.

## Capacity, persistence, health and recovery

Use a pinned, maintained Amazon Linux 2023 ARM64 AMI candidate with verified SSM-agent/Docker support and a patch/replacement owner. Start with **2 vCPU / 4 GiB**; this is a measurement candidate, not validated capacity. Initial memory envelopes: Spring 1280 MiB (heap about 640–768 MiB, native/thread overhead measured), Next 768 MiB, PostgreSQL 512–640 MiB, Caddy 128 MiB, host agent 128 MiB, roughly 512 MiB OS and 256 MiB transient backup headroom. Limit total allocation and leave safety margin; measure startup, nonce SSR, GC, provider timeouts and backups together. Propose PostgreSQL shared_buffers 128 MiB, small work_mem and a bounded connection budget consistent with Hikari/migration/backup clients; validate actual limits. Bun heap controls must be verified rather than assuming Node flags apply. Do not overlap two complete releases on this host or build images there. CPU-credit/burst behavior needs load testing and a deliberate Standard/Unlimited cost decision. Raise capacity/budget if tests fail; do not remove protections to fit 2 GiB.

Use 20 GiB encrypted root plus a separately retained 20 GiB encrypted DB volume initially. Mount the DB disk by stable identity; fail service startup if the expected mount is absent instead of initializing an empty replacement database. Preserve PGDATA/engine compatibility across replacements. A retained volume is not a backup and EBS is AZ-bound.

Use private DB pg_isready plus real TLS/query checks; API /actuator/health internally plus a synthetic authenticated transaction for readiness; Next page/nonces and full browser API probes. Probe failures must stop release completion. Public health routes do not expose /actuator. Dependency readiness must test actual sandbox credentials and controlled failure behavior; current health is not proof of provider availability.

Proposed A recovery targets for approval: **RPO <=24 hours while writes are allowed**, **RTO <=4 hours**, measured by drill, not guaranteed. Nightly and pre-release logical dumps, role/grant metadata and migration state go encrypted to an off-host private S3 prefix; retain 14 days initially with lifecycle/size caps. Quiesced/application-consistent EBS snapshots supplement dumps, not replace them. Restore to a fresh isolated host/database before first deployment acceptance and monthly thereafter, verify row counts/ownership/Flyway/Hibernate/TLS/app flows, record timings, and restrict/delete approved temporary restore resources. Backups share the Dev account initially; account compromise is not fully isolated. Review cross-account immutable recovery for Production.

Release rollback selects prior frontend/backend digests plus compatible nonsecret config. Use a short maintenance/cutover window; no claim of zero downtime. Retain the DB and validate schema compatibility before old code starts. Destructive/incompatible migration recovery needs an explicit restore plan and accepted loss of post-backup writes; no automatic down-migration or stale-secret restoration.

## B and C: implementation boundaries and Production migration

**B — same EC2 app host, private RDS PostgreSQL.** Keep Caddy/Next/Spring ingress and exact peer trust. Place encrypted Single-AZ RDS in a private DB subnet group spanning two AZs, with no public DB address; 5432 only from the app/migration security identities. Apply container egress controls too: an EC2 SG cannot distinguish bridge containers sharing its ENI. Use an RDS endpoint, maintained CA bundle, verify-full and enforced database TLS. Enable seven-day automated backups/PITR, pre-change snapshots and tested restore. App host and Single-AZ DB still have failure/maintenance downtime. OIDC/ECR/SSM delivery remains the same; DB operations become managed. Move A's synthetic data via verified logical restore; before Production build an independent managed DB, do not promote the Dev DB or its secrets. [RDS TLS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.SSL.html), [RDS backups](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.html).

**C — ECS Fargate + private RDS + ALB.** Use two services: Next in one task; Spring plus a metadata-normalizing proxy sidecar in another. ALB HTTPS/ACM sends /api and /api/* to the API sidecar and pages to Next. Task SGs accept only the ALB SG on target ports; API's Spring listener is loopback-only. Inside the API task, the sidecar is a stable loopback peer for TRUSTED_PROXY_IPS; do not whitelist dynamic ALB/task IP ranges in Spring or enable global forwarding. A sidecar must validate the ALB-only ingress boundary and normalize appended forwarding metadata; do not trust a viewer's leftmost XFF. Next is not co-located in the trusted API loopback namespace. [Fargate networking](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-task-networking.html), [ALB forwarding](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/x-forwarded-headers.html).

Model two 0.5-vCPU/2-GiB tasks initially, subject to sizing. Lower-cost C uses public-subnet task IPs for outbound internet, with ingress still restricted to ALB; a public IP is not permission for arbitrary inbound traffic. Private C needs NAT for provider calls or a separately verified egress design; private endpoints alone do not reach VA/Nominatim. Keep RDS private in both. Use scoped ECS execution roles for image/log/secret delivery, minimal/no app task roles, separate migration task and bounded deployment PassRole. Rolling services/circuit breakers improve rollout handling but one task/service and Single-AZ RDS are not HA. C's Production path requires >=2 tasks/service across AZs, Multi-AZ DB, resilient egress and larger budget. No sidecar/task definitions exist today.

For A/B, Production migration is a separate account bootstrap and gated release, not a profile flip on the Dev host. Favor B initially if modest downtime is acceptable, or C's expanded multi-AZ variant once recovery/availability requirements and cost are approved. Promote the tested image digests; create Production-specific domains, roles, secrets, data stores, backup policies and trust settings. Revisit the process-local limiter before scaling replicas.

## Approval decisions

1. A restricted synthetic-only Dev, or B with a higher budget; named DB/restore operator and data policy.
2. Region, real domain/DNS owner, approved tester source ranges and public ACME challenge method; direct Caddy edge versus adding CloudFront.
3. Continuous $36–48 AWS budget versus scheduled operation, plus domain costs; whether $30–40 refers to Dev alone or future combined accounts.
4. RPO/RTO, retention, same-account backup risk, maintenance windows and capacity fallback.
5. PostgreSQL engine/digest, TLS CA/renewal ownership, role/migration design and runtime certificate trust.
6. IaC/tooling owner, GitHub repository/environment trust scope, IAM/SSM privilege review and secret delivery mechanism.

All are proposals. Approval of these documents is not permission to provision or deploy; subsequent implementation and deployment need explicit authorization.
