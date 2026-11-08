"""T09 container checks; Python 3.9+, Docker, Buildx; synthetic data only.

The production artifact contains no H2/test profile. Successful startup is checked
using an external read-only H2 fixture and PropertiesLauncher; PostgreSQL remains
T11. The normal entrypoint is exercised for hardened-profile rejection cases.
No AWS resources, public ports, live providers or deployment credentials are used.
"""

import argparse
import base64
import contextlib
import io
import json
from http.cookies import SimpleCookie
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import tarfile
import tempfile
import time
import urllib.parse
import uuid
import xml.etree.ElementTree as ET
import zipfile


def check(condition, message):
    if not condition:
        raise RuntimeError(message)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--image", default="nextsitrep-backend:t09")
    parser.add_argument("--platform", default="linux/arm64")
    parser.add_argument("--guards-only", action="store_true", help="Run independent image/profile guards; successful application startup is not tested")
    parser.add_argument("--buildx", help="Path to standalone Buildx executable")
    parser.add_argument("--evidence-dir", type=Path, required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    evidence = args.evidence_dir.resolve()
    evidence.mkdir(parents=True, exist_ok=True)
    buildx = [args.buildx] if args.buildx else ["docker", "buildx"]
    suffix = uuid.uuid4().hex[:10]
    builder_image = "nextsitrep-backend:t09-build-" + suffix
    network = "t09-" + suffix
    containers = []
    results = []
    network_created = False

    def run(command, timeout=120, allowed=(0,), logfile=None):
        result = subprocess.run(command, capture_output=True, text=True, timeout=timeout)
        if logfile:
            (evidence / logfile).write_text(result.stdout + result.stderr)
        check(result.returncode in allowed, f"Command failed ({result.returncode}): {command[:3]}\n{result.stdout[-2500:]}\n{result.stderr[-4000:]}")
        return (result.stdout + result.stderr if command[:2] == ["docker", "logs"] else result.stdout).strip()

    def docker(*command, **kwargs):
        return run(["docker", *command], **kwargs)

    def passed(name, **details):
        results.append({"check": name, "status": "PASS", **details})
        print(json.dumps(results[-1]), flush=True)

    def build(context, image, target=None):
        command = [*buildx, "build", "--platform", args.platform, "--load", "-t", image]
        if target:
            command += ["--target", target]
        run([*command, str(context)], timeout=900, logfile="build-" + (target or "runtime") + ".log")

    restrictions = ["--read-only", "--cap-drop=ALL", "--security-opt=no-new-privileges",
                    "--memory=1280m", "--cpus=2", "--pids-limit=128",
                    "--tmpfs", "/tmp:rw,noexec,nosuid,nodev,mode=1777,size=64m"]

    def cleanup_resources():
        for name in containers:
            docker("rm", "-f", name, allowed=(0, 1))
        if network_created:
            docker("network", "rm", network, allowed=(0, 1))
        docker("image", "rm", builder_image, allowed=(0, 1))

    with tempfile.TemporaryDirectory(prefix="nextsitrep-t09-container-") as temporary, contextlib.ExitStack() as cleanup:
        cleanup.callback(cleanup_resources)
        temporary = Path(temporary)
        context = temporary / "context"
        # Copy only reviewed build inputs; never read workstation credential files.
        inputs = {"Dockerfile", ".dockerignore", "mvnw", "pom.xml", ".mvn", "src"}
        def ignored(directory, names):
            return [n for n in names if (Path(directory) == root and n not in inputs)
                    or n.startswith(".env") or n in (".aws", ".ssh", ".git", ".npmrc", ".netrc", "target")
                    or n.endswith((".env", ".pem", ".key", ".p12", ".pfx", ".log", ".db"))
                    or "secret" in n.lower() or "credentials" in n.lower()]
        shutil.copytree(root, context, ignore=ignored)
        marker = ("T09_SYNTHETIC_CANARY_" + suffix).encode()
        canaries = [".env", ".env.production", ".env.aws-dev.local", "local.env",
                    ".aws/credentials", ".git/config", "target/app.jar", "unapproved.txt",
                    "src/main/resources/.env.production", "src/main/resources/.aws/credentials",
                    "src/main/resources/private.key", "src/main/resources/test-secret.pem",
                    "src/main/resources/local.sqlite", "src/test/resources/.env.test.local"]
        for name in canaries:
            file = context / name
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_bytes(marker)
        auditfile = temporary / "Context.Dockerfile"
        auditfile.write_text("FROM scratch\nCOPY . /\n")
        archive = temporary / "context.tar"
        run([*buildx, "build", "--platform", args.platform, "-f", str(auditfile),
             "--output", "type=tar,dest=" + str(archive), str(context)], logfile="context-build.log")
        with tarfile.open(archive) as exported:
            names = {entry.name.lstrip("./") for entry in exported.getmembers()}
            check("src/test/resources/application-test.properties" in names, "Build must retain existing tests")
            for entry in exported:
                if entry.isfile():
                    check(marker not in exported.extractfile(entry).read(), "Canary entered context: " + entry.name)
        passed("build-context exclusion", canaries=len(canaries))

        # Build the canary-containing context: excluded canaries must reach no layer.
        build(context, args.image)
        image = json.loads(docker("image", "inspect", args.image))[0]
        check(image["Os"] + "/" + image["Architecture"] == args.platform, "Wrong architecture")
        check(image["Config"]["User"] == "10001:10001", "Missing non-root USER")
        check(set(image["Config"]["ExposedPorts"]) == {"8080/tcp"}, "Unexpected exposed port")
        entrypoint = image["Config"]["Entrypoint"]
        check(entrypoint[0] == "java" and entrypoint[-2:] == ["-jar", "/app/app.jar"], "Java must receive signals directly")
        flags = entrypoint[1:-2]
        passed("ARM64 candidate metadata", id=image["Id"], user=image["Config"]["User"], bytes=image["Size"])

        archive = temporary / "image.tar"
        docker("image", "save", "-o", str(archive), args.image)
        jar_bytes = None
        layers = 0
        with tarfile.open(archive) as outer:
            manifest = json.load(outer.extractfile("manifest.json"))[0]
            check(marker not in outer.extractfile(manifest["Config"]).read(), "Canary in metadata")
            for name in manifest["Layers"]:
                with tarfile.open(fileobj=outer.extractfile(name), mode="r|*") as layer:
                    for entry in layer:
                        parts = PurePosixPath(entry.name).parts
                        if parts and parts[0] == "app":
                            check(not any(p.startswith(".env") or p in (".aws", ".ssh", ".git", "src", "target") for p in parts), "Forbidden runtime path: " + entry.name)
                        if entry.isfile():
                            data = layer.extractfile(entry)
                            if entry.name.lstrip("./") == "app/app.jar":
                                jar_bytes = data.read()
                                check(marker not in jar_bytes, "Canary in application artifact")
                            else:
                                tail = b""
                                while True:
                                    chunk = data.read(1024 * 1024)
                                    if not chunk:
                                        break
                                    check(marker not in tail + chunk, "Canary in runtime layer")
                                    tail = chunk[-len(marker):]
                layers += 1
        check(jar_bytes is not None, "Missing application artifact")
        with zipfile.ZipFile(io.BytesIO(jar_bytes)) as jar:
            names = jar.namelist()
            check(not any("application-test.properties" in n or n.startswith("BOOT-INF/lib/h2-") or "junit" in n or "mockito" in n for n in names), "Test artifacts shipped")
            for required in ("application.properties", "application-deploy.properties", "db/migration/V1__create_initial_schema.sql"):
                check("BOOT-INF/classes/" + required in names, "Missing production resource " + required)
            check("META-INF/spring.factories" in names, "Missing root startup-validator registration")
        passed("minimal runtime, production resources and all-layer secret checks", layers=layers)
        docker("run", "--rm", "--entrypoint", "sh", args.image, "-ec",
               'test "$(id -u)" = 10001; test ! -w /app; test ! -w /app/app.jar; ! command -v javac; ! command -v mvn; ! command -v curl; test ! -e /app/src')
        vm = docker("run", "--rm", *restrictions, "--entrypoint", "java", args.image,
                    *flags, "-XX:+PrintFlagsFinal", "-version", logfile="jvm-flags.log")
        maximum = int(re.search(r"\bMaxHeapSize\s+=\s+(\d+)", vm)[1])
        initial = int(re.search(r"\bInitialHeapSize\s+=\s+(\d+)", vm)[1])
        limit = 1280 * 1024 * 1024
        check(0.58 * limit <= maximum <= 0.61 * limit and 0.14 * limit <= initial <= 0.16 * limit, "JVM ignored container memory limit")
        passed("container-aware JVM budget", limitBytes=limit, maxHeapBytes=maximum, initialHeapBytes=initial)

        # Export existing test-only dependencies from the verified builder, never
        # from host caches and never into the production image.
        build(context, builder_image, "build")
        created = docker("create", builder_image)
        containers.append(created)
        fixture = temporary / "fixture"
        fixture.mkdir()
        h2 = ET.parse(root / "pom.xml").find("{*}properties/{*}h2.version").text
        docker("cp", created + f":/root/.m2/repository/com/h2database/h2/{h2}/h2-{h2}.jar", str(fixture / "h2.jar"))
        (evidence / "jacoco").mkdir(exist_ok=True)
        (evidence / "surefire-reports").mkdir(exist_ok=True)
        docker("cp", created + ":/build/target/site/jacoco/.", str(evidence / "jacoco"))
        docker("cp", created + ":/build/target/surefire-reports/.", str(evidence / "surefire-reports"))
        tests = failures = errors = skipped = reported_tests = 0
        for report in (evidence / "surefire-reports").glob("TEST-*.xml"):
            suite = ET.parse(report).getroot()
            # Surefire's aggregate attributes undercount two existing nested
            # suites; count actual testcase elements (217, matching Maven).
            cases = suite.findall("testcase")
            tests += len(cases)
            reported_tests += int(suite.get("tests", 0))
            failures += max(int(suite.get("failures", 0)), sum(c.find("failure") is not None for c in cases))
            errors += max(int(suite.get("errors", 0)), sum(c.find("error") is not None for c in cases))
            skipped += max(int(suite.get("skipped", 0)), sum(c.find("skipped") is not None for c in cases))
        check(tests >= 217 and failures == errors == skipped == 0, "Builder tests regressed")
        line = next(c for c in ET.parse(evidence / "jacoco/jacoco.xml").getroot().findall("counter") if c.get("type") == "LINE")
        covered = int(line.get("covered")); total = covered + int(line.get("missed"))
        check(covered / total >= 0.70, "Coverage below existing gate")
        passed("builder Maven verification", tests=tests, failures=failures, errors=errors, skips=skipped, coveredLines=covered, totalLines=total, surefireReportedTests=reported_tests)
        properties = (root / "src/test/resources/application-test.properties").read_text()
        # Tighten transport in this isolated test fixture; no permissive chain or
        # Flyway/Hibernate override. The production JAR/image remain unchanged.
        properties += "\nsecurity.jwt.cookie-secure=true\ncors.allowed-origins=https://t09.example.test\nsecurity.https.required=true\nsecurity.proxy.trusted-ips=127.0.0.1\n"
        (fixture / "application-test.properties").write_text(properties)
        shutil.copyfile(root / "test/HttpProbe.java", fixture / "HttpProbe.java")
        docker("run", "--rm", "-v", str(fixture) + ":/fixture", "--entrypoint", "javac", builder_image,
               "-d", "/fixture", "/fixture/HttpProbe.java")
        docker("network", "create", "--internal", network)
        network_created = True
        try:
            if not args.guards_only:
                app = "t09-app-" + suffix
                containers.append(app)
                docker("run", "-d", "--name", app, "--network", network, "--network-alias", "backend",
                       *restrictions, "-v", str(fixture) + ":/fixture:ro", "-e", "SPRING_PROFILES_ACTIVE=test",
                       "--entrypoint", "java", args.image, *flags, "-Dloader.path=/fixture", "-cp", "/app/app.jar",
                       "org.springframework.boot.loader.launch.PropertiesLauncher")

                def probe(path, method="GET", body=None, headers=None, peer=False):
                    body64 = base64.b64encode(json.dumps(body).encode() if body is not None else b"").decode()
                    url = ("http://backend:8080" if peer else "http://127.0.0.1:8080") + path
                    client = ["java", "-Xmx32m", "-cp", "/fixture", "HttpProbe", url, method, body64]
                    client += [k + "=" + v for k, v in (headers or {}).items()]
                    if peer:
                        output = docker("run", "--rm", "--network", network, *restrictions,
                                        "-v", str(fixture) + ":/fixture:ro", "--entrypoint", "java", args.image, *client[1:])
                    else:
                        output = docker("exec", app, *client)
                    lines = output.splitlines()
                    response_headers = {}
                    for value in lines[2:]:
                        name, value = value.split(":", 1)
                        response_headers.setdefault(name, []).append(base64.b64decode(value).decode())
                    return int(lines[0]), response_headers, base64.b64decode(lines[1])

                began = time.monotonic()
                while time.monotonic() - began < 60:
                    state = json.loads(docker("inspect", app))[0]
                    check(state["State"]["Running"], "Startup failed: " + docker("logs", app))
                    try:
                        if probe("/actuator/health")[0] == 200:
                            break
                    except RuntimeError:
                        pass
                    time.sleep(1)
                else:
                    raise RuntimeError("No readiness within 60s: " + docker("logs", app))
                startup = time.monotonic() - began
                state = json.loads(docker("inspect", app))[0]
                check(not state["HostConfig"]["PortBindings"] and state["HostConfig"]["ReadonlyRootfs"], "Backend port/filesystem exposure")
                docker("exec", app, "sh", "-ec", 'test "$(id -u)" = 10001; test ! -w /app; test ! -w /app/app.jar; touch /tmp/t09; ! touch /app/t09; ! touch /etc/t09')
                status, _, body = probe("/actuator/health")
                health = json.loads(body)
                check(status == 200 and health.get("status") == "UP"
                      and set(health) <= {"status", "groups"}
                      and set(health.get("groups", [])) <= {"liveness", "readiness"},
                      "Health leaks details or is not UP: " + body.decode())
                docker("exec", app, "wget", "-q", "-O", "/dev/null", "http://localhost:8080/actuator/health")
                docker("exec", app, "sh", "-ec", "! wget -q -O /dev/null http://localhost:8080/api/v1/auth/csrf")
                passed("synthetic startup, minimal health and read-only operation", seconds=round(startup, 3), database="external H2 fixture; not PostgreSQL")
                https = {"X-Forwarded-Proto": "https", "Origin": "https://t09.example.test"}
                check(probe("/api/v1/auth/csrf")[0] == 403, "Plain HTTP accepted")
                check(probe("/api/v1/auth/csrf", headers=https, peer=True)[0] == 403, "Untrusted peer spoof accepted")
                check(probe("/api/v1/auth/me", headers=https)[0] == 401, "Unauthenticated request accepted")
                status, headers, _ = probe("/api/v1/auth/csrf", headers=https)
                check(status == 204, "CSRF bootstrap failed")
                for key, value in {"strict-transport-security": "max-age=31536000", "x-frame-options": "DENY", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer"}.items():
                    check(headers.get(key) == [value], "Security header changed: " + key)
                check("default-src 'none'" in headers.get("content-security-policy", [""])[0], "API CSP changed")
                csrf_cookie = SimpleCookie()
                for value in headers.get("set-cookie", []):
                    csrf_cookie.load(value)
                check("XSRF-TOKEN" in csrf_cookie and csrf_cookie["XSRF-TOKEN"]["secure"] and not csrf_cookie["XSRF-TOKEN"]["httponly"], "CSRF cookie transport changed")
                token = csrf_cookie["XSRF-TOKEN"].value
                auth_headers = {**https, "Cookie": "XSRF-TOKEN=" + token, "X-XSRF-TOKEN": urllib.parse.unquote(token), "Content-Type": "application/json"}
                account = {"email": "t09-" + suffix + "@example.test", "firstName": "Synthetic", "lastName": "Tester", "branchOfService": "ARMY", "zipCode": "12345", "password": "synthetic-password-123"}
                check(probe("/api/v1/auth/register", "POST", account, https)[0] == 403, "Missing CSRF accepted")
                status, headers, _ = probe("/api/v1/auth/register", "POST", account, auth_headers)
                check(status == 201, "Synthetic registration failed")
                status, headers, _ = probe("/api/v1/auth/login", "POST", {"email": account["email"], "password": account["password"]}, auth_headers)
                check(status == 200, "BCrypt login failed")
                session = SimpleCookie()
                for value in headers.get("set-cookie", []):
                    session.load(value)
                check("vc_session" in session, "Session cookie missing")
                cookie = session["vc_session"]
                check(cookie["secure"] and cookie["httponly"] and cookie["samesite"] == "Lax" and not cookie["domain"], "Session cookie weakened")
                signed = {**auth_headers, "Cookie": auth_headers["Cookie"] + "; vc_session=" + cookie.value}
                check(probe("/api/v1/auth/me", headers=signed)[0] == 200, "Signed JWT session rejected")
                check(probe("/api/v1/auth/me", headers={**https, "Authorization": "Bearer forged.synthetic.token"})[0] == 401, "Forged JWT accepted")
                management = {}
                for path in ("/actuator/env", "/actuator/configprops"):
                    check(probe(path, headers=https)[0] == 401, "Unauthenticated management exposed: " + path)
                    status, _, body = probe(path, headers=signed)
                    check(status in (401, 403, 404), "Sensitive management exposed: " + path + " status=" + str(status) + " body=" + body.decode())
                    management[path] = status
                check(probe("/actuator/health/readiness", headers=https)[0] == 401, "Unauthenticated readiness bypass")
                status, _, body = probe("/actuator/health/readiness", headers=signed)
                check(status in (401, 403, 404) or (status == 200 and json.loads(body) == {"status": "UP"}),
                      "Readiness details exposed: " + body.decode())
                management["/actuator/health/readiness"] = status
                check(probe("/api/v1/auth/logout", "POST", headers=signed)[0] == 204, "Logout failed")
                check(probe("/api/v1/auth/csrf", headers={**https, "Origin": "https://evil.example.test"})[0] == 403, "Wildcard CORS accepted")
                passed("real security chain on test fixture", verified=["TLS/peer rejection", "headers", "CSRF", "exact CORS", "BCrypt", "JWT", "Secure cookies", "management denial"], managementStatuses=management)
                began = time.monotonic()
                docker("stop", "--time", "20", app, timeout=25)
                elapsed = time.monotonic() - began
                state = json.loads(docker("inspect", app))[0]["State"]
                logs = docker("logs", app, logfile="runtime-fixture.log")
                check(state["ExitCode"] == 143 and not state["OOMKilled"] and elapsed < 20
                      and "Graceful shutdown complete" in logs, "Unclean/forced shutdown: " + str(state))
                passed("SIGTERM graceful shutdown", seconds=round(elapsed, 3), exitCode=state["ExitCode"])

            base_env = {"SPRING_PROFILES_ACTIVE": "aws-dev", "SPRING_DATASOURCE_URL": "jdbc:postgresql://unreachable.invalid:5432/t09",
                        "SPRING_DATASOURCE_USERNAME": "synthetic", "SPRING_DATASOURCE_PASSWORD": "synthetic-only",
                        "JWT_SECRET": "TmV4dFNJVFJFUCB0ZXN0LW9ubHkgSldUIGZpeHR1cmU7IG5ldmVyIGRlcGxveSB0aGlzIGtleS4=",
                        "CORS_ALLOWED_ORIGINS": "https://t09.example.test", "TRUSTED_PROXY_IPS": "127.0.0.1"}
            cases = [("missing-key", {"JWT_SECRET": ""}, "JWT_SECRET"),
                     ("weak-key", {"JWT_SECRET": "c2hvcnQ="}, "JWT_SECRET"),
                     ("legacy-key", {"JWT_SECRET": "VmV0ZXJhbnNDb25uZWN0U2VjcmV0S2V5Rm9yVmV0ZXJhbnNDb25uZWN0MjAyNg=="}, "JWT_SECRET"),
                     ("missing-proxy", {"TRUSTED_PROXY_IPS": ""}, "TRUSTED_PROXY_IPS"),
                     ("insecure-cookie", {"JWT_COOKIE_SECURE": "false"}, "JWT_COOKIE_SECURE"),
                     ("wildcard-cors", {"CORS_ALLOWED_ORIGINS": "*"}, "CORS_ALLOWED_ORIGINS"),
                     ("disabled-flyway", {"SPRING_FLYWAY_ENABLED": "false"}, "spring.flyway.enabled"),
                     ("packaged-test", {"SPRING_PROFILES_ACTIVE": "test"}, "test-classpath configuration")]
            for case, override, expected in cases:
                name = "t09-reject-" + case + "-" + suffix
                containers.append(name)
                envfile = temporary / (case + ".env")
                envfile.write_text("".join(k + "=" + v + "\n" for k, v in {**base_env, **override}.items()))
                envfile.chmod(0o600)
                docker("run", "-d", "--name", name, "--network", network, *restrictions, "--env-file", str(envfile), args.image)
                code = int(docker("wait", name, timeout=30))
                logs = docker("logs", name)
                check(code != 0 and expected in logs, "Packaged guard failed: " + case)
                check("synthetic-only" not in logs and "HikariPool" not in logs, "Guard leaked secret or initialized DB")
            passed("normal production entrypoint startup guards", cases=len(cases), databaseConnections=0)
        finally:
            for name in containers:
                docker("rm", "-f", name, allowed=(0, 1))
            containers.clear()
            if network_created:
                docker("network", "rm", network, allowed=(0, 1))
            docker("image", "rm", builder_image, allowed=(0, 1))
        summary = {"status": "PASS", "mode": "guards-only" if args.guards_only else "full", "image": image["Id"], "checks": results,
                   "limitations": ["External H2 startup fixture is not PostgreSQL evidence (T11)", "No AWS/EC2 acceptance or T12 image scanning"]}
        (evidence / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
        print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
