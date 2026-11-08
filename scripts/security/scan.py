"""Run OSV with fail-closed tool handling, then apply the severity policy."""
import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

from policy import evaluate, exceptions_from


def scan(scanner, lockfile, output, exceptions):
    output.mkdir(parents=True, exist_ok=True)
    report = output / "osv.json"
    # Prevent a failed retry from reusing a stale successful report.
    for name in ("osv.json", "policy.json", "summary.txt", "scanner.log"):
        (output / name).unlink(missing_ok=True)
    command = [scanner, "scan", "source", "--no-resolve", "--all-packages", "--all-vulns",
               "--verbosity=error", "--format=json", "--config=" + str(Path(__file__).with_name("osv-scanner.toml")),
               "--lockfile=" + lockfile]
    with report.open("w") as stdout, (output / "scanner.log").open("w") as stderr:
        result = subprocess.run(command, stdout=stdout, stderr=stderr, timeout=300)
    errors = (output / "scanner.log").read_text()
    # OSV: 0 = clean, 1 = findings. Other statuses are tool errors, not clean scans.
    # Error-level diagnostics also fail, even if the scanner returned partial JSON.
    if result.returncode not in (0, 1) or errors.strip():
        raise ValueError("OSV scan incomplete; inspect scanner.log (exit " + str(result.returncode) + ")")
    summary = evaluate(json.loads(report.read_text()), exceptions_from(exceptions))
    if (result.returncode == 1) != bool(summary["findings"]):
        raise ValueError("OSV exit code and findings disagree")
    (output / "policy.json").write_text(json.dumps(summary, indent=2) + "\n")
    lines = [f"Scanned {summary['packages']} package entries; {len(summary['findings'])} advisory groups; {summary['blocked']} blockers."]
    for finding in summary["findings"]:
        disposition = "BLOCK" if finding["blocked"] else "EXCEPTION" if finding["exception"] else "REPORT"
        lines.append(f"{disposition}: {finding['severity']} {finding['ecosystem']} {finding['name']}@{finding['version']} {','.join(finding['ids'])}")
    text = "\n".join(lines) + "\n"
    (output / "summary.txt").write_text(text)
    print(text, end="")
    if os.getenv("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as stream:
            # JSON encoding prevents package/advisory text being interpreted as markup.
            stream.write("\nDependency scan summary:\n\n" + "\n".join("    " + json.dumps(line) for line in lines) + "\n")
    return 1 if summary["blocked"] else 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--scanner", default="osv-scanner")
    parser.add_argument("--lockfile", required=True)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--exceptions", type=Path, default=Path(__file__).with_name("exceptions.json"))
    args = parser.parse_args()
    try:
        status = scan(args.scanner, args.lockfile, args.output, args.exceptions)
    except (ValueError, KeyError, TypeError, OSError, subprocess.TimeoutExpired) as error:
        print("Dependency scan failed: " + str(error), file=sys.stderr)
        status = 2
    sys.exit(status)
