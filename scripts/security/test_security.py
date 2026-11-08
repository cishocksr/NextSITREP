"""Offline policy, malformed-input and scanner failure regressions."""
import copy
import datetime as dt
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from install_osv import install
from maven_inventory import inventory
from policy import evaluate, exceptions_from
from scan import scan

HERE = Path(__file__).parent


def report(score="7.0", label=None):
    vuln = {"id": "GHSA-fixture", "aliases": ["CVE-fixture"]}
    if label:
        vuln["database_specific"] = {"severity": label}
    return {"results": [{"packages": [{"package": {"ecosystem": "npm", "name": "fixture", "version": "1.0.0"},
            "vulnerabilities": [vuln], "groups": [{"ids": ["GHSA-fixture"], "max_severity": score}]}]}]}


class PolicyTests(unittest.TestCase):
    def test_severity_boundaries(self):
        for score, severity, blocked in [("9.0", "Critical", 1), ("7.0", "High", 1), ("6.9", "Medium", 0), ("4.0", "Medium", 0), ("3.9", "Low", 0), ("", "Unknown", 1)]:
            with self.subTest(score=score):
                result = evaluate(report(score), [])
                self.assertEqual(result["blocked"], blocked)
                self.assertEqual(result["findings"][0]["severity"], severity)

    def test_database_label_cannot_lower_cvss(self):
        self.assertEqual(evaluate(report("9.8", "LOW"), [])["blocked"], 1)
        self.assertEqual(evaluate(report("", "HIGH"), [])["blocked"], 1)

    def test_malformed_and_incomplete_reports_fail(self):
        for data in [{}, {"results": []}, {"results": [{"packages": []}]}, report("NaN"), report("11")]:
            with self.subTest(data=data), self.assertRaises((ValueError, KeyError)):
                evaluate(data, [])
        data = report()
        data["results"][0]["packages"][0]["groups"] = []
        with self.assertRaises(ValueError):
            evaluate(data, [])

    def test_alias_exception_is_exact_visible_and_expires(self):
        entry = {"id": "CVE-fixture", "ecosystem": "npm", "name": "fixture", "version": "1.0.0",
                 "owner": "maintainer", "reason": "Synthetic test only", "tracking_url": "https://github.com/cishocksr/NextSITREP/issues/1",
                 "approved_by": "reviewer", "approved_on": "2026-11-01", "expires": "2026-11-10"}
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "exceptions.json"
            path.write_text(json.dumps([entry]))
            entries = exceptions_from(path, dt.date(2026, 11, 8))
            result = evaluate(report(), entries)
            self.assertEqual(result["blocked"], 0)
            self.assertEqual(result["findings"][0]["exception"]["owner"], "maintainer")
            other = copy.deepcopy(entry)
            other["version"] = "2.0.0"
            self.assertEqual(evaluate(report(), [other])["blocked"], 1)
            with self.assertRaises(ValueError):
                exceptions_from(path, dt.date(2026, 11, 10))
            for field, value in [("expires", "2026-12-31"), ("approved_by", ""), ("tracking_url", "https://example.com")]:
                invalid = {**entry, field: value}
                path.write_text(json.dumps([invalid]))
                with self.assertRaises(ValueError):
                    exceptions_from(path, dt.date(2026, 11, 8))

    def test_maven_includes_transitive_and_test_coordinates(self):
        node = {"groupId": "example", "artifactId": "direct", "version": "1.0", "scope": "compile",
                "children": [{"groupId": "example", "artifactId": "nested", "version": "2.0", "scope": "test"}]}
        packages = inventory({"children": [node]})["results"][0]["packages"]
        self.assertEqual(len(packages), 2)
        self.assertEqual(packages[1]["dependency_groups"], ["test"])
        with self.assertRaises(ValueError):
            inventory({})
        node["version"] = "${unresolved}"
        with self.assertRaises(ValueError):
            inventory({"children": [node]})

    def test_scanner_exit_codes_errors_and_advisories(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            scanner = root / "scanner"
            exceptions = root / "exceptions.json"
            exceptions.write_text("[]")
            clean = report()
            clean["results"][0]["packages"][0].pop("groups")
            clean["results"][0]["packages"][0].pop("vulnerabilities")
            cases = [(0, clean, "", 0), (1, report("5"), "", 0), (1, report(), "", 1),
                     (127, clean, "", 2), (128, {}, "", 2), (0, clean, "service failed", 2),
                     (0, report(), "", 2), (1, clean, "", 2)]
            for code, data, stderr, expected in cases:
                with self.subTest(code=code, stderr=stderr, expected=expected):
                    scanner.write_text(f"#!{sys.executable}\nimport json,sys\nprint({json.dumps(data)!r})\nprint({stderr!r},file=sys.stderr)\nsys.exit({code})\n")
                    scanner.chmod(0o755)
                    result = subprocess.run([sys.executable, str(HERE / "scan.py"), "--scanner", str(scanner), "--lockfile", "fixture", "--output", str(root / "report"), "--exceptions", str(exceptions)], capture_output=True)
                    self.assertEqual(result.returncode, expected, result.stderr.decode())
            with self.assertRaises(OSError):
                scan(str(root / "missing"), "fixture", root / "missing-report", exceptions)
            scanner.write_text(f"#!{sys.executable}\nprint('not json')\n")
            scanner.chmod(0o755)
            with self.assertRaises(ValueError):
                scan(str(scanner), "fixture", root / "invalid-report", exceptions)

    def test_installer_rejects_wrong_digest(self):
        with tempfile.TemporaryDirectory() as directory, patch("install_osv.platform.system", return_value="Linux"), patch("install_osv.platform.machine", return_value="x86_64"), patch("install_osv.urllib.request.urlopen") as response:
            response.return_value.__enter__.return_value.read.return_value = b"tampered"
            target = Path(directory) / "osv"
            with self.assertRaises(ValueError):
                install(target)
            self.assertFalse(target.exists())


if __name__ == "__main__":
    unittest.main()
