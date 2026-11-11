import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import sharp from "sharp";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
const next = require.resolve("next/dist/bin/next");
const apiPolicy =
  "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

function launch(args, cwd, env) {
  const child = spawn(process.execPath, [next, ...args], {
    cwd,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1", ...env },
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 90_000,
  });
  let output = "";
  for (const stream of [child.stdout, child.stderr]) {
    stream.on("data", (data) => {
      output = (output + data).slice(-48_000);
    });
  }
  return { child, output: () => output };
}

async function stop({ child }) {
  if (child.exitCode !== null) return;
  const exited = once(child, "exit");
  child.kill("SIGTERM");
  await Promise.race([exited, delay(5_000)]);
  if (child.exitCode === null && child.signalCode === null) {
    child.kill("SIGKILL");
    await exited;
  }
}

async function start(cwd, flag, indexing = "false") {
  const process = launch(
    ["start", "--hostname", "127.0.0.1", "--port", "0"],
    cwd,
    {
      NODE_ENV: "production",
      HTTPS_DEPLOYMENT: flag,
      SITE_URL: "https://nextsitrep.org",
      SITE_INDEXING_ENABLED: indexing,
      NEXTSITREP_CONTACT_EMAIL: "",
    },
  );
  try {
    for (let attempt = 0; attempt < 200; attempt++) {
      assert.equal(process.child.exitCode, null, process.output());
      const address = process
        .output()
        .match(/Local:\s+(http:\/\/127\.0\.0\.1:\d+)/);
      if (address && process.output().includes("Ready")) {
        return { ...process, origin: address[1] };
      }
      await delay(100);
    }
    throw new Error(`Next did not become ready: ${process.output()}`);
  } catch (error) {
    await stop(process);
    throw error;
  }
}

function request(url, options = {}) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(10_000) });
}

function verifyDocument(response, body, flag, nonces) {
  assert.match(response.headers.get("content-type") ?? "", /^text\/html/);
  const policy = response.headers.get("content-security-policy") ?? "";
  const match = policy.match(
    /script-src 'self' 'nonce-([^']+)' 'strict-dynamic'/,
  );
  assert.ok(match, `Missing nonce CSP for ${response.url}`);
  const nonce = match[1];
  assert.match(nonce, /^[A-Za-z0-9+/]{43}=$/);
  assert.ok(!nonces.has(nonce), "Nonce was reused");
  nonces.add(nonce);
  assert.ok(!body.includes("caller-selected-nonce"));
  assert.ok(!policy.includes("unsafe-eval"));
  const directives = new Map(
    policy.split(";").map((value) => {
      const [name, ...sources] = value.trim().split(/\s+/);
      return [name, sources];
    }),
  );
  assert.ok(!directives.get("script-src").includes("'unsafe-inline'"));
  assert.ok(!directives.get("style-src").includes("'unsafe-inline'"));
  assert.match(response.headers.get("cache-control") ?? "", /private/);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.equal(
    response.headers.get("permissions-policy"),
    "camera=(), microphone=(), geolocation=()",
  );
  assert.equal(
    response.headers.get("strict-transport-security"),
    flag === "true" ? "max-age=31536000" : null,
  );
  assert.equal(policy.includes("upgrade-insecure-requests"), flag === "true");
  const dom = new JSDOM(body);
  try {
    const document = dom.window.document;
    assert.ok(document.querySelectorAll("script").length > 0);
    for (const script of document.querySelectorAll("script")) {
      assert.equal(
        script.nonce,
        nonce,
        "Rendered script does not match CSP nonce",
      );
    }
    for (const style of document.querySelectorAll("style")) {
      if (style.nonce === nonce) continue;
      const hash = createHash("sha256")
        .update(style.textContent)
        .digest("base64");
      assert.ok(
        directives.get("style-src").includes(`'sha256-${hash}'`),
        "Unnonced error stylesheet is not hash-authorized",
      );
    }
    return [
      ...document.querySelectorAll("script[src], link[rel=stylesheet]"),
    ].map(
      (element) => element.getAttribute("src") ?? element.getAttribute("href"),
    );
  } finally {
    dom.window.close();
  }
}

test(
  "production HTML error CSP, assets and shared-origin API",
  { timeout: 120_000 },
  async (t) => {
    const temporary = await mkdtemp(join(tmpdir(), "nextsitrep-csp-"));
    const source = join(temporary, "frontend");
    let latestRequest;
    let secureCookies = false;
    const upstream = createServer(async (request, response) => {
      let body = "";
      for await (const chunk of request) body += chunk;
      latestRequest = {
        method: request.method,
        url: request.url,
        headers: request.headers,
        body,
      };
      const suffix = secureCookies ? "; Secure" : "";
      response.setHeader("Content-Security-Policy", apiPolicy);
      response.setHeader("X-Content-Type-Options", "nosniff");
      if (request.url.startsWith("/api/v1/auth/csrf")) {
        response.setHeader(
          "Set-Cookie",
          `XSRF-TOKEN=synthetic%2Bcsrf; Path=/; SameSite=Lax${suffix}`,
        );
        response.writeHead(204).end();
        return;
      }
      const accepted =
        request.method === "GET" ||
        request.headers["x-xsrf-token"] === "synthetic+csrf";
      if (accepted && request.url.startsWith("/api/v1/auth/login")) {
        response.setHeader(
          "Set-Cookie",
          `session=synthetic; Path=/; HttpOnly; SameSite=Lax${suffix}`,
        );
      }
      if (accepted && request.url.startsWith("/api/v1/auth/logout")) {
        response.setHeader(
          "Set-Cookie",
          `session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${suffix}`,
        );
      }
      response.writeHead(accepted ? 200 : 403, {
        "Content-Type": "application/json",
      });
      response.end(JSON.stringify({ synthetic: true, accepted }));
    });
    upstream.listen(0, "127.0.0.1");
    await once(upstream, "listening");
    try {
      await cp(root, source, {
        recursive: true,
        filter: (path) =>
          ![
            ".git",
            "node_modules",
            ".next",
            "coverage",
            "tsconfig.tsbuildinfo",
          ].includes(basename(path)) && !basename(path).startsWith(".env"),
      });
      // Reuse installed dependencies. Never install packages or copy environment files.
      await symlink(
        join(root, "node_modules"),
        join(source, "node_modules"),
        "junction",
      );
      await mkdir(join(source, "public"), { recursive: true });
      await sharp({
        create: { width: 2, height: 2, channels: 4, background: "#123456" },
      })
        .png()
        .toFile(join(source, "public", "csp-probe.png"));
      // A throwing route exists only in the isolated test build, never the app.
      await mkdir(join(source, "app", "t04-error"), { recursive: true });
      await writeFile(
        join(source, "app", "t04-error", "page.tsx"),
        'export const dynamic = "force-dynamic"; export default function ErrorFixture(): never { throw new Error("Synthetic CSP regression fixture"); }',
      );
      const build = launch(["build", "--webpack"], source, {
        NODE_ENV: "production",
        API_PROXY_TARGET: `http://127.0.0.1:${upstream.address().port}`,
        SITE_URL: "https://nextsitrep.org",
        SITE_INDEXING_ENABLED: "false",
        NEXTSITREP_CONTACT_EMAIL: "",
      });
      try {
        const [code] = await once(build.child, "exit");
        assert.equal(code, 0, build.output());
      } finally {
        await stop(build);
      }
      for (const flag of ["false", "true"]) {
        await t.test(`HTTPS_DEPLOYMENT=${flag}`, async () => {
          secureCookies = flag === "true";
          const server = await start(source, flag);
          try {
            const nonces = new Set();
            const assets = new Set();
            for (const path of [
              "/",
              "/login",
              "/t04-missing",
              "/favicon.ico-extra",
              "/favicon.ico/not-an-icon",
              "/faviconXico",
              "/favicon%2eico-extra",
              "/_next/image-extra",
              "/_next/image/not-an-image",
              "/_next/static",
              "/_next/static-extra",
              "/",
            ]) {
              const response = await request(server.origin + path, {
                headers: {
                  "x-nonce": "caller-selected-nonce",
                  "Content-Security-Policy": "default-src *",
                },
              });
              assert.equal(
                response.status,
                path === "/" || path === "/login" ? 200 : 404,
                path,
              );
              for (const asset of verifyDocument(
                response,
                await response.text(),
                flag,
                nonces,
              ))
                assets.add(asset);
            }
            // Verify metadata in initial HTML, without hydration or a session.
            const publicPaths = [
              "/",
              "/guides",
              "/privacy",
              "/terms",
              "/disclaimer",
              ...[
                "healthcare",
                "benefits",
                "mental-health",
                "housing",
                "financial-assistance",
                "education",
                "employment",
              ].map((slug) => `/resources/${slug}`),
            ];
            const titles = new Set();
            const descriptions = new Set();
            for (const path of publicPaths) {
              const response = await request(server.origin + path);
              assert.equal(response.status, 200, path);
              assert.match(
                response.headers.get("x-robots-tag") ?? "",
                /noindex/,
              );
              const html = await response.text();
              verifyDocument(response, html, flag, nonces);
              const dom = new JSDOM(html);
              try {
                const document = dom.window.document;
                const title = document.querySelector("title")?.textContent;
                const description = document.querySelector(
                  'meta[name="description"]',
                )?.content;
                assert.ok(title?.endsWith(" | NextSITREP"), title);
                assert.ok(!titles.has(title), `Duplicate title ${title}`);
                assert.ok(
                  description && !descriptions.has(description),
                  `Duplicate description ${path}`,
                );
                titles.add(title);
                descriptions.add(description);
                assert.equal(
                  document.querySelector('link[rel="canonical"]')?.href,
                  `https://nextsitrep.org${path}`,
                );
                assert.equal(
                  new URL(
                    document.querySelector('meta[property="og:url"]')?.content,
                  ).href,
                  `https://nextsitrep.org${path}`,
                );
                assert.equal(
                  document.querySelector('meta[property="og:site_name"]')
                    ?.content,
                  "NextSITREP",
                );
                assert.match(
                  document.querySelector('meta[name="robots"]')?.content ?? "",
                  /noindex/,
                );
                assert.equal(document.querySelectorAll("h1").length, 1);
                assert.equal(
                  document
                    .querySelector('nav[aria-label="Primary"] a')
                    ?.textContent.trim(),
                  "NextSITREP",
                );
                assert.match(
                  document.querySelector('meta[name="viewport"]')?.content ??
                    "",
                  /width=device-width/,
                );
                if (path === "/" || path.startsWith("/resources/")) {
                  const data = document.querySelector(
                    'script[type="application/ld+json"]',
                  );
                  assert.ok(data, `Missing structured data ${path}`);
                  const graph = JSON.parse(data.textContent);
                  assert.equal(graph["@context"], "https://schema.org");
                  if (path === "/")
                    assert.deepEqual(
                      graph["@graph"].map((item) => item["@type"]),
                      ["Organization", "WebSite"],
                    );
                  else {
                    assert.equal(graph["@type"], "BreadcrumbList");
                    assert.equal(
                      graph.itemListElement.at(-1).item,
                      `https://nextsitrep.org${path}`,
                    );
                    assert.ok(
                      document.querySelector('nav[aria-label="Breadcrumb"]'),
                    );
                    assert.ok(
                      document.querySelector(
                        'a[href^="https://www.va.gov/"], a[href^="https://www.vetcenter.va.gov/"]',
                      ),
                    );
                  }
                }
              } finally {
                dom.window.close();
              }
            }
            for (const path of [
              "/login",
              "/register",
              "/dashboard",
              "/saved",
              "/resources?zipCode=12345&keyword=private-interest",
            ]) {
              const response = await request(server.origin + path);
              assert.equal(response.status, 200, path);
              assert.match(
                response.headers.get("x-robots-tag") ?? "",
                /noindex/,
              );
              const dom = new JSDOM(await response.text());
              try {
                const document = dom.window.document;
                assert.match(
                  document.querySelector('meta[name="robots"]')?.content ?? "",
                  /noindex/,
                );
                assert.ok(!document.querySelector('link[rel="canonical"]'));
                assert.ok(
                  !document
                    .querySelector("title")
                    .textContent.includes("private-interest"),
                );
              } finally {
                dom.window.close();
              }
            }
            const robots = await request(`${server.origin}/robots.txt`);
            assert.equal(robots.status, 200);
            assert.match(
              robots.headers.get("content-type") ?? "",
              /text\/plain/,
            );
            assert.match(await robots.text(), /Disallow: \/\s*$/);
            const sitemap = await request(`${server.origin}/sitemap.xml`);
            assert.equal(sitemap.status, 200);
            assert.match(sitemap.headers.get("content-type") ?? "", /xml/);
            assert.ok(!(await sitemap.text()).includes("<loc>"));
            for (const path of ["/nextsitrep-social.png", "/apple-icon.png"]) {
              const asset = await request(server.origin + path);
              assert.equal(asset.status, 200, path);
              assert.match(asset.headers.get("content-type") ?? "", /^image\//);
              const size = await sharp(
                Buffer.from(await asset.arrayBuffer()),
              ).metadata();
              assert.equal(size.width, path.includes("social") ? 1200 : 180);
              assert.equal(size.height, path.includes("social") ? 630 : 180);
            }
            const unknown = await request(
              `${server.origin}/resources/not-a-guide`,
            );
            assert.equal(unknown.status, 404);
            const failure = await request(`${server.origin}/t04-error`);
            assert.equal(failure.status, 500);
            verifyDocument(failure, await failure.text(), flag, nonces);
            for (const path of assets) {
              assert.ok(path.startsWith("/_next/static/"));
              const response = await request(server.origin + path);
              assert.equal(response.status, 200, path);
              assert.match(
                response.headers.get("cache-control") ?? "",
                /immutable/,
              );
              assert.ok(
                !(response.headers.get("content-type") ?? "").includes(
                  "text/html",
                ),
              );
              await response.arrayBuffer();
            }
            const favicon = await request(`${server.origin}/favicon.ico?v=1`);
            assert.equal(favicon.status, 200);
            assert.match(favicon.headers.get("content-type") ?? "", /^image\//);
            await favicon.arrayBuffer();
            const image = await request(
              `${server.origin}/_next/image?url=%2Fcsp-probe.png&w=64&q=75`,
            );
            assert.equal(image.status, 200);
            assert.match(image.headers.get("content-type") ?? "", /^image\//);
            assert.ok((await image.arrayBuffer()).byteLength > 0);
            const missingAsset = await request(
              `${server.origin}/_next/static/missing.js`,
            );
            assert.equal(missingAsset.status, 404);
            assert.match(
              missingAsset.headers.get("content-type") ?? "",
              /^text\/plain/,
            );
            await missingAsset.text();
            const csrf = await request(`${server.origin}/api/v1/auth/csrf`);
            assert.equal(csrf.status, 204);
            assert.match(
              csrf.headers.get("set-cookie") ?? "",
              /XSRF-TOKEN=synthetic%2Bcsrf/,
            );
            assert.ok(
              !(csrf.headers.get("set-cookie") ?? "").includes("HttpOnly"),
            );
            const headers = {
              Cookie: "session=synthetic; XSRF-TOKEN=synthetic%2Bcsrf",
              Origin: server.origin,
              "X-XSRF-TOKEN": "synthetic+csrf",
              "Content-Type": "application/json",
              Forwarded: "for=203.0.113.9;proto=attacker",
              "X-Forwarded-For": "203.0.113.9",
              "X-Forwarded-Proto": "attacker",
              "X-Forwarded-Host": "evil.test",
              "X-Forwarded-Port": "9999",
              "X-Real-IP": "203.0.113.9",
              "X-Nonce": "caller-selected-nonce",
              "Content-Security-Policy": "default-src *",
            };
            for (const [method, path] of [
              [
                "GET",
                "/api/v1/resources/search?zipCode=12345&keyword=health%20%26%20care",
              ],
              ["POST", "/api/v1/auth/login"],
              ["PATCH", "/api/v1/resources/saved/synthetic/notes"],
              ["DELETE", "/api/v1/resources/saved/synthetic"],
              ["POST", "/api/v1/auth/logout"],
            ]) {
              const body =
                method === "GET"
                  ? undefined
                  : JSON.stringify({ synthetic: "body" });
              const response = await request(server.origin + path, {
                method,
                headers,
                body,
              });
              assert.equal(response.status, 200);
              assert.deepEqual(await response.json(), {
                synthetic: true,
                accepted: true,
              });
              assert.equal(latestRequest.method, method);
              assert.equal(latestRequest.url, path);
              assert.equal(latestRequest.body, body ?? "");
              for (const field of ["cookie", "origin", "x-xsrf-token"])
                assert.equal(
                  latestRequest.headers[field],
                  headers[
                    Object.keys(headers).find(
                      (key) => key.toLowerCase() === field,
                    )
                  ],
                );
              assert.equal(
                latestRequest.headers["x-forwarded-proto"],
                flag === "true" ? "https" : "http",
              );
              for (const field of [
                "forwarded",
                "x-forwarded-for",
                "x-forwarded-host",
                "x-forwarded-port",
                "x-real-ip",
              ])
                assert.doesNotMatch(
                  latestRequest.headers[field] ?? "",
                  /203\.0\.113\.9|evil\.test|9999|attacker/,
                );
              assert.equal(latestRequest.headers["x-nonce"], undefined);
              // Next may copy its controlled response policy into the rewrite.
              assert.ok(
                [undefined, apiPolicy].includes(
                  latestRequest.headers["content-security-policy"],
                ),
              );
              assert.equal(
                response.headers.get("content-security-policy"),
                apiPolicy,
              );
              assert.equal(
                response.headers.get("x-content-type-options"),
                "nosniff",
              );
              assert.equal(
                response.headers.get("x-middleware-set-cookie"),
                null,
              );
              if (path.includes("/auth/")) {
                const cookie = response.headers.get("set-cookie") ?? "";
                assert.match(cookie, /HttpOnly/);
                assert.match(cookie, /SameSite=Lax/);
                assert.equal(cookie.includes("Secure"), secureCookies);
                if (path.endsWith("/logout")) assert.match(cookie, /Max-Age=0/);
              }
            }
            const forbidden = await request(
              `${server.origin}/api/v1/resources/saved`,
              { method: "POST" },
            );
            assert.equal(forbidden.status, 403);
            await forbidden.text();
          } finally {
            await stop(server);
          }
        });
      }
      await t.test(
        "explicit launch configuration changes sitemap at runtime",
        async () => {
          const server = await start(source, "true", "true");
          try {
            const response = await request(`${server.origin}/sitemap.xml`);
            assert.equal(response.status, 200);
            const dom = new JSDOM(await response.text(), {
              contentType: "application/xml",
            });
            try {
              const urls = [...dom.window.document.querySelectorAll("loc")].map(
                (node) => node.textContent,
              );
              assert.equal(urls.length, 12);
              assert.ok(
                urls.includes("https://nextsitrep.org/resources/healthcare"),
              );
              assert.ok(
                urls.every(
                  (url) =>
                    url.startsWith("https://nextsitrep.org/") &&
                    !/[?#]/.test(url),
                ),
              );
              assert.ok(!urls.includes("https://nextsitrep.org/resources"));
            } finally {
              dom.window.close();
            }
            const robots = await request(`${server.origin}/robots.txt`);
            const text = await robots.text();
            assert.match(text, /Allow: \//);
            assert.match(text, /Disallow: \/api\//);
            assert.match(
              text,
              /Sitemap: https:\/\/nextsitrep\.org\/sitemap\.xml/,
            );
            for (const path of ["/", "/login", "/resources/healthcare"]) {
              const page = await request(server.origin + path);
              const dom = new JSDOM(await page.text());
              try {
                assert.equal(
                  dom.window.document
                    .querySelector('meta[name="robots"]')
                    ?.content.includes("noindex"),
                  path === "/login",
                );
              } finally {
                dom.window.close();
              }
            }
          } finally {
            await stop(server);
          }
        },
      );
    } finally {
      upstream.closeAllConnections();
      await new Promise((resolve, reject) =>
        upstream.close((error) => (error ? reject(error) : resolve())),
      );
      await rm(temporary, { recursive: true, force: true });
    }
  },
);
