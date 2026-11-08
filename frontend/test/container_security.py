"""T08 integration checks. Requires Python 3.9+, Docker and Buildx; no AWS access.

Run from the repository root: python3 frontend/test/container_security.py
Builds the candidate and a disposable synthetic 500/image fixture variant. Every
container uses an isolated bridge network, synthetic cookies and no credentials.
"""

import argparse
import base64
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import struct
import tarfile
import tempfile
import time
import urllib.error
import urllib.request
import uuid
import zlib
from html.parser import HTMLParser


class Document(HTMLParser):
    def __init__(self):
        super().__init__()
        self.scripts = []
        self.assets = []
        self.styles = []
        self.style = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "script":
            self.scripts.append(attrs.get("nonce"))
            if attrs.get("src"):
                self.assets.append(attrs["src"])
        if tag == "link" and attrs.get("rel") == "stylesheet":
            self.assets.append(attrs["href"])
        if tag == "style":
            self.style = [attrs.get("nonce"), ""]

    def handle_data(self, data):
        if self.style is not None:
            self.style[1] += data

    def handle_endtag(self, tag):
        if tag == "style" and self.style is not None:
            self.styles.append(self.style)
            self.style = None


def check(condition, message):
    # Deliberately not assert: python -O must not disable security checks.
    if not condition:
        raise RuntimeError(message)


def request(origin, path, method="GET", headers=None, body=None):
    req = urllib.request.Request(origin + path, data=body, headers=headers or {}, method=method)
    try:
        response = urllib.request.urlopen(req, timeout=10)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        return response.status, response.headers, response.read()


def document(headers, body, secure, seen):
    check(headers.get_content_type() == "text/html", "Expected rendered HTML")
    policy = headers.get("Content-Security-Policy", "")
    match = re.search(r"script-src 'self' 'nonce-([^']+)' 'strict-dynamic'", policy)
    check(match is not None, "Missing nonce CSP")
    nonce = match[1]
    check(re.fullmatch(r"[A-Za-z0-9+/]{43}=", nonce) is not None, "Malformed nonce")
    check(nonce not in seen and nonce != "caller-selected-nonce", "Reused or caller nonce")
    seen.add(nonce)
    directives = dict((p.strip().split()[0], p.strip().split()[1:]) for p in policy.split(";") if p.strip())
    for name in ("script-src", "style-src"):
        check("'unsafe-inline'" not in directives[name], "Permissive element CSP")
    check("unsafe-eval" not in policy, "Permissive script CSP")
    check("private" in headers.get("Cache-Control", "") and "no-store" in headers.get("Cache-Control", ""), "Cacheable HTML")
    for name, value in {"X-Frame-Options": "DENY", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Permissions-Policy": "camera=(), microphone=(), geolocation=()"}.items():
        check(headers.get(name) == value, "Missing header " + name)
    check(headers.get("Strict-Transport-Security") == ("max-age=31536000" if secure else None), "Incorrect HSTS")
    check(("upgrade-insecure-requests" in policy) == secure, "Incorrect HTTPS policy")
    parsed = Document()
    parsed.feed(body.decode())
    check(parsed.scripts and all(n == nonce for n in parsed.scripts), "CSP/script nonce mismatch")
    for style_nonce, text in parsed.styles:
        digest = base64.b64encode(hashlib.sha256(text.encode()).digest()).decode()
        check(style_nonce == nonce or "'sha256-" + digest + "'" in directives["style-src"], "Unauthorized stylesheet")
    return parsed.assets


STUB = r"""
require('http').createServer(async (req,res)=>{
  let body=''; for await(const chunk of req) body+=chunk;
  const accepted=req.method==='GET'||req.headers['x-xsrf-token']==='synthetic+csrf';
  res.setHeader('Content-Security-Policy',"default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  if(req.url.includes('/auth/csrf')) res.setHeader('Set-Cookie','XSRF-TOKEN=synthetic%2Bcsrf; Path=/; Secure; SameSite=Lax');
  if(req.url.includes('/auth/login')&&accepted) res.setHeader('Set-Cookie','session=synthetic; Path=/; HttpOnly; Secure; SameSite=Lax');
  if(req.url.includes('/auth/logout')&&accepted) res.setHeader('Set-Cookie','session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  res.writeHead(accepted?200:403,{'Content-Type':'application/json','Cache-Control':'no-store'});
  res.end(JSON.stringify({method:req.method,url:req.url,headers:req.headers,body,accepted}));
}).listen(8080,'0.0.0.0');
"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--image", default="nextsitrep-frontend:t08")
    parser.add_argument("--platform", default="linux/arm64")
    parser.add_argument("--buildx", help="Path to Buildx executable if docker buildx is unavailable")
    args = parser.parse_args()
    source = Path(__file__).resolve().parents[1]
    buildx = [args.buildx] if args.buildx else ["docker", "buildx"]
    suffix = uuid.uuid4().hex[:10]
    network = "t08-" + suffix
    containers = []
    results = []

    def run(command, timeout=180, allowed=(0,)):
        result = subprocess.run(command, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout)
        check(result.returncode in allowed, f"Command failed ({result.returncode}): {command[:3]}\n{result.stdout[-3000:]}\n{result.stderr[-5000:]}")
        return (result.stdout + result.stderr if command[:2] == ["docker", "logs"] else result.stdout).strip()

    def docker(*command, **kwargs):
        return run(["docker", *command], **kwargs)

    def passed(name, **evidence):
        results.append({"check": name, "status": "PASS", **evidence})
        print(json.dumps(results[-1]), flush=True)

    def build(context, image):
        run([*buildx, "build", "--platform", args.platform, "--load", "--build-arg", "API_PROXY_TARGET=http://backend:8080", "-t", image, str(context)], timeout=600)

    def inspect_layers(image, directory, marker):
        archive = directory / "image.tar"
        docker("image", "save", "-o", str(archive), image)
        count = 0
        with tarfile.open(archive) as outer:
            manifest = json.load(outer.extractfile("manifest.json"))[0]
            for name in [manifest["Config"], *manifest["Layers"]]:
                stream = outer.extractfile(name)
                if name == manifest["Config"]:
                    check(marker not in stream.read(), "Secret canary in image metadata")
                    continue
                with tarfile.open(fileobj=stream, mode="r|*") as layer:
                    for entry in layer:
                        parts = PurePosixPath(entry.name).parts
                        if parts and parts[0] == "app":
                            check(not any(p.startswith(".env") or p in (".aws", ".ssh", ".git") or p.endswith((".pem", ".key")) for p in parts), "Secret-like path in image layer: " + entry.name)
                        if entry.isfile():
                            data = layer.extractfile(entry)
                            tail = b""
                            while True:
                                chunk = data.read(1024 * 1024)
                                if not chunk:
                                    break
                                check(marker not in tail + chunk, "Secret canary in image layer")
                                tail = chunk[-len(marker):]
                count += 1
        archive.unlink()
        passed("all runtime layers and metadata", image=image, layers=count)

    def start(image, secure):
        name = "t08-app-" + uuid.uuid4().hex[:10]
        containers.append(name)
        docker("run", "-d", "--name", name, "--platform", args.platform, "--network", network,
               "--read-only", "--cap-drop=ALL", "--security-opt=no-new-privileges", "--pids-limit=128",
               "--tmpfs", "/tmp:rw,noexec,nosuid,size=32m",
               "--tmpfs", "/app/.next/cache:rw,noexec,nosuid,uid=1000,gid=1000,size=32m",
               "-p", "127.0.0.1::3000", "-e", "DEBUG=next:start-server", "-e", "HTTPS_DEPLOYMENT=" + str(secure).lower(), image)
        deadline = time.monotonic() + 30
        while time.monotonic() < deadline:
            state = json.loads(docker("inspect", name))[0]
            check(state["State"]["Running"], "Server exited: " + docker("logs", name))
            ports = state["NetworkSettings"]["Ports"].get("3000/tcp") or []
            if not ports:
                time.sleep(0.2)
                continue
            origin = "http://127.0.0.1:" + ports[0]["HostPort"]
            try:
                if request(origin, "/")[0] == 200:
                    return name, origin
            except (OSError, urllib.error.URLError):
                pass
            time.sleep(0.2)
        raise RuntimeError("Startup failed: " + docker("logs", name))

    def shutdown(name):
        began = time.monotonic()
        docker("stop", "--time", "10", name, timeout=15)
        elapsed = time.monotonic() - began
        state = json.loads(docker("inspect", name))[0]["State"]
        # Next 16.4.5 deliberately exits 128 + SIGTERM after its cleanup.
        logs = docker("logs", name)
        check(state["ExitCode"] == 143 and not state["OOMKilled"] and elapsed < 10
              and "start-server process cleanup finished" in logs,
              f"Unclean/forced shutdown: exit={state['ExitCode']}, seconds={elapsed:.3f}\n{logs[-3000:]}")
        passed("SIGTERM", seconds=round(elapsed, 3), exitCode=state["ExitCode"])

    with tempfile.TemporaryDirectory(prefix="nextsitrep-t08-") as temporary:
        temporary = Path(temporary)
        fixture = temporary / "frontend"
        # Never read/copy real environment files or credential directories.
        inputs = {"Dockerfile", ".dockerignore", "package.json", "bun.lock",
                  "next.config.ts", "proxy.ts", "tsconfig.json", "postcss.config.mjs",
                  "app", "components", "context", "lib", "public"}
        def ignored(directory, names):
            return [n for n in names
                    if (Path(directory) == source and n not in inputs)
                    or n.startswith(".env")
                    or n in ("node_modules", ".next", ".git", ".aws", ".ssh",
                             ".npmrc", ".netrc", "coverage")
                    or n.endswith((".env", ".pem", ".key", ".p12", ".pfx", ".log"))
                    or "credentials" in n.lower() or "secret" in n.lower()]
        shutil.copytree(source, fixture, ignore=ignored)
        marker = ("T08_SYNTHETIC_CANARY_" + suffix).encode()
        for name in (".env", ".env.production", ".env.production.local", ".env.staging", "local.env", "app/.env.production", "lib/.env.local", "public/.env.production", "public/test-secret.pem", "app/.aws/credentials", ".git/config", "coverage/result.json", "unapproved-file.txt"):
            path = fixture / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(marker)
        auditfile = temporary / "Context.Dockerfile"
        auditfile.write_text("FROM scratch\nCOPY . /\n")
        context_tar = temporary / "context.tar"
        run([*buildx, "build", "--platform", args.platform, "-f", str(auditfile), "--output", "type=tar,dest=" + str(context_tar), str(fixture)], timeout=120)
        with tarfile.open(context_tar) as archive:
            for entry in archive:
                if entry.isfile():
                    check(marker not in archive.extractfile(entry).read(), "Canary entered build context: " + entry.name)
        passed("build-context exclusions", canaries=14)
        build(source, args.image)
        image = json.loads(docker("image", "inspect", args.image))[0]
        check(image["Os"] + "/" + image["Architecture"] == args.platform, "Wrong architecture")
        check(image["Config"]["User"] == "1000:1000", "Wrong runtime USER")
        check(image["Config"]["Cmd"] == ["node", "server.js"], "Server must receive SIGTERM directly")
        passed("candidate image", id=image["Id"], architecture=args.platform, user=image["Config"]["User"], bytes=image["Size"])
        inspect_layers(args.image, temporary, marker)
        docker("network", "create", network)
        try:
            stub = "t08-stub-" + suffix
            containers.append(stub)
            docker("run", "-d", "--name", stub, "--network", network, "--network-alias", "backend", "--read-only", "--cap-drop=ALL", "--security-opt=no-new-privileges", "--entrypoint", "node", args.image, "-e", STUB)
            for secure in (False, True):
                name, origin = start(args.image, secure)
                identity = docker("exec", name, "id")
                check("uid=1000" in identity and "gid=1000" in identity, "Root process")
                docker("exec", name, "sh", "-ec", 'test ! -w /app/server.js; test ! -w /app; test ! -e /app/app; test ! -e /app/test; test ! -e /app/bun.lock; test ! -e /usr/local/bin/bun; test ! -e /app/node_modules/typescript; touch /tmp/t08 /app/.next/cache/t08; ! touch /app/t08; ! touch /app/server.js')
                seen = set()
                for path in ("/", "/login", "/t08-missing", "/favicon.ico-extra", "/favicon.ico/not-an-icon", "/_next/image-extra", "/actuator/health", "/"):
                    status, headers, body = request(origin, path, headers={"X-Nonce": "caller-selected-nonce", "Content-Security-Policy": "default-src *"})
                    check(status == (200 if path in ("/", "/login") else 404), "Unexpected document status: " + path)
                    assets = document(headers, body, secure, seen)
                    if path == "/":
                        for asset in assets:
                            code, asset_headers, _ = request(origin, asset)
                            check(code == 200 and "immutable" in asset_headers.get("Cache-Control", ""), "Missing runtime asset")
                passed("SSR, fresh nonces, 404 CSP, private health path and static assets", httpsDeployment=secure)
                for method, path in (("GET", "/api/v1/auth/csrf"), ("GET", "/api/v1/resources/search?zipCode=12345&keyword=health%20%26%20care"), ("POST", "/api/v1/auth/login"), ("PATCH", "/api/v1/resources/saved/synthetic/notes"), ("DELETE", "/api/v1/resources/saved/synthetic"), ("POST", "/api/v1/auth/logout")):
                    sent = {"Cookie": "session=synthetic; XSRF-TOKEN=synthetic%2Bcsrf", "Origin": origin, "X-XSRF-TOKEN": "synthetic+csrf", "Content-Type": "application/json", "Forwarded": "for=203.0.113.9;proto=attacker", "X-Forwarded-For": "203.0.113.9", "X-Forwarded-Proto": "attacker", "X-Real-IP": "203.0.113.9", "X-Nonce": "caller-selected-nonce"}
                    body = None if method == "GET" else b'{"synthetic":true}'
                    status, headers, response = request(origin, path, method, sent, body)
                    echo = json.loads(response)
                    check(status == 200 and echo["method"] == method and echo["url"] == path and echo["body"] == (body.decode() if body else ""), "API routing changed")
                    for field in ("cookie", "origin", "x-xsrf-token"):
                        check(echo["headers"][field] == next(v for k, v in sent.items() if k.lower() == field), "Cookie/CSRF transport changed")
                    check(echo["headers"]["x-forwarded-proto"] == ("https" if secure else "http"), "Forwarded scheme changed")
                    check("203.0.113.9" not in json.dumps({k: v for k, v in echo["headers"].items() if k.startswith("x-forwarded") or k in ("forwarded", "x-real-ip")}), "Spoofed identity forwarded")
                    check("x-nonce" not in echo["headers"], "Nonce forwarded to API")
                    check("default-src 'none'" in headers.get("Content-Security-Policy", ""), "Missing API CSP")
                    cookies = "; ".join(headers.get_all("Set-Cookie", []))
                    if path.endswith("/csrf"):
                        check("XSRF-TOKEN=" in cookies and "HttpOnly" not in cookies, "CSRF cookie unreadable")
                    if path.endswith(("/login", "/logout")):
                        check(all(v in cookies for v in ("HttpOnly", "Secure", "SameSite=Lax")) and "Domain=" not in cookies, "Session cookie changed")
                    if path.endswith("/logout"):
                        check("Max-Age=0" in cookies, "Logout cookie not cleared")
                check(request(origin, "/api/v1/resources/saved", "POST")[0] == 403, "Missing-CSRF write not rejected by fixture")
                passed("API methods, cookies, CSRF transport and spoof stripping", httpsDeployment=secure)
                passed("non-root and read-only filesystem", identity=identity, writable=["/tmp", "/app/.next/cache"])
                shutdown(name)
            # Synthetic-only server error and image-optimizer write exercise.
            error_route = fixture / "app/t08-error/page.tsx"
            error_route.parent.mkdir(parents=True)
            error_route.write_text('export const dynamic = "force-dynamic"; export default function Fixture(): never { throw new Error("Synthetic T08 error"); }')
            def png_chunk(kind, data):
                return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))
            png = b"\x89PNG\r\n\x1a\n" + png_chunk(b"IHDR", struct.pack(">IIBBBBB", 2, 2, 8, 2, 0, 0, 0)) + png_chunk(b"IDAT", zlib.compress(b"\x00\x12\x34\x56\x12\x34\x56" * 2)) + png_chunk(b"IEND", b"")
            (fixture / "public/t08.png").write_bytes(png)
            fixture_image = "nextsitrep-frontend:t08-fixture-" + suffix
            try:
                build(fixture, fixture_image)
                inspect_layers(fixture_image, temporary, marker)
                name, origin = start(fixture_image, True)
                status, headers, body = request(origin, "/t08-error")
                check(status == 500, "Missing synthetic 500")
                document(headers, body, True, set())
                status, _, body = request(origin, "/t08.png")
                check(status == 200 and body == png, "Public artifacts not served")
                status, headers, body = request(origin, "/_next/image?url=%2Ft08.png&w=64&q=75")
                check(status == 200 and headers.get_content_type().startswith("image/") and body, "Image optimizer/cache failed")
                passed("synthetic 500 CSP, public assets and image optimizer on cache tmpfs")
                shutdown(name)
            finally:
                for container in containers:
                    docker("rm", "-f", container, allowed=(0, 1))
                containers.clear()
                docker("image", "rm", fixture_image, allowed=(0, 1))
        finally:
            for container in containers:
                docker("rm", "-f", container, allowed=(0, 1))
            docker("network", "rm", network, allowed=(0, 1))
    print(json.dumps({"status": "PASS", "checks": len(results), "results": results}, indent=2))


if __name__ == "__main__":
    main()
