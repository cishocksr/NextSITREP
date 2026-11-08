# T09 — Backend container and Maven wrapper hardening

Date: 2026-11-08. Baseline: clean/fetched main `5d325ad`, including merged T08
and documentation cleanup. Branch: `security/backend-container-hardening`.

**T09 acceptance passes for the Linux ARM64 candidate, including the separately
approved startup prerequisite.** Nine full container verification groups pass;
217 Maven tests pass on host Java 21 and in the ARM64 builder, with zero failures,
errors or skips and **78.82%** line coverage.

Local candidate image: `sha256:e077c82e09fa06b2a343c399d8132caaf6aba212b92185a2c269f3274c80c105`,
`130222990` bytes (about 124.2 MiB). This local identity
is not a published ECR release digest. Full test harness, wrapper harness, Maven
verify and the existing backend dependency scan all exit **0**. The scan reports
**147 coordinates, zero advisory groups and zero blockers** on 2026-11-08.

## Scope and baseline

Spring Boot 4.1.2, Java 21, Maven 3.9.9, wrapper 3.3.4 and JaCoCo 0.8.14 remain
unchanged. The existing coverage gate remains 70%. No frontend, database schema,
Terraform, AWS provisioning, CI gate or authentication redesign is included.

The current tracked documentation includes historical audits and AWS proposals,
but no canonical `AUDIT_RECONCILIATION.md` or `REMEDIATION_ROADMAP.md` was found.
Those documents existed locally in earlier reviews; this task does not recreate
or silently reconcile them. T09's supplied requirements define the current scope.
The backend portions of R08 and the wrapper foundation for R06 are addressed;
R06/R08/R10 still require other release and AWS operating controls.

## Changes and security decisions

| File | Change |
| --- | --- |
| `backend/Dockerfile` | Verified Java 21 image digests; full clean verify in builder; JRE/JAR-only application runtime; non-root UID/GID 10001; root-owned read-only JAR; explicit heap/shutdown settings. |
| `backend/.dockerignore` | Default-deny input list retaining current build/test sources; nested environment/key/credential/database/log exclusions. |
| `backend/.mvn/wrapper/maven-wrapper.properties` | Pin the Maven ZIP SHA-256. |
| `docker-compose.yml` | Replace only the backend curl healthcheck with the tested existing wget utility; preserve its status-based failure behavior. |
| `backend/pom.xml` | Separately approved missing RestClient starter fix, described below. |
| `backend/test/container_security.py` | Synthetic context/layer, memory, runtime/security, management, profile and shutdown checks. |
| `backend/test/wrapper_integrity.py` | Upstream script fingerprints; fresh-cache valid, wrong-pin and corrupted-archive tests. |
| `backend/test/HttpProbe.java` | Standard-library HTTP client compiled/mounted only for tests; no probe tooling added to production image. |
| `docs/architecture/T09_IMPLEMENTATION.md` | This report and acceptance matrix. |
| `docs/architecture/T09_PR_DESCRIPTION.md` | PR draft using the current template. |

The previous Docker build skipped tests, used floating tags, installed runtime
curl and had no explicit non-root identity. The new build runs the existing
`./mvnw clean verify -B -ntp` gate and copies only the packaged production JAR to
a compatible JRE image. No JDK, Maven, H2, JUnit, Mockito, test profile or backend
source is shipped in the final application artifact. The base JRE still contains
normal Alpine utilities; it is not a shell-free image.

### Separately approved application startup prerequisite

The first full-container startup reached Flyway/Hibernate on the external test
database, then failed because `GeocodingService` required an unavailable
`RestClient.Builder`. Both provider clients inject that builder. The packaged
classpath lacked Spring Boot's RestClient auto-configuration module; existing
client tests construct builders directly and did not exercise this full startup.

The user explicitly approved a narrow startup fix during T09. The only application
dependency change is `spring-boot-starter-restclient`, managed by the existing
4.1.2 BOM. No business logic, Java version, BOM version or broad dependency upgrade
is included. Spring documents the modular HTTP-client starter at
<https://spring.io/blog/2025/09/30/the-state-of-http-clients-in-spring/>.

The full container startup test is the regression check for that missing wiring.
The original failure is preserved in local evidence as
`startup-before-restclient-fix.log`. The existing T07 backend dependency scanner
was rerun for the changed dependency inventory; this is not T12 image scanning.

## Exact base images and toolchain

| Role | Version | Index digest | Verified Linux ARM64 manifest |
| --- | --- | --- | --- |
| Builder | `eclipse-temurin:21.0.13_9-jdk-alpine-3.24` | `sha256:82801f9dcdcbad5a05082aba8c86d1da5b72ccb498e71318b1f91b5a477887b3` | `sha256:22876ffb5e1f84bd80d5fa4f83cdbb69b11d1f4410c356773019b484bd5c2a8e` |
| Runtime | `eclipse-temurin:21.0.13_9-jre-alpine-3.24` | `sha256:ac05c3c42b7c2f1a52c9bd52f01041fa1958231b15ebeae7420429cbc5baf474` | `sha256:23853301373ae9089be2f2d59113c749c7d1ebd140609dec30f1d9bd34d89a32` |

Manifests were inspected from Docker Hub. The builder's BusyBox unzip and checksum
tools let the existing wrapper verify its ZIP without adding downloaded bootstrap
packages. A Noble candidate was inspected but lacks unzip; its wrapper would
switch to a tar.gz archive with a different checksum. No fallback/disabling of
checksum verification was introduced to accommodate that image.

ARM64 is a verified candidate, not the finalized EC2 host choice. Tests ran on
Docker Desktop 4.85.0 / Engine 29.6.2 / Buildx 0.35.0, native Linux ARM64, on a
macOS ARM64 host. No AMD64, EC2 capacity or Production readiness claim is made.

## Maven wrapper provenance and integrity

- Both tracked scripts exactly match the official Maven Central wrapper 3.3.4
  `only-script` distribution. The POSIX script remains executable; the Windows
  script retains CRLF through `.gitattributes`. No wrapper JAR/downloader source
  is missing: this distribution type intentionally uses scripts only.
- POSIX `mvnw` SHA-256:
  `cae96cef89ebea3531221f4ae17c23cf8edf67d00eae8306d4186ae1bbed4d02`.
- Windows `mvnw.cmd` SHA-256:
  `46eedb8419bd14fe70d5bb2916d7b6f51806e51b39d5b76a42610384ca929c1c`.
- Maven source remains the exact HTTPS Maven Central 3.9.9 ZIP URL. Its committed
  SHA-256 is `4ec3f26fb1a692473aea0235c300bd20f0f9fe741947c82c1234cefd76ac3a3c`.
  The downloaded ZIP was verified against Maven Central's published SHA-512
  before calculating that SHA-256.
- The official wrapper distribution ZIP's calculated SHA-256 is
  `6cb584c2bc907b849a0b931d8266d3ff3214cdd3127115ed4f49fb7176413d36`.
  Its release archive was obtained over official HTTPS and compared byte-for-byte
  to both scripts; independent PGP signature verification was not performed.
- Fresh-cache wrapper tests use that known ZIP via a synthetic loopback server:
  valid bytes/pin execute Maven 3.9.9 under Java 21; wrong pin or changed ZIP fail
  before extraction/installation. Their expected exits are 0, 1 and 1; the test
  harness itself exits 0. Windows execution is not tested on this macOS host.

The wrapper still trusts previously extracted Maven caches and supports the
upstream repository/environment override features. It does not continuously
rehash an installed Maven tree. The Docker builder accepts no host Maven cache,
settings or credentials, and cold bootstrap checks the committed checksum.
Maven dependencies/plugins remain resolved under the current POM/BOM constraints;
there is no complete Maven lockfile or claim of byte-identical builds. Package
signatures, independent provenance, image SBOM/OS scanning and release attestations
remain T12. Apache wrapper documentation: <https://maven.apache.org/wrapper/>.

## Runtime contract

- UID/GID **10001:10001** (`app`), no login shell/home. `/app` is root-owned and
  `/app/app.jar` is mode 0444. Java is PID 1 and receives SIGTERM directly.
- `/tmp` is the only required writable path. Tests use a read-only root,
  `--cap-drop=ALL`, `--security-opt=no-new-privileges`, PID limit 128, two CPUs and
  a 64 MiB `noexec,nosuid,nodev,mode=1777` tmpfs. Application writes elsewhere fail.
- The deployment must set a container memory limit. At **1280 MiB**, the JVM's
  `InitialRAMPercentage=15` and `MaxRAMPercentage=60` produce a **192 MiB** initial
  heap and **768 MiB** maximum heap, measured with the actual runtime. Remaining
  memory covers native/thread/metaspace overhead; this is not a capacity guarantee.
  `ExitOnOutOfMemoryError` terminates on Java OOM; it does not prevent cgroup OOM.
- `SERVER_SHUTDOWN=graceful`, shutdown phase budget 10 seconds. Docker tests allow
  20 seconds total and require Spring's completed graceful shutdown log, expected
  JVM signal exit 143 and no OOM kill. Future ingress must stop new traffic first.
- Only port 8080 is declared; nothing is published by the image. Tests publish no
  host port and use a disposable internal Docker network. No runtime curl or
  Docker healthcheck is added; an approved private probe should call the existing
  health endpoint. The local Compose backend healthcheck now uses existing wget
  with the same status-based failure semantics; both success and non-2xx rejection
  were tested. Local Compose is not an AWS deployment definition.
- No secrets/build arguments are needed. At runtime supply the existing explicit
  profile, DB/JWT/provider settings, HTTPS CORS origin and exact trusted proxy IPs
  through the approved secret/config mechanism. Never activate `local`/`test` in
  AWS. DB TLS, grants and secret-delivery verification are separate work.
- The explicit Java entrypoint bypasses the base image's optional certificate
  update helper. Use the JRE truststore or an approved read-only truststore/mount;
  do not expect a root-only runtime CA mutation to work under the tested contract.

Example future runtime restriction flags (not a deployment command):

```text
--read-only --cap-drop=ALL --security-opt=no-new-privileges
--memory=1280m --cpus=2 --pids-limit=128
--tmpfs /tmp:rw,noexec,nosuid,nodev,mode=1777,size=64m
```

## Startup fixture and evidence limits

The production image contains only the production JAR, not H2 or test resources.
The harness exports H2 2.5.252 from the verified builder's test dependency cache,
mounts it and test configuration read-only, and starts the same JAR through
Spring's supported `PropertiesLauncher`. Java's normal memory restrictions remain
in force. This fixture uses the real production security chain and tightens HTTPS,
Secure cookies and exact proxy trust. It never disables Flyway, Hibernate validate,
CSRF, CORS or JWT validation. No provider is contacted.

Successful H2 startup is **not** PostgreSQL compatibility or a successful normal
`aws-dev` deployment. Actual PostgreSQL startup/migrations/TLS/grants remain T11
and the related deployment tasks. The exact production entrypoint is separately
tested for fail-closed profile/JWT/cookie/CORS/Flyway/proxy configuration rejection.
The HTTP helper simulates a controlled TLS proxy using exact trusted loopback;
real TLS termination/ingress remains unverified.

PropertiesLauncher reference:
<https://docs.spring.io/spring-boot/specification/executable-jar/property-launcher.html>.

## Verification and acceptance matrix

| Requirement | Status | Evidence | Remaining limitation |
| --- | --- | --- | --- |
| Pinned builder/runtime digests | Pass | Exact official version/index and ARM64 manifest digests above; successful build. | Independent signatures/provenance and OS scanning are T12. |
| Target architecture | Pass | Native Linux ARM64 build and inspected image metadata. | EC2 selection pending; AMD64 not tested. |
| Wrapper provenance/integrity | Pass | Exact upstream script bytes; Maven SHA-512 checked then SHA-256 pinned; fresh valid/bad-pin/tampered ZIP tests. | Windows execution, cache revalidation and independent PGP verification not established. |
| Minimal runtime | Pass | JRE and root-owned production JAR; no compiler/Maven/curl/test fixtures/test libraries; required security and migration resources retained. | Alpine base utilities remain. |
| Explicit non-root | Pass | Image USER and actual runtime UID/GID 10001. | Deployment must prevent privileged overrides. |
| Filesystem/tmp permissions | Pass | Read-only root; app/code/system writes fail; /tmp writes succeed; dropped capabilities and no-new-privileges. | Caller must supply restrictions; future features may need reassessment. |
| Environment/secrets excluded | Pass | 14 context canaries absent; all 8 runtime layers/config inspected; no environment/test files in production JAR. | Not arbitrary hardcoded-secret detection. |
| Bounded JVM memory | Pass | Under 1280 MiB limit: initial heap 201326592 bytes, maximum 805306368 bytes (192/768 MiB). | Native headroom and host capacity need load evidence. |
| Spring security preserved | Pass | Real chain verifies HTTPS/untrusted-peer denial, JWT/BCrypt, CSRF, exact CORS, Secure/HttpOnly cookies and headers; original application security files unchanged. | Fixture proxy metadata simulates TLS, not real TLS ingress. |
| Startup/readiness | Pass, fixture scope | Ready in 8.751s; minimal UP health; no host port publication; Compose wget check passes. Sensitive env/configprops return 401; readiness is 401 unauthenticated and minimal UP for authenticated user. | External H2/PropertiesLauncher fixture; real PostgreSQL and normal aws-dev startup are not proven (T11). |
| Bounded SIGTERM | Pass | Spring graceful-completion log, expected exit 143, no OOM; 0.272s <20s stop budget. | Completed-request/idle shutdown, not sustained-load drain. |
| Existing backend tests | Pass | 217 actual testcases; zero failures/errors/skips on host and ARM64 builder. | Existing tests use H2/mocks. |
| JaCoCo gate | Pass | 670/850 lines = 78.82%, unchanged 70% minimum. | Coverage is not deployment assurance. |
| Container security verification | Pass | All nine full groups; eight exact production-entrypoint invalid-config cases rejected before DB initialization. | No image/OS scan or AWS evidence. |
| Approved scope | Pass | Five tracked files changed plus three test files/two docs; one explicitly approved starter addition and backend health compatibility command. | No T10–T12, schema, frontend or AWS implementation. |

All host Maven gates use Java 21.0.13+9 in a byte-checked temporary application
source/config copy with workstation environment files excluded. The inventory is
`/private/tmp/nextsitrep-t09/quality-source-sha256.json`. The unchanged application
security/config/migration files are checked again during final diff review.

Surefire's current aggregate XML `tests` attributes sum to 215 while the same XML
contains 217 actual testcase elements, matching Maven's successful 217-test summary.
Two existing nested controller suites undercount their XML aggregate attributes;
the harness counts testcase elements and checks both aggregate and case-level
failure/error/skip entries. This is also present in the host baseline, not a T09
test exclusion or coverage change.

Existing warnings are retained: deprecated JWT-filter API usage and the test JVM's
class-data-sharing notice from the existing Mockito agent. Test contexts intentionally
emit failure-analysis logs for rejected configurations. Docker warns that Git
metadata is absent in the sanitized canary context; no verified provenance claim
is inferred from that test build. No application gate or security policy is weakened.

## Commands and local evidence

```bash
# Java 21; the host run used a byte-checked temporary copy, not workstation env.
cd backend
./mvnw --version
./mvnw clean verify -B -ntp
cd ..
python3 backend/test/wrapper_integrity.py --java-home /path/to/jdk21
docker buildx build --platform linux/arm64 --load -t nextsitrep-backend:t09 backend
docker image inspect nextsitrep-backend:t09 --format '{{.Architecture}} {{.Config.User}} {{.Id}}'
docker run --rm --entrypoint id nextsitrep-backend:t09
python3 backend/test/container_security.py --evidence-dir /tmp/nextsitrep-t09-evidence
git diff --check
```

This host uses Docker Desktop's bundled Buildx path because `docker buildx` is not
in the configured CLI plugin search path:

```bash
python3 backend/test/container_security.py \
  --buildx /Applications/Docker.app/Contents/Resources/cli-plugins/docker-buildx \
  --evidence-dir /private/tmp/nextsitrep-t09/final-container-evidence
```

The wrapper command used the already hash-verified local ZIP with `--archive`;
without it the test downloads the same exact pinned ZIP. Evidence directory:
`/private/tmp/nextsitrep-t09/` (`quality-results.json`, `quality-*.log`,
`wrapper-results.json`, `final-container-results.log`, `final-container-evidence/`,
`sca/results.json`, `sca/reports/`). Test services, fixture mounts and builder
containers/images are disposable; the candidate local image is retained.

## Residual risks and next work

- T10 saved-resource service coverage, T11 real PostgreSQL and T12 image/provenance
  controls are not implemented by this task. Authentication lifecycle, application
  logging/privacy, provider quota/readiness and actual AWS operating controls remain.
- ARM64/heap settings are a verified candidate only. Host capacity, in-flight
  request draining under sustained load, restart/rollback, IAM/metadata isolation,
  database encryption/grants/restore and a genuine HTTPS ingress require later evidence.
- No OS/container vulnerability scan, independent image signature, SBOM publication
  or image-registry promotion was performed. Digest updates still require maintenance.
- The image cannot force callers to retain USER, memory caps, read-only mounts or
  private networking. Those restrictions must be enforced by the deployment definition.
- The final branch has no new GitHub Actions result until a separately authorized
  push. Local checks do not replace that hosted merge gate.

## Git state

Branch `security/backend-container-hardening`, based on main `5d325ad`.
Five tracked files modified (four backend files and the backend Compose health
command); three backend test files and these two T09 documents new. No staging, commit, push, PR creation, merge or deployment performed.
