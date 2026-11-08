# Automated dependency security (T07)

## Scope and tool selection

OSV Scanner **2.7.0** scans the committed Bun lockfile and an exact Maven-resolved inventory. Its Linux x86-64 / macOS ARM64 binaries are downloaded from the official release and verified against committed SHA-256 digests. Python uses only its standard library; no application dependencies change. Review scanner releases/digests at least monthly through a separate PR.

[OSV supports Bun lockfiles](https://google.github.io/osv-scanner/supported-languages-and-lockfiles/). For backend completeness, the existing Maven dependency plugin **3.8.1** produces JSON rather than asking OSV to independently resolve a POM. Conversion preserves resolved versions, transitive dependencies and compile/runtime/test/provided/system scopes, excluding the application root. Test-only dependencies are included. Native Maven POM resolution by OSV currently omits test dependencies. This is advisory matching, not reachability or exploit testing.

The replaced workflow only listed Maven dependencies/updates. Its frontend command used `npm audit` without an npm lockfile, blanket `bun pm trust --all`, and ignored failures. No Bun install or dependency lifecycle scripts are needed by the replacement scanner. Existing frontend install/test jobs and their explicit trust configuration remain unchanged. No duplicate scanner or updater is added.

GitHub inspection on **2026-11-08** confirmed a public repository and a main-branch ruleset requiring **Quality Gate**. Legacy branch-protection API returned 404; the ruleset API confirmed the requirement. The Dependency Review comparison API returned **403**, so availability with the present credentials/settings is unverified despite public-repository eligibility. This implementation does not depend on Dependency Review, dependency submission, security-events write permission or a paid license. No Dependabot/Renovate configuration exists, and the repository metadata reports Dependabot security updates disabled. Enabling update automation or changing repository security settings is a separate decision; neither was performed.

## Execution and merge gate

- `ci.yml` retains its existing PR and push triggers for `main` and `develop`, without path filters. A new `dependency-security` job calls the local reusable `dependency-check.yml` at the same commit. Both existing application jobs are unchanged.
- **Quality Gate** now requires backend, frontend **and** dependency-security success. Failure, cancellation or skipping of any prerequisite causes gate failure. No `continue-on-error`, silent fallback, or advisory baseline is used.
- The reusable workflow also runs independently every **Monday at 09:17 UTC** and supports manual dispatch. Scheduled runs scan the default branch's current dependency versions against current advisory data; they do not require a PR, base SHA, database, application deployment or AWS credentials.
- Both ecosystems are attempted even when the other scan fails. Earlier failures continue to fail the overall job. Failed dependency resolution, missing binaries/inventories, timeouts, invalid JSON, empty results, ungrouped advisories and error-level scanner diagnostics fail closed.
- OSV's documented statuses 0 (no findings) and 1 (findings) are interpreted explicitly; any other code fails as an operational error. Findings are evaluated by severity rather than treating every scanner status 1 as a High vulnerability. See [OSV return codes](https://google.github.io/osv-scanner/output/#return-codes).
- Read-only `contents` permission, SHA-pinned actions, no persisted checkout credentials, a 15-minute job timeout, five-minute scanner deadlines and per-event/ref concurrency apply. Maven cache restore uses the existing backend key; this workflow never writes caches. Only `~/.m2/repository` is restored, not Maven settings, binaries or vulnerability reports. Scanner queries always use live advisory data.
- `dependency-security-results` contains raw OSV JSON, error logs, policy JSON, text summaries and the Maven inventory, retained for **14 days**, including on failure. Successful scans append a summary to the Actions job summary. Package identities/versions are sent to public OSV; no veteran data, environment files, secrets or credentials are inputs.

## Severity and response policy

| Classification | Gate behavior | Response |
| --- | --- | --- |
| Critical (CVSS >=9.0) | Block | Immediate triage; fix or obtain a narrowly scoped exception. |
| High (>=7.0, <9.0) | Block | Prioritize remediation; no automatic exception for missing fixes. |
| Medium (>=4.0, <7.0) | Report | Create/maintain a tracked remediation issue with an owner and target date. |
| Low (<4.0) | Report | Track and address during dependency maintenance. |
| Unknown/unclassified | Block pending triage | Establish severity or obtain an approved exception; do not assume Low. |
| Scanner/service/format error | Block | Investigate and rerun after recovery; do not replace a failed check with success. |

Use the highest OSV-computed group score or advisory severity label. GHSA/CVE aliases are grouped; categorical MODERATE maps to Medium. Findings in development/test dependencies follow the same thresholds because they execute in development or CI. No reachability-based suppression is enabled. All current findings, including pre-existing vulnerabilities and those without available fixes, follow this policy; there is no grandfathered baseline.

Scheduled failures require maintainer triage and notification settings for the responsible maintainers. A scheduled scan cannot retroactively revoke an older PR's successful Quality Gate; rerun CI on affected open PRs and before merging when the scheduled scan reports new blockers. Notification delivery and GitHub scheduling are hosted behavior, not locally proven. GitHub may delay schedules or disable scheduled workflows on inactive public repositories; confirm scheduling remains enabled.

## False positives and temporary exceptions

`scripts/security/exceptions.json` starts **empty**. Do not add blanket ignores, package overrides, scanner-side exclusions or suppressions for service outages. An approved false positive or temporary risk acceptance is recorded as an exact advisory (or alias), ecosystem, package and version match:

```json
{
  "id": "GHSA-advisory-id",
  "ecosystem": "npm",
  "name": "affected-package",
  "version": "exact-version",
  "owner": "responsible-maintainer",
  "reason": "Evidence, exposure analysis, mitigation and remediation plan",
  "tracking_url": "https://github.com/cishocksr/NextSITREP/issues/ISSUE_NUMBER",
  "approved_by": "reviewing-maintainer",
  "approved_on": "YYYY-MM-DD",
  "expires": "YYYY-MM-DD"
}
```

Approval must come through a reviewed PR from a responsible maintainer/security owner. The script validates required metadata, exact matching, dates, duplicate entries and a maximum **30-day** lifetime. Expiry uses UTC dates; the expiry date itself is invalid. Expired/future/invalid exceptions fail scanning, even if no longer matched, forcing removal or review. Exempted findings remain visible with full metadata in the policy report. Fixes or version changes require removal/reassessment; exceptions never carry across versions automatically.

The script cannot prove that `approved_by` identifies an actual reviewer. The current ruleset allows PRs with zero required approvals; review enforcement/CODEOWNERS for policy/workflow changes remains a recommended governance follow-up, not a repository-settings change performed by T07. Never self-approve an exception by simply adding metadata. No exceptions were created by this task.

## Local commands

Run from the repository root using an actual Java 21 `JAVA_HOME` and Python 3.9+ (GitHub Ubuntu 24.04 supplies Python):

```bash
python3 -m unittest discover -s scripts/security -p 'test_*.py' -v
python3 scripts/security/install_osv.py /tmp/nextsitrep-osv-scanner
python3 scripts/security/scan.py --scanner /tmp/nextsitrep-osv-scanner --lockfile frontend/bun.lock --output /tmp/nextsitrep-reports/frontend
mkdir -p /tmp/nextsitrep-reports/backend
(cd backend && ./mvnw -B -ntp org.apache.maven.plugins:maven-dependency-plugin:3.8.1:tree -DoutputType=json -DoutputFile=/tmp/nextsitrep-reports/backend/maven-tree.json)
python3 scripts/security/maven_inventory.py /tmp/nextsitrep-reports/backend/maven-tree.json /tmp/nextsitrep-reports/backend/maven.osv-scanner.json
python3 scripts/security/scan.py --scanner /tmp/nextsitrep-osv-scanner --lockfile osv-scanner:/tmp/nextsitrep-reports/backend/maven.osv-scanner.json --output /tmp/nextsitrep-reports/backend
```

Do not put credentials in arguments or dump environment variables. A findings/policy block returns **1**; scanner execution/report errors return **2**. Policy tests are offline. Live scans require outbound HTTPS to official GitHub release assets, Maven Central and OSV services.

## Verification on 2026-11-08

- OSV: **243 unique frontend coordinates** (244 lockfile entries; one duplicate coordinate; all coordinates verified present in the scan output) and **144 Maven coordinates**, zero returned advisory groups in both scans. This is a point-in-time result, not assurance that no vulnerabilities exist.
- Actual temporary `lodash@4.17.20` inventory: four advisory groups, two High blockers; live scan/policy process exited **1**. This fixture is not an application dependency and is not committed.
- Offline tests cover severity boundaries, unknown severity, conflicting scores/labels, exact/alias exception matching, invalid/expired exceptions, Maven transitive/test inventory, missing binaries, malformed/incomplete output, contradictory scanner statuses, operational errors and checksum mismatch.
- Existing frontend CI commands pass: frozen Bun install, 46 tests, lint, formatting, production build, type-check, and all three production HTTP security tests. Existing backend Java 21 `clean verify -B -ntp` passes 217 tests, zero failures/errors/skips, with **670/850 lines (78.82%)** against unchanged **70%**.
- Application verification used temporary copies checked byte-for-byte against tracked source (environment files excluded), with the existing pinned Node/Bun/Java runtimes. Application dependency manifests/lockfiles, Maven POM, application code and repository security settings were not changed.
- actionlint checks the caller and reusable workflow. Controlled checks verify every prerequisite-result combination fails Quality Gate unless all three succeed, and standalone schedule/manual operation has no PR-only prerequisite.

## Limits and follow-ups

GitHub-hosted Linux execution, reusable-workflow status propagation, cache restore, artifact upload, schedule delivery and notification recipients require the first real PR/manual/scheduled run after review/merge. Local tests execute on macOS ARM64. The Linux binary hash comes from official release metadata; local installer tests exercise checksum rejection, not Linux execution. Release hashing does not replace independent SLSA provenance verification.

OSV coverage depends on available advisory records and correct version metadata. The scan covers resolved application/test libraries, not Maven plugin dependencies, the Maven wrapper/JDK, GitHub Actions internals, Bun/Node runtime vulnerabilities, container/OS packages, secrets, malicious-package detection or licensing policy. Platform-specific optional npm entries are scanned from the full lockfile, rather than only host-installed modules. Native libraries bundled inside npm distributions may lack distinct advisory coordinates. Container/runtime/provenance scanning remains T09/T12. No automatic dependency upgrade PRs, remediation commits, AWS changes, deployment or paid services are introduced.
