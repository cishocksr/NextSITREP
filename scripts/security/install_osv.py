"""Install a SHA-256-pinned official OSV binary without changing global tools."""
import hashlib
import os
import platform
import sys
import urllib.request
from pathlib import Path

VERSION = "2.7.0"
# Official v2.7.0 release asset digests; review both version and hashes together.
ASSETS = {
    ("Linux", "x86_64"): ("linux_amd64", "160c6253e2922e9e0a6a9771c5c4c40a4b3c6090b34a3cdd5e80c96cc2e4218b"),
    ("Darwin", "arm64"): ("darwin_arm64", "d4926ef8da134332543be276dff157e4c170f99ad91fc48e89448a8816bdf70b"),
}


def install(destination):
    asset, expected = ASSETS[(platform.system(), platform.machine())]
    url = f"https://github.com/google/osv-scanner/releases/download/v{VERSION}/osv-scanner_{asset}"
    with urllib.request.urlopen(url, timeout=120) as response:
        data = response.read()
    if hashlib.sha256(data).hexdigest() != expected:
        raise ValueError("OSV release checksum mismatch")
    temporary = destination.with_suffix(".download")
    temporary.write_bytes(data)
    temporary.chmod(0o755)
    os.replace(temporary, destination)
    print(f"Verified OSV Scanner {VERSION} ({asset})")


if __name__ == "__main__":
    install(Path(sys.argv[1]))
