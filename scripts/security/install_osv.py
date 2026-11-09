"""Install a SHA-256-pinned official OSV binary without changing global tools."""
import hashlib
import http.client
import os
import platform
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

VERSION = "2.7.0"
# Official v2.7.0 names, SHA-256 digests and asset IDs; review together on upgrades.
ASSETS = {
    ("Linux", "x86_64"): ("linux_amd64", "160c6253e2922e9e0a6a9771c5c4c40a4b3c6090b34a3cdd5e80c96cc2e4218b", 632251666),
    ("Darwin", "arm64"): ("darwin_arm64", "d4926ef8da134332543be276dff157e4c170f99ad91fc48e89448a8816bdf70b", 632251557),
}
MAX_ATTEMPTS = 3
RETRY_HTTP_STATUSES = {408, 429, 500, 502, 503, 504}


def download(asset, asset_id):
    direct = f"https://github.com/google/osv-scanner/releases/download/v{VERSION}/osv-scanner_{asset}"
    # GitHub's documented binary endpoint for the same immutable public asset.
    fallback = f"https://api.github.com/repos/google/osv-scanner/releases/assets/{asset_id}"
    for attempt in range(MAX_ATTEMPTS):
        request = urllib.request.Request(direct if attempt == 0 else fallback, headers={
            "User-Agent": "NextSITREP-dependency-security/1.0",
            "Accept": "application/octet-stream",
        })
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                return response.read()
        except urllib.error.HTTPError as error:
            # A missing/forbidden asset is not a transient download failure.
            if error.code not in RETRY_HTTP_STATUSES or attempt == MAX_ATTEMPTS - 1:
                raise
            detail = f"HTTP {error.code}"
            if error.fp is not None:
                error.close()
        except (urllib.error.URLError, TimeoutError, ConnectionError, http.client.IncompleteRead) as error:
            if attempt == MAX_ATTEMPTS - 1:
                raise
            detail = type(error).__name__
        delay = 2 ** attempt
        print(f"OSV download attempt {attempt + 1}/{MAX_ATTEMPTS} failed ({detail}); "
              f"retrying the official release-asset API in {delay}s", file=sys.stderr)
        time.sleep(delay)
    raise RuntimeError("OSV download attempts exhausted")


def install(destination):
    asset, expected, asset_id = ASSETS[(platform.system(), platform.machine())]
    data = download(asset, asset_id)
    if hashlib.sha256(data).hexdigest() != expected:
        raise ValueError("OSV release checksum mismatch")
    temporary = destination.with_suffix(".download")
    temporary.write_bytes(data)
    temporary.chmod(0o755)
    os.replace(temporary, destination)
    print(f"Verified OSV Scanner {VERSION} ({asset})")


if __name__ == "__main__":
    install(Path(sys.argv[1]))
