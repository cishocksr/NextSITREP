# T08 — Frontend container hardening

Reviewed implementation date: 2026-11-08. Baseline: merged T07/main `fe5c031`.
Branch: `security/frontend-container-hardening`. No commit, push, PR, AWS change,
backend change, dependency upgrade, or deployment is included.

## Result and scope

**PASS: T08 acceptance is complete for the Linux ARM64 candidate.** All 14
container verification groups and existing frontend gates pass. Candidate image
`sha256:93a0bdf94bd6d9f115ab381d08830ca2dbe405e60386baaa304d68ab8109714b`
(`105034074` bytes, about 100.2 MiB). This is a local image identity, not an
ECR/release digest. EC2 architecture selection remains pending.

T08 addresses the frontend image portion of R08 and establishes an artifact
foundation for R06/R10. Those broader findings remain partially resolved/open;
container vulnerability scanning/provenance, backend hardening, cloud identity,
ingress, capacity and operational acceptance remain separate work.

The existing register, roadmap and architecture documents were reviewed in the
local ignored `docs/` directory. They are not tracked or delivered by a clean
clone. This task leaves the register and ignore policy unchanged. This report and
the PR draft are outside that directory so they can be reviewed with T08.

## Files changed

| File | Purpose |
| --- | --- |
| `frontend/Dockerfile` | Digest-pinned toolchain, install/build/runtime stages, traced artifacts, root-owned code and non-root server. |
| `frontend/.dockerignore` | Default-deny build inputs; explicit Next proxy entrypoint; nested environment/credential/key exclusions. |
| `frontend/next.config.ts` | Enable running-server standalone output; existing rewrite/header policies unchanged. |
| `frontend/test/container_security.py` | Standard-library container tests, synthetic upstream/canaries, layer inspection, filesystem and signal checks. |
| `T08_IMPLEMENTATION.md` | Runtime contract, exact inputs, evidence and limitations. |
| `T08_PR_DESCRIPTION.md` | Review-ready description using the existing PR template. |

## Pinned inputs and architecture

| Image | Multi-platform index digest | Verified ARM64 manifest |
| --- | --- | --- |
| `node:24.22.2-bookworm-slim` | `sha256:01d566e8d94d8c619591d78652babfccd3c6992a3dffa9ed5ab39e11cf6c70e9` | `sha256:5f07e73c8822c93b47ee85fa5e228d7f7b45d3107f8c749f97da46e472efbf91` |
| `oven/bun:1.4.4-slim` | `sha256:1846adf22496bd711036aae8be147e57bdebbaea2e5264e3e0b5af1db187d9a4` | `sha256:b0d169a695f779087d0fe8c08b5b17f0d3a927dceac2a087c87a1351340c6565` |

Docker Hub manifests were inspected before use. The builder verifies both version
strings, installs with Bun's frozen lockfile and compiles under Node. The runtime
uses the same Node base as the builder and contains no Bun installation. This
matches CI's Node 24.22.2/Bun 1.4.4 tooling contract while eliminating the runtime
package-manager launch wrapper. No application manifest or lockfile changed.

Linux ARM64 is a **verification candidate**, not the finalized EC2 architecture:
the user explicitly left the host decision pending. Tests run natively on Docker
Desktop 4.85.0 / Engine 29.6.2, Linux ARM64, from a macOS ARM64 host. No AMD64 or
EC2 compatibility/capacity claim is made. Digests/frozen resolution stabilize
inputs; Next build IDs and build metadata mean byte-identical image reproduction
is not claimed. Digest updates still need maintenance/security review.

## Runtime and permissions

`node server.js` runs directly as PID 1, UID/GID **1000:1000** (`node`). The
runtime copies only `.next/standalone`, `.next/static` and `public`. It retains
Next's traced server dependencies, not the full source/build workspace or dev
tooling. Empty `public` is created during build for clean-clone compatibility.

Application code is root-owned. The unprivileged server cannot modify `/app` or `server.js`. Runtime writable
paths are `/tmp` and `/app/.next/cache` (image-optimizer cache). Tests mount both
as bounded tmpfs and use a read-only root filesystem, dropped capabilities,
no-new-privileges and a PID limit. The cache tmpfs must be owned by UID/GID 1000;
otherwise it hides the image directory's ownership. Persistence is unnecessary
for this cache. Future ISR/caching changes must reassess the write contract.

Example local verification launch (HTTP only; not an AWS ingress definition):

```bash
docker run --rm --name nextsitrep-t08-local \
  --read-only --cap-drop=ALL --security-opt=no-new-privileges --pids-limit=128 \
  --tmpfs /tmp:rw,noexec,nosuid,size=32m \
  --tmpfs /app/.next/cache:rw,noexec,nosuid,uid=1000,gid=1000,size=32m \
  -p 127.0.0.1:3000:3000 nextsitrep-frontend:t08
```

These flags must also be supplied by a future deployment definition; the image
cannot force its caller to use a read-only root or prevent a privileged override.
No Docker socket, host credentials or AWS permissions are required by the app.

## Configuration contract

| Value | Phase | Contract |
| --- | --- | --- |
| `API_PROXY_TARGET` | Build argument only | Nonsecret HTTP(S) internal origin, default `http://backend:8080`; captured by Next rewrites. Keep the hostname stable to promote the same image. Changing this route requires a build. Never put credentials here. |
| `HTTPS_DEPLOYMENT` | Runtime | Existing strict `true`/`false` flag; default false for local HTTP. Supply true only behind a verified HTTPS-only ingress with direct Next access blocked. |
| `PORT`, `HOSTNAME` | Runtime | Defaults 3000 / 0.0.0.0; host/container network exposure is the deployment's responsibility. |
| `NODE_ENV`, `NEXT_TELEMETRY_DISABLED` | Image defaults | production / 1. |
| Backend JWT, DB and provider secrets | Never frontend inputs | Delivered only to the relevant backend service; no build argument or runtime frontend secret is needed. |

Production-style Dev ingress still routes browser `/api/*` directly to Spring
through the controlled proxy; the preserved Next rewrite is the existing local
fallback. The container tests establish routing/transport behavior, not AWS peer
trust or Spring authentication correctness. No static export, CSP relaxation,
cookie redesign or authentication change is included.

Standalone is the framework's traced running-server output, documented at
<https://nextjs.org/docs/app/api-reference/config/next-config-js/output>.

## Verification commands and evidence

All existing frontend gates ran using the pinned CI versions in a byte-checked application source/config
temporary copy at `/private/tmp/nextsitrep-t08/quality/frontend`, excluding
environment files. This avoids loading workstation secrets or overwriting local
build output. Source SHA-256 inventory: `/private/tmp/nextsitrep-t08/quality-source-sha256.json`.

```bash
bun install --cwd frontend --frozen-lockfile
bun run --cwd frontend test:run
bun run --cwd frontend lint:check
bun run --cwd frontend format:check
bun run --cwd frontend build
bun run --cwd frontend type-check
bun run --cwd frontend test:security:http
docker buildx build --platform linux/arm64 --load \
  --build-arg API_PROXY_TARGET=http://backend:8080 \
  -t nextsitrep-frontend:t08 frontend
docker image inspect nextsitrep-frontend:t08 \
  --format '{{.Architecture}} {{.Config.User}}'
docker run --rm --entrypoint id nextsitrep-frontend:t08
python3 frontend/test/container_security.py
git diff --check
```

On this host, `docker buildx` is absent from the configured CLI plugin path.
The Docker Desktop bundled Buildx 0.35.0 executable was used instead:

```bash
/Applications/Docker.app/Contents/Resources/cli-plugins/docker-buildx build \
  --platform linux/arm64 --load --build-arg API_PROXY_TARGET=http://backend:8080 \
  -t nextsitrep-frontend:t08 frontend
python3 frontend/test/container_security.py \
  --buildx /Applications/Docker.app/Contents/Resources/cli-plugins/docker-buildx
```

| Acceptance criterion | Status | Verification / evidence | Remaining risk |
| --- | --- | --- | --- |
| Pinned compatible builder/runtime; architecture | Pass | Registry manifests, version assertions and native ARM64 build; exact digests above. | EC2 architecture decision pending; AMD64 untested. |
| Environment files/secrets excluded | Pass | 14 synthetic canaries absent from Docker-filtered context; all 10 runtime layers and metadata inspected for candidate and fixture. | Not arbitrary hardcoded-secret detection. |
| Minimal application runtime | Pass | Only standalone/static/public copies; no app source tree, tests, Bun, lockfile or direct TypeScript dev package in runtime. | Traced server dependencies/base OS still require T12 scanning. |
| Explicit non-root | Pass | Image USER 1000:1000; running process id is node UID/GID 1000. | A privileged caller can override USER. |
| Filesystem restrictions | Pass | Read-only root with dropped capabilities; writes to app/code fail; tmp/cache writes and image optimization succeed. | Future deployment must enforce flags and bounded mounts. |
| Running Next SSR | Pass | Dynamic build routes and rendered responses from candidate. | No EC2 capacity/browser claim. |
| Fresh matching nonce CSP | Pass | Both HTTPS flag modes; all rendered script nonces match policy and differ per response; caller nonce rejected. | No actual TLS termination tested. |
| Error CSP | Pass | Candidate 404 paths, including excluded-looking names; real 500 in disposable fixture variant. | 500 fixture is separate from candidate. |
| Same-origin API/security transport | Pass | Six API operations; method/query/body, cookies/Origin/CSRF header, missing-CSRF 403, spoof stripping and cookie attributes. Public actuator path returns 404. | Synthetic upstream; real Spring/ingress acceptance remains. |
| Startup | Pass | HTTP ready within 30-second harness deadline under read-only/non-root restrictions. | Host resource constraints not measured. |
| Bounded SIGTERM shutdown | Pass | Cleanup-complete log required, no OOM, expected Next exit 143 and each stop <10 seconds. Actual seconds: 0.249, 0.206, 0.216. | Idle/completed-request shutdown; not a sustained-load drain test. |
| Existing quality gates | Pass | Frozen install, 46 tests, lint/format, build, types, all 3 HTTP tests; final exit codes 0. | Temporary application source copy; no new GitHub run. |
| Container security suite | Pass | 14 groups; harness exit 0; `container-summary.json` / `container-results.log`. | Local native ARM64 engine only. |
| Existing protections/gates preserved | Pass | Proxy/security/workflow/manifests unchanged; only output mode added to Next config; `git diff --check`. | Existing documented CSS exception remains. |
| T08-only scope | Pass | Six changed/new T08 files; no backend, DB, IaC or deployment edits. | R06/R08/R10 remain broader open work. |

Evidence directory: `/private/tmp/nextsitrep-t08/`. Quality command exit codes
are in `quality-results.json`; the initial sandbox denied loopback listening for
the HTTP fixture (exit 1). Its authorized retry passed (exit 0, three tests),
recorded in `quality-8-retry.log`. Logs `quality-0.log` through `quality-7.log`
cover runtime versions, frozen install, 46 tests, lint/format/build/types.

The first container test found that the initial context allowlist omitted
`proxy.ts`: missing nonce CSP failed the check. The corrected allowlist explicitly
includes it. Docker's internal-only network did not publish a host test port, so
the harness uses a dedicated disposable bridge with loopback-only publication.
It calls only the synthetic upstream; no live provider or production credentials
are used. The harness also initially required exit 0; inspection of the installed
Next 16.4.5 `start-server.js` showed its deliberate exit 143 after completed
SIGTERM cleanup. The final test requires that completion log, expected status,
no OOM and a stop under ten seconds. These unsuccessful attempts are
implementation/test corrections, not accepted exceptions. The final container log is `container-results.log`.

The harness exports the Docker-filtered context to a scratch archive with 14
synthetic canaries, then checks every runtime image layer and metadata. It also
builds a disposable fixture variant to exercise a real 500 and image cache writes;
that variant is not the candidate image and is removed with its containers/network.
Canaries demonstrate the exclusion boundary; this is not a comprehensive detector
for arbitrary hardcoded secrets in otherwise permitted application source.

## Remaining risks and follow-up

- **T09:** backend image/user/toolchain/wrapper hardening remains untouched.
- **T12:** image/OS vulnerability scans, SBOM publication, provenance validation,
  signing/attestation policy and immutable registry delivery remain outstanding.
  Docker's generated build metadata is not an independently verified provenance gate.
- No new application SCA run was required for unchanged manifests; the verified
  main/T07 scan is prior evidence, not a scan of this container's OS packages.
- Container tests verify synthetic cookie/CSRF transport. Actual Spring behavior,
  browser/HTTPS ingress, DB, IAM, network/metadata isolation, capacity, backup,
  rollback and real AWS execution remain Development acceptance requirements.
- No new CI job is added. Existing gates remain unchanged; run the container
  harness explicitly for T08 review. GitHub-hosted results for this unpushed
  branch do not exist yet.
- Local candidate tags are mutable and are not release identities. Future
  delivery must use verified immutable registry digests and approved config.

## Final Git state

Branch `security/frontend-container-hardening`; baseline `fe5c031`.
Six T08 files are modified/new as listed above; changes remain uncommitted.
No staging, push, PR creation, merge or deployment was performed.
