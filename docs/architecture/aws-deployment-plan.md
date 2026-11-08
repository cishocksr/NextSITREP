# AWS Development staged deployment plan

Date: **2026-11-05**. Status: **proposal only; no stage has been executed**. Reading or accepting this plan does not authorize AWS provisioning, credentials, source changes, deployment, commit or push. Request separate approval for implementation and then deployment of concrete reviewed results.

Baseline: revision a6a7fdc, Next SSR/nonce proxy, Spring Java 21-targeted API, PostgreSQL/Flyway, C1/H1/H2-A/H2-B. Read the [architecture decision](aws-development-architecture.md), [cost model](aws-cost-comparison.md), [security checklist](aws-security-checklist.md) and existing backend security guides first. Default path below is Option A, restricted synthetic-only Development; B/C deltas follow.

## Stages, owners and evidence

Each stage needs an owner, reviewer, dated evidence and a go/no-go decision. No cloud box is pre-checked.

### 0. Architecture/data/cost approval — owner + AWS operator

- [ ] Approve A versus B; name the database/backup/certificate operator. A is not approved for real personal data or general public enrollment.
- [ ] Confirm Development account ID, allowed region, Organizations guardrails, federated admin/MFA, actual domain/DNS owner and tester source ranges. Production is a separate later account; Management is not a runtime target.
- [ ] Approve direct Caddy HTTPS edge (no CloudFront initially), or request a separately costed protected CloudFront origin variant. Approve ACME HTTP-01 challenge-only port 80 or a controlled DNS-01 alternative.
- [ ] Save a fresh regional Calculator estimate with current EC2/RDS prices, mandatory organization services and domain costs. Approve continuous A's $36–48 AWS envelope or a restricted runtime schedule if $40 is a hard cap.
- [ ] Agree synthetic fixtures, proposed 24-hour active-write RPO / four-hour RTO, 14-day dump retention, backup-account limitation, maintenance window and incident owner. These are objectives to measure, not guaranteed service levels.
- [ ] Decide how to retain/version these requested planning files: /docs is currently ignored. Leave .gitignore and Git history unchanged during this review.

Exit: recorded decisions, not resource creation.

### 1. Repository/release preparation — application + DevSecOps owner (future approved work)

- [ ] Resolve actual CI failures and change the future gate to Java 21 clean verify (including 70% JaCoCo), frontend frozen install/test:run/type/lint/format/production build and effective dependency/image scans. Do not mistake dependency:tree/outdated output for vulnerability scanning or suppress scan errors.
- [ ] Validate Docker runtime, architecture and hardening. Pin image/AMI digests; exclude all secret-file variants; use non-root service UIDs/read-only filesystems where compatible, writable temporary mounts, capability/PID/resource limits and graceful SIGTERM. Verify the Bun/Next nonce/proxy runtime rather than assuming the local Node result proves the container works.
- [ ] Build on CI, not EC2. Verify ARM64 4 GiB candidate and add an explicitly priced x86 fallback if required. No selected container/host architecture is yet certified by this plan.
- [ ] Implement a separate AWS Development runtime definition; never use local Compose's profile/credentials/port exposure. Define two isolated bridges and a fixed proxy peer with non-overlapping ranges; prove actual socket identity and inter-bridge/metadata controls.
- [ ] Create a reviewed migration entry point using the same Flyway version and exact release SQL. The current POM has no dedicated migration-job delivery workflow; do not invent an existing command. Test bootstrap, no-pending startup under DML-only app credentials and failure under schema drift/pending incompatible changes. Keep Flyway enabled and Hibernate validate.
- [ ] Prepare proxy/certificate/health/shutdown/backup/restore and release/rollback definitions. Review HTTP challenge versus redirect/API rejection behavior, unknown Host rejection, forwarding normalization, no public actuator, and unchanged CSP/cookie forwarding.

Exit: reviewable implementation changes and image/test evidence. These changes require their own authorization; none are implemented by this documentation task.

### 2. Dev-only IaC and identity foundation — AWS operator

Recommended implementation tool: Terraform with a small reviewed Dev stack and separate per-account encrypted/locked state, or an explicitly chosen equivalent CDK/CloudFormation design. Avoid multi-account abstraction frameworks before the first verified stack. IaC stores secret ARNs/config references, not secret values; marking a variable sensitive does not make a plaintext state file safe.

- [ ] Separately approve the concrete IaC plan and bootstrap of its state/roles. Assert account/region before every apply/deploy step. Scope changes to Development; inspect existing org trail/SCP behavior instead of assuming it.
- [ ] Define Dev VPC/subnet/IGW, SGs, EC2 instance profile/SSM administration, encrypted root/data volumes, DNS/EIP, ECR repos, private backup bucket/lifecycle and bounded log/metric/alert resources.
- [ ] Data volume survives instance replacement, is mounted by stable identity, and is verified before PostgreSQL starts. No implicit initialization into an unmounted directory. Encryption and snapshot ownership/retention are explicit.
- [ ] Scope GitHub OIDC to the approved repository/environment/audience and protected branch policy. Give only the deployment job id-token permission. Separate ECR publishing from host deployment and infrastructure privileges; restrict SSM to an owned deployment document and intended Dev host. Record that Docker/host deployment access is effectively privileged.
- [ ] Review actual role policy unions, including SSM-agent parameter reads. Limit ECR/log/backup/secret ARNs and KMS context where needed; no future Production/Management access. App containers have no instance credentials or Docker socket; prove IMDS access blocking.
- [ ] Set cost/availability/backup/certificate alerts and their recipients before allowing ongoing workloads. No automatic destruction of persistent DB data for budget enforcement.

Exit: approved implementation output, resource inventory and identity evidence. This plan has not created any of them.

### 3. Secret, certificate and PostgreSQL bootstrap — platform + DB owner

- [ ] Select supported PostgreSQL patch/digest after a real integration test. Restore-compatible major engine is part of the release contract; changing an image tag is not a data upgrade.
- [ ] Establish the Dev database CA/server certificate and client trust with exact DNS SANs; keep the signing key off-host. Enforce TLS and SCRAM and reject plaintext. For B/C, use private RDS, enforced SSL and the maintained RDS CA bundle instead.
- [ ] Create DB/schema ownership and restricted app/migration roles through the separately authorized bootstrap process. No superuser app credentials. Validate grants, history-table access, backup roles and restore ownership.
- [ ] Authorized operators populate account-local secret objects through a secure channel later. Do not put values into Terraform state, Git, CI logs, command arguments, images or the frontend. No secret values are generated or set by this review.
- [ ] Test host retrieval/delivery using the bounded host identity. Prefer protected tmpfs/read-only configtree mounts if property precedence/UID permissions work; otherwise explicitly review environment injection and Docker root/metadata exposure. Inject each service only its needed values; bootstrap/migration files are removed after the approved operation.
- [ ] Obtain a valid public Dev certificate with persisted ACME state and verify renewal/expiry alerting. Challenge handling may be public, but ordinary application routes are limited initially to the operator IP.

Configuration contract to populate later (names only):

| Consumer | Required configuration |
| --- | --- |
| API | SPRING_PROFILES_ACTIVE=aws-dev; explicit DB URL/user/password; random Dev JWT_SECRET; exact public HTTPS CORS_ALLOWED_ORIGINS; JWT_COOKIE_SECURE=true; bounded expiration; approved SameSite. |
| Proxy trust | TRUSTED_PROXY_IPS is the observed fixed Caddy peer; server.forward-headers-strategy=none; AUTH_RATE_LIMIT_TRUST_FORWARDED_HEADERS=false; deployment HTTPS requirement remains true. |
| Next | HTTPS_DEPLOYMENT=true behind the controlled edge. API_PROXY_TARGET is captured at build; retain stable internal naming and route actual browser /api paths directly at Caddy. No JWT/DB/provider secret enters Next. |
| PostgreSQL | TLS enabled/enforced, hostname-valid certificate, restricted clients/users, separate retained PGDATA mount and backup/restore identities. JDBC uses verify-full with a mounted CA trust path. |
| Providers | Account-appropriate VA sandbox key/endpoint and validated contact/usage policy. Do not run load tests against public Nominatim/VA. |

Equivalent external Spring property sources are acceptable after precedence testing; this table does not change any existing environment value.

Exit: secure injection/rotation and positive/negative TLS evidence, no public tester expansion yet.

### 4. Build and controlled deployment — CI/deployment owner

Proposed workflow, not an existing capability:

```text
PR: compile/test/types/lint/format/security scans (no AWS deploy identity)
  -> reviewed protected commit
  -> build target-architecture images once + SBOM/provenance + scan
  -> OIDC publisher pushes immutable ECR digests
  -> reviewed GitHub Development environment approval
  -> bounded OIDC deploy role invokes owned Dev SSM document
  -> host pulls approved release manifest, takes verified pre-change backup
  -> maintenance window, explicit migration job, start restricted API/Next
  -> private health + HTTPS/shared-origin/security/browser probes
  -> record result; accept or restore prior compatible release
```

- [ ] Release manifest includes commit, image digests, proxy/nonsecret config version, migration checksums, platform and secret/certificate version references only. No plaintext secrets.
- [ ] Bounded deployment document verifies approved image repositories/digests and account/instance, with no arbitrary shell parameter. ECR/SSM role compromise is treated as a privileged incident, not a low-risk CI token.
- [ ] Save prior manifest and a verified off-host backup. Stop old app containers in a short maintenance window rather than overlapping two full releases on the 4 GiB host. Keep DB service/storage stable except for deliberate DB maintenance.
- [ ] Run the approved migration job under its separate DB credential; then start API with app DML identity and preserve Flyway startup validation. If that role cannot start without DDL or history-table write privileges, stop and review the exact minimum grants; never disable migration/schema checks to proceed.
- [ ] Start Next/proxy with verified TLS/canonical forwarding; keep paths/queries/cookies/CSRF headers intact. All public nonce HTML remains private/no-store. Do not replace nonce policy at an edge or silently serve a static export.

Exit: immutable release evidence and only controlled operator access for acceptance.

### 5. Security and functional verification — reviewer

- [ ] From approved and unapproved networks, verify SG/IPv6 boundaries, no public 22/3000/8080/5432/5050 or actuator, and correct domain/certificate/renewal state.
- [ ] HTTP API writes fail before auth; spoofed Forwarded/XFF/XFP/host data cannot bypass HTTPS or choose identity. Trusted metadata from the real Caddy peer works; an untrusted Next/backend connection does not. No broad private-IP trust is enabled.
- [ ] Browser login and registration use synthetic fixtures through the exact public origin; session cookie is Secure/HttpOnly/host-only, CSRF cookie Secure/readable, and writes require the matching header. Test malformed/expired/forged JWT, missing/tampered CSRF, exact CORS and two-user resource ownership.
- [ ] Logout clears the cookie. Current stateless JWT logout is not server-side token revocation; record that existing limitation and its separate remediation decision rather than claiming a replayed token must already be revoked.
- [ ] Verify nonce/header/script matching on pages and 404s, fresh nonce per document, no cross-viewer HTML/API cache, current allowed CSS-attribute exception, no production eval/inline-script allowance, no HSTS preload/includeSubDomains. Exercise navigation/resource search/saves/notes/logout and error states.
- [ ] Verify database encrypted transport through the actual container path and reject wrong CA/hostname/plaintext. Confirm app grants cannot DDL, migration/Hibernate history match and DB access is denied from unauthorized networks/services.
- [ ] Use provider stubs for concurrency/timeouts/failure tests and tightly controlled sandbox integration tests for real provider correctness/quota/attribution. Synthetic data and logs remain non-identifying. Existing logging/resource/abuse findings are not closed by cloud networking.

Exit: all required security checklist evidence attached. A failed security boundary stops rollout; no temporary protection disablement is an acceptance method.

### 6. Capacity, restore and rollback drill — operations/DB owner

- [ ] Measure startup and steady RSS, JVM native/heap/threads, nonce SSR latency, CPU/credits, PG connections, disk/inodes, logs and backup IO. Keep no-overlap release assumptions. Approve larger capacity if margins fail.
- [ ] Restore an off-host dump onto a fresh isolated database/host and validate record counts/ownership/constraints/Flyway/Hibernate/TLS/app workflows; measure the approved RPO/RTO. An existing EBS volume or untested snapshot is not sufficient evidence.
- [ ] Exercise host failure/replacement and missing-mount refusal; data must not be overwritten by an empty initialization. Simulate backup failure/stale success and certificate expiry signals; alerting must work outside the failed host.
- [ ] Roll back a compatible image/config manifest without touching the retained DB. For an incompatible migration, rehearse the approved restore decision, including downtime and loss of writes after the restore point. Never automatically down-migrate/drop schema or restore a leaked JWT secret.
- [ ] Securely clean up only the explicitly approved temporary drill resources and retain evidence. Do not delete production-like persistent data automatically because a budget threshold is reached.

Exit: timed recovery and repeatable delivery evidence, not just health=UP.

### 7. Development acceptance and ongoing operations — named owner

- [ ] Expand HTTPS access only to named tester ranges; confirm no general public enrollment. Publish synthetic-data rules and support/incident ownership.
- [ ] Record actual resources, monthly forecast, rollback manifest and restore evidence. Review spend after one week and one month. Adjust the quote if image/log/data/backups grow.
- [ ] Patch/rebuild on a defined cadence, rotate secrets/certificates through tested runbooks, restore monthly and after significant schema/backup changes. Alert on host/disk/backup/certificate/credit failures.
- [ ] If scheduled operation is selected, stop only after a verified backup and graceful DB/app shutdown; reconcile alerts and certificate renewal windows with the schedule. EBS, EIP, secrets and retention costs continue. No writers while stopped.
- [ ] Keep Management/Production credentials/data/state/roles out of Dev. Do not relax profile, JWT, CSRF, HTTPS, TLS or forwarding controls to resolve an operational issue.

## B/C deltas and Development-to-Production promotion

B replaces the local DB with encrypted private RDS, approved DB subnet/SG/CA/parameter group and managed backups/PITR. Snapshot/PITR restore creates a replacement endpoint/config; prove the application reconnects with hostname verification. Keep app-host health/SSM/migration/rollback controls. Single-AZ DB is not an availability upgrade to Multi-AZ by implication.

C replaces host orchestration with ECS execution/task/deployment roles, ALB HTTPS/ACM, target health checks, separate Next and API+proxy tasks, circuit-breaker/rolling releases and a separate migration task. Dynamic ALB IPs must not enter Spring's allowlist; the API sidecar remains its loopback trust boundary, with ALB-only SG ingress and normalized headers. Public-task or private/NAT egress choice must match the cost model. ALB health checks need an internal route to health while listener rules block that route from public requests. DB stays private. A successful ECS rollout is not database rollback or proof of end-to-end browser security.

Production is a later, separately authorized account/stack and data-onboarding decision. First prove Development. Before Production: resolve real-data logging/privacy/session/resource/abuse findings, select availability/recovery objectives, obtain a new capacity/HA budget, prefer managed PostgreSQL and tested backups, create account-local credentials/certificates/config and deployment roles, and approve access/incident procedures. Promote the same tested app digests where compatible; never copy Development DB data, signing keys or administrator credentials. Test issuer/environment separation using independent keys and exact origins. More than one API replica also needs a review of process-local limiting/provider quotas and migration concurrency.

No step above has run. Completion of H2-C means this plan/review is delivered; it does not mean Development is deployed or Production is approved.
