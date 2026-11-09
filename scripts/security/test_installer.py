"""Download recovery must preserve the pinned binary and fail-closed policy."""
import hashlib
import http.client
import io
import tempfile
import unittest
import urllib.error
from pathlib import Path
from unittest.mock import call, patch

from install_osv import install


class InstallerTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.target = Path(self.directory.name) / "osv"
        self.payload = b"synthetic verified scanner"
        digest = hashlib.sha256(self.payload).hexdigest()
        for mock in [patch("install_osv.platform.system", return_value="Linux"),
                     patch("install_osv.platform.machine", return_value="x86_64"),
                     patch.dict("install_osv.ASSETS", {("Linux", "x86_64"): ("linux_amd64", digest, 632251666)})]:
            mock.start()
            self.addCleanup(mock.stop)

    @staticmethod
    def http_error(code):
        return urllib.error.HTTPError("https://github.com/fixture", code, "Synthetic failure", None, None)

    def test_504_uses_the_same_pinned_asset_via_the_official_api(self):
        with patch("install_osv.urllib.request.urlopen", side_effect=[self.http_error(504), io.BytesIO(self.payload)]) as fetch, patch("install_osv.time.sleep") as sleep:
            install(self.target)
        self.assertEqual(self.target.read_bytes(), self.payload)
        self.assertTrue(self.target.stat().st_mode & 0o100)
        first, second = [entry.args[0] for entry in fetch.call_args_list]
        self.assertEqual(first.full_url, "https://github.com/google/osv-scanner/releases/download/v2.7.0/osv-scanner_linux_amd64")
        self.assertEqual(second.full_url, "https://api.github.com/repos/google/osv-scanner/releases/assets/632251666")
        self.assertEqual(second.get_header("Accept"), "application/octet-stream")
        self.assertTrue(second.get_header("User-agent"))
        sleep.assert_called_once_with(1)

    def test_retryable_http_statuses_have_a_bounded_backoff(self):
        for code in [408, 429, 500, 502, 503, 504]:
            with self.subTest(code=code), patch("install_osv.urllib.request.urlopen", side_effect=[self.http_error(code), self.http_error(503), io.BytesIO(self.payload)]) as fetch, patch("install_osv.time.sleep") as sleep:
                install(self.target)
                self.assertEqual(fetch.call_count, 3)
                self.assertEqual(sleep.call_args_list, [call(1), call(2)])
                self.assertEqual(self.target.read_bytes(), self.payload)

    def test_network_timeouts_and_partial_reads_can_recover(self):
        errors = [urllib.error.URLError("Temporary DNS failure"), TimeoutError(), ConnectionResetError(), http.client.IncompleteRead(b"partial", 100)]
        for error in errors:
            with self.subTest(error=type(error).__name__), patch("install_osv.urllib.request.urlopen", side_effect=[error, io.BytesIO(self.payload)]), patch("install_osv.time.sleep"):
                install(self.target)
                self.assertEqual(self.target.read_bytes(), self.payload)

    def test_exhausted_downloads_fail_without_overwriting_an_existing_binary(self):
        self.target.write_bytes(b"existing binary")
        with patch("install_osv.urllib.request.urlopen", side_effect=[self.http_error(504) for _ in range(3)]) as fetch, patch("install_osv.time.sleep") as sleep:
            with self.assertRaises(urllib.error.HTTPError):
                install(self.target)
        self.assertEqual(fetch.call_count, 3)
        self.assertEqual(sleep.call_args_list, [call(1), call(2)])
        self.assertEqual(self.target.read_bytes(), b"existing binary")
        self.assertFalse(self.target.with_suffix(".download").exists())

    def test_permanent_http_errors_are_not_retried(self):
        for code in [401, 403, 404]:
            with self.subTest(code=code), patch("install_osv.urllib.request.urlopen", side_effect=self.http_error(code)) as fetch, patch("install_osv.time.sleep") as sleep:
                with self.assertRaises(urllib.error.HTTPError):
                    install(self.target)
                fetch.assert_called_once()
                sleep.assert_not_called()
                self.assertFalse(self.target.exists())

    def test_fallback_bytes_must_still_match_the_committed_digest(self):
        with patch("install_osv.urllib.request.urlopen", side_effect=[self.http_error(504), io.BytesIO(b"tampered")]) as fetch, patch("install_osv.time.sleep"):
            with self.assertRaisesRegex(ValueError, "checksum mismatch"):
                install(self.target)
        self.assertEqual(fetch.call_count, 2)
        self.assertFalse(self.target.exists())
        self.assertFalse(self.target.with_suffix(".download").exists())

    def test_api_metadata_is_never_installed_as_a_binary(self):
        with patch("install_osv.urllib.request.urlopen", side_effect=[self.http_error(504), io.BytesIO(b'{"name":"osv-scanner_linux_amd64"}')]), patch("install_osv.time.sleep"):
            with self.assertRaisesRegex(ValueError, "checksum mismatch"):
                install(self.target)
        self.assertFalse(self.target.exists())


if __name__ == "__main__":
    unittest.main()
