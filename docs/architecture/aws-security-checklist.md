# AWS Development security acceptance checklist

Date: **2026-11-05**. Status: planning only. Every cloud checkbox is **unverified**. Account existence is user-provided context; no AWS identity, configuration or resource was inspected. Scope is the restricted synthetic-only Development design in the [architecture proposal](aws-development-architecture.md), not Production authorization.

Priority: **Critical** = prevent credential/data compromise or wrong-account deployment; **High** = mandatory before Dev acceptance unless an explicit bounded exception is approved; **Medium** = operational improvement with named owner/date. An unchecked box is not evidence of a deployed vulnerability. Gate owner must attach evidence, reviewer and date; never attach secret values.

## Confirmed foundations, not proof of cloud readiness

C1 JWT key checks, H1 relative shared-origin routing, H2-A hardened profiles and H2-B nonce headers/HTTPS/exact-IP proxy guards are present in current source. Read [CONFIGURATION.md](../../backend/CONFIGURATION.md) and [HTTPS_SECURITY.md](../../backend/HTTPS_SECURITY.md). They do not prove AWS TLS, IAM, secret delivery, backups or networking. Historical tests must be rerun by the future delivery gate.

## Critical: identity, isolation and data scope

- [ ] Verify the intended Development account ID/region through the approved federated session and block mismatches in future IaC/deployment jobs. Management hosts no application workloads; Production does not exist by assumption until separately verified/created with approval.
- [ ] Define named testers, synthetic fixtures and ownership. No real veteran identity, support interests, notes, copied Production data or production credentials. Keep enrollment unreachable to the general public using the approved tester ingress allowlist; domain naming alone is not access control.
- [ ] Use federated human access with MFA and protected break-glass procedures. No root daily operations, long-lived GitHub AWS keys, permanent developer access keys or app-container AWS credentials.
- [ ] Scope OIDC audience to sts.amazonaws.com and subject to the exact approved repository/GitHub Development environment. Restrict protected branches/reviewers and deployment concurrency. PR/fork validation gets no deployment role. [AWS OIDC guidance](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-idp_oidc.html).
- [ ] Separate infrastructure/bootstrap, ECR publish, bounded host deployment, host-agent and restore identities. Deployment through SSM/Docker is privileged; restrict target instance tags/account and an owned document/parameters. No unrestricted RunShellScript/* or iam:* role attached to CI.
- [ ] Host permissions are exact Dev secret ARNs, approved image repositories, log groups and backup prefix, plus reviewed SSM agent needs. App containers have no Docker socket, privileged mode or metadata path. Prove IMDSv2 and container metadata blocking; hop limit alone is not a complete boundary.
- [ ] Review the complete effective policy union, permission boundaries and SCPs. AmazonSSMManagedInstanceCore includes wildcard GetParameter/GetParameters; adding a narrower Allow does not remove it. Do not put unrelated plaintext/decryptable secrets in that reach. Baseline secrets use explicitly scoped Secrets Manager access. [Managed-policy evidence](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonSSMManagedInstanceCore.html).

## Critical/High: ingress, TLS and proxy trust

- [ ] Select/own the real Dev hostname and validate a public CA certificate before application use. No self-signed browser exception, TLS verification disablement or cleartext public application route.
- [ ] A/B SG: public 443 only from approved tester CIDRs; public 80 is ACME-challenge-only at Caddy, never API forwarding. No inbound SSH, 3000, 8080, 5432 or 5050. Check IPv6 separately if enabled; no accidental dual-stack bypass.
- [ ] Deny all non-challenge HTTP requests, including POST/PUT/PATCH/DELETE, before credentials or bodies reach Spring. Test Caddy automatic redirect/challenge precedence. HSTS/upgrade-insecure-requests alone are not TLS enforcement.
- [ ] Bind/publish only the controlled proxy listener; Next/Spring/Postgres remain internal. Keep Caddy admin interface private. Reject unknown Host and public /actuator/* paths. Test direct IP/origin/app-port access from outside the approved boundary.
- [ ] For direct Caddy, discard caller-supplied Forwarded, X-Forwarded-*, X-Real-IP and create fresh scheme/client metadata from the TLS socket. Preserve the public Origin, path, method, cookies, auth and CSRF header. Never trust a caller's first XFF item.
- [ ] Assign a stable Caddy bridge peer, observe the actual address Spring receives, and use only exact literals in TRUSTED_PROXY_IPS. No private CIDR, hostname, wildcard or native/framework global forwarding override. Next is not an approved peer. Prove an unlisted source claiming https is rejected.
- [ ] Verify aws-dev activates deploy, HTTPS requirement is true, Secure cookies cannot be overridden false, server.forward-headers-strategy stays none, and AUTH_RATE_LIMIT_TRUST_FORWARDED_HEADERS stays false. Missing credentials/trust/HTTPS origins must prevent startup without value disclosure.
- [ ] Next HTTPS_DEPLOYMENT=true only behind verified HTTPS-only ingress. Browser API requests remain same-origin /api/*, with no API hostname in client bundles and no fallback through an untrusted Next peer.
- [ ] Verify public document CSP nonce equals every authorized script nonce, changes per response and cannot be supplied by a client. No production script unsafe-inline/eval; only documented CSS-attribute exception. HSTS contains neither includeSubDomains nor preload. Check nosniff/referrer/permissions/frame headers on successes and errors.
- [ ] Cache no nonce HTML/RSC/private API/error data across viewers. A/B Caddy has no HTML cache; any future CDN needs explicit policies. Static export is not allowed with this implementation. Immutable hashed static assets may cache.
- [ ] Verify session cookies are Secure/HttpOnly/host-only/path / and correct SameSite/expiry; CSRF cookie is Secure/host-only/readable, with cookie/header handshake intact. Test missing/tampered CSRF, forged/expired JWT, logout, cross-user access and no shared cookie domain across accounts.
- [ ] If C is selected: ALB SG alone can reach target ports; two separate tasks/services keep Next out of the API task's loopback trust boundary. API sidecar strips/normalizes ALB metadata and Spring trusts only verified local sidecar peers. Do not directly whitelist changing ALB addresses or trust all private space. Task/public/NAT egress model must match the approved price estimate.

## High: database, secrets and persistence

- [ ] Select a supported PostgreSQL engine/patch and verify Flyway 10.20.1, JDBC and actual migration SQL against it. Local postgres:15 tag is not an approved AWS engine choice; do not upgrade a populated data directory by changing a major image tag.
- [ ] A uses separate encrypted retained EBS with mount verification and guarded initialization; absence of its mount must fail startup, not create an empty DB. Test reboot/host replacement. RDS B/C is encrypted, private/no public address, with DB SG restricted to app/migration identities.
- [ ] Enforce PostgreSQL TLS with sslmode=verify-full, correct CA chain and hostname. Reject wrong CA/name and plaintext attempts. Do not substitute require/disable or a non-validating factory. Restrict pg_hba/SG and database egress appropriately. See [pgJDBC](https://jdbc.postgresql.org/documentation/ssl/) and [RDS TLS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.SSL.html).
- [ ] Runtime DB user cannot create/drop schemas or act as superuser; migration identity is separate. Pre-apply the release migrations under the approved job, then prove API startup under restricted grants with Flyway enabled, clean disabled and Hibernate validate. Unexpected pending migrations must fail the release, not trigger broader runtime grants.
- [ ] Four proposed Dev secrets are separately scoped and never shared with Production. Master/CA-signing material stays out of ordinary application containers. Select/test runtime mapping, root/UID permissions and read-only mounts; do not bake .env files into images or expose secrets to Next/browser builds.
- [ ] Record secret/certificate rotation owners and test JWT session invalidation, DB password/pool refresh, provider credential changes and CA renewal. Secret-store rotation does not itself restart a process or alter a DB password. Never restore a leaked legacy JWT key for rollback.
- [ ] Prove encrypted off-host backup upload, age/failure alerts and restoration to a fresh isolated DB. A target RPO <=24 h/RTO <=4 h is only accepted after a timed drill. Include grants, ownership, Flyway history and app flows. B/C test PITR/manual snapshot recovery and monitor actual latest-restorable time.
- [ ] Keep backup writer permissions separate from deletion/lifecycle policy changes. Restrict restore readers; versioning/retained disks do not equal immutable/account-isolated backups. Same-account recovery limitations are explicitly accepted for synthetic Dev only.

## High: delivery, runtime and observability

- [ ] Use reviewed IaC and separate Dev state/locks, encrypted and access-controlled; no state/secrets in Git. No AWS infrastructure is implemented by these docs.
- [ ] Future CI runs backend Java 21 clean verify with 70% gate; frontend frozen install/test:run/types/lint/format/build; effective lock-aware dependency/image scanning and provenance. Resolve actual failures rather than suppressing them. Historical H2-B results are not current CI evidence.
- [ ] Build exact target-architecture images and smoke-test Docker startup, Bun/Next proxy crypto/SSR, Java 21, signals, read-only/non-root operation, resource caps and health checks. Exclude every secret-file variant from build contexts. Pin base images/versions and deploy digests, not floating tags or host builds.
- [ ] Drop unnecessary capabilities, set no-new-privileges, bounded PIDs/logs/tmp files and service-specific file ownership. No NET_RAW/NET_ADMIN in app containers. Prove Next cannot access DB/metadata or become a trusted proxy through network spoofing.
- [ ] Measure 4 GiB startup/SSR/JVM/native memory/PG/backup workload. Avoid overlapping full releases. Observe CPU credits, disk capacity/inodes, DB connections and backup duration. If it does not fit, approve more capacity instead of weakening controls.
- [ ] Do not export tokens/cookies/passwords/request bodies or identifying query strings to access logs/SSM/CI output. Current INFO application logging contains email/resource/ZIP/query data; real data is blocked until minimization/redaction and retention are reviewed. Synthetic-only tests do not establish privacy readiness.
- [ ] Enable bounded encrypted log retention and a small explicit metric set. Alert on EC2 status failure, disk pressure, sustained memory/CPU credit pressure, backup age/failure and certificate expiry. Document expected scheduled-off periods; missing backup evidence during active writes is an incident.
- [ ] Validate VA sandbox credentials/endpoints and ownership of the Nominatim contact identity, required attribution and quota policy. Use stubs for load/failure tests; do not stress public providers or infer their health from actuator. Public exposure/traffic remains blocked until unresolved abuse/provider controls are reviewed.
- [ ] Capture a release manifest, previous image/config versions, verified pre-change backup and rollback test. Do not automatically down-migrate the DB or roll back valid secrets to exposed values. Schema-incompatible rollback requires an explicit restore/loss decision.

## Open blockers and approval register

| Priority | Confirmed gap or unverified condition | Required resolution |
| --- | --- | --- |
| High | No reviewed AWS-specific proxy/IaC/runtime/secret/backup/deployment definition in repository | Approve the design, then implement/test a distinct Dev stack; do not reuse local Compose. |
| High | Delivery pipeline lacks backend verify/frontend tests/effective vulnerability gate | Separate approved CI remediation and current evidence, including Java 21 and target container architecture. |
| High | ARM64/Bun/Next/runtime capacity, DB TLS/roles and restore are unverified | Pass image/network/migration/restore acceptance; resize or choose B if ownership/capacity is inadequate. |
| High | Real-data privacy/resource-abuse/provider findings remain outside H2-C planning | Restrict to approved synthetic testers. A public beta/real-data deployment requires separate remediation approval. |
| High | Domain, tester allowlist, CA/cert owners, actual AWS guardrails and prices unknown | Named decisions and evidence before provisioning. No claim that an existing AWS account is insecure. |
| Medium | /docs is ignored by current .gitignore | Files are delivered at the requested path but not visible as ordinary untracked Git files. Decide separately whether to version them; no ignore rule, staging, commit or push was changed. |

Required sign-off: architecture/data owner, AWS/IAM operator, database/backup owner and cost owner. A small team may combine people, but must still record review, risk acceptance, recovery ownership and the explicit authorization for subsequent implementation/deployment.
