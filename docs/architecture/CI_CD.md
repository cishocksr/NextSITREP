# CI verification and delivery boundaries

Verified against workflow source on 2026-11-09. This is current operational
guidance; older implementation/audit reports elsewhere describe their own dated
baselines. GitHub Actions configuration remains authoritative.

## Main workflow

[ci.yml](../../.github/workflows/ci.yml) runs for pushes to `main` or `develop`
and pull requests targeting either branch. Backend, frontend and dependency
security gates run without source-path filters. Independent jobs run in parallel;
per-branch/PR concurrency cancels superseded backend/frontend runs.

The default permission is `contents: read`. Checkout does not persist credentials,
actions are pinned to commit SHAs, and the final quality gate has no token
permissions. Java, Node and Bun versions are pinned in the workflow. Local tool
versions should match when diagnosing environment-specific failures.

### Backend

Ubuntu 24.04 with Temurin Java 21.0.13+9 runs the checked-in Maven wrapper:

```sh
cd backend
./mvnw clean verify -B -ntp
```

This packages the application, runs its tests and enforces the existing 70%
JaCoCo coverage gate. CI verifies reports exist and uploads Surefire/JaCoCo
artifacts for seven days, including after failures. Only Maven dependencies are
cached; no broad fallback key is used, and PR runs do not save that cache.
These tests are not evidence of PostgreSQL or cloud acceptance.

### Frontend

Ubuntu 24.04 uses Node 24.22.2 and Bun 1.4.4 and verifies their exact versions.
Only Bun downloads are cached. `bun install --frozen-lockfile` reconstructs
`node_modules`; the job does not restore a prebuilt dependency directory.

In order, it runs component tests, read-only Biome lint and format checks,
production Webpack build, TypeScript, production HTTP security regressions and
production browser regressions. Building first makes generated route types
available to the explicit type check. `API_PROXY_TARGET` is synthetic/local for
CI; no live backend or provider secrets are required for frontend gates.

The browser step locates an installed Google Chrome or Chromium binary, reports
its version and passes it as `BROWSER_EXECUTABLE`. Missing browsers fail the step.
The test supplies an isolated profile, temporary build and synthetic loopback API;
it does not download a browser or use a personal profile.

HTTP and browser regressions deliberately make their own isolated builds. Their
synthetic routes and upstreams must not become production application routes or
share the ordinary build's rewrite target. They exclude local environment files.
The frontend job has a 15-minute timeout and bounded individual integration steps.
It does not upload a deployable frontend artifact or publish a preview.

### Dependency security

[dependency-check.yml](../../.github/workflows/dependency-check.yml) is invoked by
main CI. It also supports manual dispatch and an independent weekly scan at
09:17 UTC Monday. It validates scanner policy, installs the pinned OSV Scanner
with checksum verification, resolves Maven dependencies including test scope,
and scans both the frontend Bun lock and resolved Maven inventory.

A bounded download retry/API fallback handles transient installer failures.
Scans require a usable scanner/inventory, and independent ecosystem scanning is
preserved when possible. Failed installation, incomplete scans or blocking policy
findings fail the gate. Reports/inventories are uploaded for 14 days. See
[DEPENDENCY_SECURITY.md](../../DEPENDENCY_SECURITY.md) for policy and reproduction;
a previous green report is not a claim about today's advisories.

### Quality gate

The final job runs with `always()` and requires **backend**, **frontend**, and
**dependency-security** to each report `success`. A failure or cancellation does
not become a successful quality gate. Branch-protection required checks are a
separate GitHub repository setting; this document does not assert that setting.

## Reproduce checks

Use [frontend/README.md](../../frontend/README.md) for clean-clone environment,
proxy, check/fix commands and browser setup. Use the root README for backend and
Compose startup. `lint`/`lint:check` inspect; `lint:fix` writes fixes. Do not clear
all Maven/Bun caches as a first troubleshooting step: read the failing step,
confirm pinned versions, and reproduce its exact command.

A backend test failure, a frozen-lock mismatch, a browser assertion, a scanner
installer failure and an advisory policy failure require different corrections.
Retain the logs/reports that distinguish them; do not disable a gate to hide its
failure. Never publish real credentials or local environment files in artifacts.

## Delivery remains separate

CI verifies source and isolated fixtures. It does not deploy AWS resources,
configure domains/TLS, validate a live ingress, prove image provenance, benchmark
capacity, or exercise production recovery and provider integrations. Those checks
remain in the existing deployment-readiness work. No CD pipeline or deployed
acceptance is implied by the workflow name.
