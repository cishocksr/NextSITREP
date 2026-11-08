"""Exercise the committed POSIX wrapper with fresh caches and synthetic HTTP.

python3 backend/test/wrapper_integrity.py --java-home /path/to/jdk21
Optional --archive accepts a local Maven ZIP; its committed SHA-256 is still checked.
Windows scripts are checked against recorded upstream bytes, not executed here.
"""

import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import urllib.request


def check(condition, message):
    if not condition:
        raise RuntimeError(message)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--java-home", default=os.environ.get("JAVA_HOME"))
    parser.add_argument("--archive", type=Path)
    args = parser.parse_args()
    check(args.java_home is not None, "Supply an actual Java 21 JAVA_HOME")
    root = Path(__file__).resolve().parents[1]
    properties = dict(line.split("=", 1) for line in (root / ".mvn/wrapper/maven-wrapper.properties").read_text().splitlines() if "=" in line and not line.startswith("#"))
    check(properties["distributionUrl"] == "https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/3.9.9/apache-maven-3.9.9-bin.zip", "Unexpected Maven distribution")
    upstream = {
        "mvnw": "cae96cef89ebea3531221f4ae17c23cf8edf67d00eae8306d4186ae1bbed4d02",
        "mvnw.cmd": "46eedb8419bd14fe70d5bb2916d7b6f51806e51b39d5b76a42610384ca929c1c",
    }
    for name, digest in upstream.items():
        check(hashlib.sha256((root / name).read_bytes()).hexdigest() == digest, "Wrapper differs from reviewed 3.3.4 upstream: " + name)
    archive = args.archive.read_bytes() if args.archive else urllib.request.urlopen(properties["distributionUrl"], timeout=60).read()
    check(hashlib.sha256(archive).hexdigest() == properties["distributionSha256Sum"], "Archive does not match committed pin")
    payload = [archive]

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            self.send_response(200)
            self.send_header("Content-Length", str(len(payload[0])))
            self.end_headers()
            self.wfile.write(payload[0])

        def log_message(self, *unused):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    results = []
    try:
        with tempfile.TemporaryDirectory(prefix="nextsitrep-t09-wrapper-") as temporary:
            temporary = Path(temporary)
            for case in ("valid", "bad-pin", "tampered-archive"):
                project = temporary / case
                (project / ".mvn/wrapper").mkdir(parents=True)
                shutil.copyfile(root / "mvnw", project / "mvnw")
                (project / "mvnw").chmod(0o755)
                text = (root / ".mvn/wrapper/maven-wrapper.properties").read_text()
                if case == "bad-pin":
                    text = text.replace(properties["distributionSha256Sum"], "0" * 64)
                (project / ".mvn/wrapper/maven-wrapper.properties").write_text(text)
                payload[0] = archive[:-1] + bytes([archive[-1] ^ 1]) if case == "tampered-archive" else archive
                env = {k: v for k, v in os.environ.items() if k in ("HOME", "USER", "LOGNAME", "TMPDIR")}
                env.update(JAVA_HOME=args.java_home, PATH=args.java_home + "/bin:/usr/bin:/bin:/usr/sbin:/sbin",
                           MAVEN_USER_HOME=str(project / "cache"), MVNW_REPOURL=f"http://127.0.0.1:{server.server_port}")
                result = subprocess.run(["./mvnw", "--version"], cwd=project, env=env, capture_output=True, text=True, timeout=60)
                output = result.stdout + result.stderr
                if case == "valid":
                    check(result.returncode == 0 and "Apache Maven 3.9.9" in output and "Java version: 21." in output, output)
                else:
                    check(result.returncode != 0 and "Failed to validate Maven distribution SHA-256" in output, "Wrapper failed to reject " + case + ": " + output)
                    check(not list((project / "cache").rglob("bin/mvn")), "Unverified Maven was installed")
                results.append({"case": case, "status": "PASS", "exitCode": result.returncode})
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)
    print(json.dumps({"status": "PASS", "upstreamScriptSha256": upstream, "distributionSha256": properties["distributionSha256Sum"], "cases": results}, indent=2))


if __name__ == "__main__":
    main()
