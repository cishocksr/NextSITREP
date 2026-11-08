"""Apply the repository severity/exception policy to unfiltered OSV JSON output."""
import datetime as dt
import json
import math
from pathlib import Path


def exceptions_from(path, today=None):
    today = today or dt.datetime.now(dt.timezone.utc).date()
    entries = json.loads(Path(path).read_text())
    if not isinstance(entries, list):
        raise ValueError("Exceptions must be a list")
    seen = set()
    for entry in entries:
        for field in ("id", "ecosystem", "name", "version", "owner", "reason", "tracking_url", "approved_by", "approved_on", "expires"):
            if not isinstance(entry.get(field), str) or not entry[field].strip():
                raise ValueError("Exception requires " + field)
        approved = dt.date.fromisoformat(entry["approved_on"])
        expires = dt.date.fromisoformat(entry["expires"])
        if not approved <= today < expires or not 0 < (expires - approved).days <= 30:
            raise ValueError("Expired, future, or over-30-day exception")
        if not entry["tracking_url"].startswith("https://github.com/cishocksr/NextSITREP/"):
            raise ValueError("Exception requires a repository tracking URL")
        key = tuple(entry[k] for k in ("id", "ecosystem", "name", "version"))
        if key in seen:
            raise ValueError("Duplicate exception")
        seen.add(key)
    return entries


def evaluate(report, exceptions):
    sources = report["results"]
    if not isinstance(sources, list) or not sources:
        raise ValueError("No scan results")
    findings, count = [], 0
    for source in sources:
        for item in source["packages"]:
            package = item["package"]
            if not all(isinstance(package.get(k), str) and package[k] for k in ("ecosystem", "name", "version")):
                raise ValueError("Invalid package identity")
            count += 1
            vulns = {v["id"]: v for v in item.get("vulnerabilities", [])}
            grouped = set()
            for group in item.get("groups", []):
                ids = group["ids"]
                if not ids or not set(ids) <= vulns.keys():
                    raise ValueError("Invalid advisory group")
                grouped.update(ids)
                raw = group.get("max_severity", "")
                scores = []
                if raw:
                    score = float(raw)
                    if not math.isfinite(score) or not 0 <= score <= 10:
                        raise ValueError("Invalid CVSS score")
                    scores.append(score)
                labels = {"CRITICAL": 9, "HIGH": 7, "MODERATE": 4, "MEDIUM": 4, "LOW": 0}
                for identifier in ids:
                    label = vulns[identifier].get("database_specific", {}).get("severity", "").upper()
                    if label in labels:
                        scores.append(labels[label])
                score = max(scores) if scores else None
                severity = "Unknown" if score is None else "Critical" if score >= 9 else "High" if score >= 7 else "Medium" if score >= 4 else "Low"
                aliases = set(ids) | set(group.get("aliases", []))
                for identifier in ids:
                    aliases.update(vulns[identifier].get("aliases", []))
                exception = next((e for e in exceptions if e["id"] in aliases and all(e[k] == package[k] for k in ("ecosystem", "name", "version"))), None)
                blocked = severity in {"Critical", "High", "Unknown"} and exception is None
                findings.append({**package, "ids": sorted(aliases), "severity": severity,
                                 "blocked": blocked, "exception": exception})
            if grouped != vulns.keys():
                raise ValueError("Ungrouped advisories: incomplete severity assessment")
    if not count:
        raise ValueError("No packages scanned")
    return {"packages": count, "findings": findings, "blocked": sum(f["blocked"] for f in findings)}
