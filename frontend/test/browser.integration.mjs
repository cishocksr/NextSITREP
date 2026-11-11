import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const next = join(root, "node_modules/next/dist/bin/next");
// Supply a Chromium/Chrome executable; no browser downloads or real profiles.
const browserExecutable = process.env.BROWSER_EXECUTABLE;

function launch(executable, args, cwd, env = {}) {
  const child = spawn(executable, args, {
    cwd,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1", ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  for (const stream of [child.stdout, child.stderr])
    stream.on("data", (data) => {
      output = (output + data).slice(-40_000);
    });
  child.on("error", (error) => {
    output += String(error);
  });
  return { child, output: () => output };
}
async function stop(process) {
  if (
    !process ||
    process.child.exitCode !== null ||
    process.child.signalCode !== null
  )
    return;
  const exited = once(process.child, "exit");
  process.child.kill("SIGTERM");
  await Promise.race([exited, delay(3_000)]);
  if (process.child.exitCode === null && process.child.signalCode === null) {
    process.child.kill("SIGKILL");
    await exited;
  }
}
async function until(check, label) {
  for (let attempt = 0; attempt < 150; attempt++) {
    const value = await check();
    if (value) return value;
    await delay(100);
  }
  throw new Error(`Timed out: ${label}`);
}
async function connect(url) {
  const socket = new WebSocket(url);
  await once(socket, "open");
  let id = 0;
  const waiting = new Map();
  const listeners = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const pending = waiting.get(message.id);
      if (!pending) return;
      waiting.delete(message.id);
      clearTimeout(pending.timer);
      message.error
        ? pending.reject(new Error(JSON.stringify(message.error)))
        : pending.resolve(message.result);
    } else listeners.get(message.method)?.(message.params);
  });
  return {
    send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const requestId = ++id;
        const timer = setTimeout(() => {
          waiting.delete(requestId);
          reject(new Error(`CDP timeout: ${method}`));
        }, 15_000);
        waiting.set(requestId, { resolve, reject, timer });
        socket.send(JSON.stringify({ id: requestId, method, params }));
      });
    },
    on(method, listener) {
      listeners.set(method, listener);
    },
    close() {
      socket.close();
    },
  };
}
function luminance(color) {
  const rgb = color.slice(0, 3).map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(first, second) {
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

test(
  "production browser regressions: journey, recovery, accessibility and reflow",
  { timeout: 180_000 },
  async (t) => {
    assert.ok(
      browserExecutable,
      "Set BROWSER_EXECUTABLE to an installed Chromium/Chrome binary.",
    );
    const workspace = await mkdtemp(
      join(tmpdir(), "nextsitrep-accessibility-"),
    );
    const source = join(workspace, "frontend");
    const resource = {
      id: "synthetic-1",
      externalId: "facility-1",
      sourceApi: "VA",
      name: `Community ${"LongResourceName".repeat(4)} clinic`,
      description: "Accessible synthetic resource description. ".repeat(4),
      category: "HEALTHCARE",
      phone: "555-0100",
      website: "https://example.test/provider",
      address: "123 Example Street",
      city: "Example",
      state: "VA",
      zipCode: "12345",
      notes: "Original notes. ".repeat(30),
      savedAt: "2026-11-08T12:00:00Z",
      updatedAt: "2026-11-08T12:00:00Z",
    };
    let authenticated = false;
    let saved = [];
    let holdNotes = false;
    let failSave = true;
    let failRender = true;
    const auth = {
      userId: "synthetic-user",
      email: "pat@example.test",
      firstName: "LongFirstName".repeat(5),
      lastName: "Taylor",
      branchOfService: "COAST_GUARD",
      zipCode: "12345",
      expiresIn: 3600,
    };
    const calls = [];
    let pendingWrite;
    let writeCount = 0;
    let releaseWrite;
    const upstream = createServer(async (request, response) => {
      calls.push({ method: request.method, url: request.url });
      let body = "";
      for await (const chunk of request) body += chunk;
      const json = (value, status = 200) => {
        response.writeHead(status, { "Content-Type": "application/json" });
        response.end(JSON.stringify(value));
      };
      if (request.url === "/api/v1/auth/csrf") {
        response.setHeader(
          "Set-Cookie",
          "XSRF-TOKEN=synthetic; Path=/; SameSite=Lax",
        );
        response.writeHead(204).end();
        return;
      }
      if (request.url === "/__test__/render-state") {
        json({ ready: !failRender }, failRender ? 503 : 200);
        return;
      }
      const hasSession =
        authenticated &&
        /(?:^|; )vc_session=synthetic-session(?:;|$)/.test(
          request.headers.cookie ?? "",
        );
      if (request.url === "/api/v1/auth/me") {
        json(
          hasSession ? auth : { message: "Synthetic guest" },
          hasSession ? 200 : 401,
        );
        return;
      }
      if (
        request.method !== "GET" &&
        request.headers["x-xsrf-token"] !== "synthetic"
      ) {
        json({ message: "Missing synthetic CSRF" }, 403);
        return;
      }
      if (request.url === "/api/v1/auth/login" && request.method === "POST") {
        const credentials = JSON.parse(body);
        if (
          credentials.email !== "pat@example.test" ||
          credentials.password !== "synthetic-password"
        ) {
          json({ message: "Synthetic invalid credentials" }, 401);
          return;
        }
        authenticated = true;
        response.setHeader(
          "Set-Cookie",
          "vc_session=synthetic-session; Path=/; HttpOnly; SameSite=Lax",
        );
        json(auth);
        return;
      }
      if (!hasSession) {
        json({ message: "Synthetic guest" }, 401);
        return;
      }
      if (request.url === "/api/v1/auth/logout" && request.method === "POST") {
        authenticated = false;
        response.setHeader(
          "Set-Cookie",
          "vc_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
        );
        response.writeHead(204).end();
        return;
      }
      if (
        request.url === "/api/v1/resources/saved" &&
        request.method === "POST"
      ) {
        if (failSave) {
          failSave = false;
          json({ message: "Synthetic save unavailable" }, 503);
          return;
        }
        const created = { ...resource, ...JSON.parse(body) };
        saved.push(created);
        json(created, 201);
        return;
      }
      if (request.method === "PATCH") {
        writeCount++;
        pendingWrite = response;
        releaseWrite = () => {
          saved[0] = { ...saved[0], notes: JSON.parse(body).notes };
          json(saved[0]);
          pendingWrite = undefined;
        };
        if (!holdNotes) releaseWrite();
        return;
      }
      if (request.method === "DELETE") {
        saved = saved.filter((item) => !request.url.endsWith(item.id));
        response.writeHead(204).end();
        return;
      }
      if (request.url.startsWith("/api/v1/resources/search")) {
        json([
          {
            ...resource,
            isSaved: saved.some(
              (item) => item.externalId === resource.externalId,
            ),
            distanceMiles: 1,
          },
        ]);
        return;
      }
      if (request.url === "/api/v1/resources/saved") {
        json(saved);
        return;
      }
      json({ message: "Unexpected synthetic request" }, 404);
    });
    let app;
    let browser;
    let cdp;
    try {
      upstream.listen(0, "127.0.0.1");
      await once(upstream, "listening");
      await cp(root, source, {
        recursive: true,
        filter: (path) =>
          ![
            "node_modules",
            ".git",
            ".next",
            "coverage",
            "tsconfig.tsbuildinfo",
          ].includes(basename(path)) && !basename(path).startsWith(".env"),
      });
      await symlink(
        join(root, "node_modules"),
        join(source, "node_modules"),
        "junction",
      );
      await mkdir(join(source, "app", "(dashboard)", "review-client-error"), {
        recursive: true,
      });
      await writeFile(
        join(source, "app", "(dashboard)", "review-client-error", "page.tsx"),
        '"use client"; import {useState} from "react"; export default function Probe() { const [fail, setFail] = useState(false); if (fail) throw new Error("Synthetic private client detail"); return <><h1>Client recovered</h1><button type="button" onClick={() => setFail(true)}>Trigger rendering failure</button></>; }',
      );
      await mkdir(join(source, "app", "review-server-error"), {
        recursive: true,
      });
      await writeFile(
        join(source, "app", "review-server-error", "page.tsx"),
        'import {connection} from "next/server"; export default async function Probe() { await connection(); const response = await fetch(process.env.API_PROXY_TARGET + "/__test__/render-state", {cache: "no-store"}); if (!response.ok) throw new Error("Synthetic private server detail"); return <h1>Server recovered</h1>; }',
      );
      const build = launch(
        process.execPath,
        [next, "build", "--webpack"],
        source,
        {
          API_PROXY_TARGET: `http://127.0.0.1:${upstream.address().port}`,
          NODE_ENV: "production",
          SITE_URL: "https://nextsitrep.org",
          SITE_INDEXING_ENABLED: "false",
          NEXTSITREP_CONTACT_EMAIL: "help@nextsitrep.org",
        },
      );
      try {
        const [code] = await once(build.child, "exit");
        assert.equal(code, 0, build.output());
      } finally {
        await stop(build);
      }
      t.diagnostic("Production build passed.");
      app = launch(
        process.execPath,
        [next, "start", "--hostname", "127.0.0.1", "--port", "0"],
        source,
        {
          NODE_ENV: "production",
          SITE_URL: "https://nextsitrep.org",
          SITE_INDEXING_ENABLED: "false",
          NEXTSITREP_CONTACT_EMAIL: "help@nextsitrep.org",
          HTTPS_DEPLOYMENT: "false",
          API_PROXY_TARGET: `http://127.0.0.1:${upstream.address().port}`,
        },
      );
      const origin = await until(() => {
        assert.equal(app.child.exitCode, null, app.output());
        return (
          app.output().includes("Ready") &&
          app.output().match(/Local:\s+(http:\/\/127\.0\.0\.1:\d+)/)?.[1]
        );
      }, "Next start");
      await mkdir(join(workspace, "profile"));
      browser = launch(
        browserExecutable,
        [
          "--headless=new",
          "--remote-debugging-port=0",
          `--user-data-dir=${join(workspace, "profile")}`,
          "--no-first-run",
          "--no-default-browser-check",
          "--disable-background-networking",
          "--disable-sync",
          "--use-mock-keychain",
          "about:blank",
        ],
        workspace,
      );
      const endpoint = await until(() => {
        assert.equal(browser.child.exitCode, null, browser.output());
        return browser
          .output()
          .match(/DevTools listening on (ws:\/\/[^\s]+)/)?.[1];
      }, "Chrome DevTools");
      const debugOrigin = endpoint
        .replace(/^ws:/, "http:")
        .replace(/\/devtools\/.*$/, "");
      const target = await (
        await fetch(`${debugOrigin}/json/new?about:blank`, { method: "PUT" })
      ).json();
      cdp = await connect(target.webSocketDebuggerUrl);
      await cdp.send("Page.enable");
      await cdp.send("Runtime.enable");
      let acceptConfirm = false;
      let confirmCount = 0;
      cdp.on("Page.javascriptDialogOpening", () => {
        confirmCount++;
        cdp
          .send("Page.handleJavaScriptDialog", { accept: acceptConfirm })
          .catch(() => {});
      });
      const evaluate = async (expression) => {
        const result = await cdp.send("Runtime.evaluate", {
          expression,
          returnByValue: true,
          awaitPromise: true,
        });
        assert.ok(
          !result.exceptionDetails,
          JSON.stringify(result.exceptionDetails),
        );
        return result.result.value;
      };
      const waitDom = async (expression, label) => {
        try {
          return await until(() => evaluate(expression), label);
        } catch (error) {
          const snapshot = await evaluate(
            'JSON.stringify({url: location.href, text: document.body.innerText.slice(0, 1500), fields: Array.from(document.querySelectorAll("input")).map(input => ({type: input.type, length: input.value.length, valid: input.checkValidity()})), focused: document.activeElement.tagName})',
          );
          throw new Error(
            `${label}: ${error.message}; ${snapshot}; calls: ${JSON.stringify(calls.slice(-8))}`,
          );
        }
      };
      const loadedDocuments = new Set();
      cdp.on("Page.lifecycleEvent", (event) => {
        if (event.name === "load") loadedDocuments.add(event.loaderId);
      });
      await cdp.send("Page.setLifecycleEventsEnabled", { enabled: true });
      const navigate = async (path) => {
        const navigation = await cdp.send("Page.navigate", {
          url: `${origin}${path}`,
        });
        await until(
          () => loadedDocuments.has(navigation.loaderId),
          `document load: ${path}`,
        );
        await waitDom(
          'document.readyState === "complete" && !!document.querySelector("main")',
          path,
        );
      };
      const key = async (key, modifiers = 0) => {
        const code = { Tab: 9, Escape: 27, Enter: 13 }[key];
        await cdp.send("Input.dispatchKeyEvent", {
          type: "keyDown",
          key,
          code: key,
          windowsVirtualKeyCode: code,
          modifiers,
        });
        await cdp.send("Input.dispatchKeyEvent", {
          type: "keyUp",
          key,
          code: key,
          windowsVirtualKeyCode: code,
          modifiers,
        });
      };
      const reflow = async (width, height = 800) => {
        await cdp.send("Emulation.setDeviceMetricsOverride", {
          width,
          height,
          deviceScaleFactor: 1,
          mobile: false,
        });
        await delay(100);
        const dimensions = await evaluate(
          "({viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth, scrollX, bodyWidth: document.body.clientWidth})",
        );
        assert.ok(
          dimensions.content <= dimensions.viewport + 1,
          `Horizontal overflow at ${width}px: ${JSON.stringify(dimensions)}; ${await evaluate('JSON.stringify(Array.from(document.querySelectorAll("body *")).filter(el => el.getBoundingClientRect().right + scrollX > innerWidth + 1 || el.scrollWidth > el.clientWidth + 1).slice(0, 8).map(el => ({tag: el.tagName, class: el.className, right: el.getBoundingClientRect().right, left: el.getBoundingClientRect().left, client: el.clientWidth, scroll: el.scrollWidth, position: getComputedStyle(el).position})))')}`,
        );
      };
      const fill = async (selector, text) => {
        await evaluate(
          `document.querySelector(${JSON.stringify(selector)}).focus(); document.querySelector(${JSON.stringify(selector)}).select()`,
        );
        await cdp.send("Input.insertText", { text });
      };
      const activate = async (selector) => {
        const point = await evaluate(
          `(async () => { const element = Array.from(document.querySelectorAll(${JSON.stringify(selector)})).find(candidate => candidate.getClientRects().length > 0); if (!element) throw new Error("No visible click target"); element.focus({preventScroll: true}); element.scrollIntoView({block: "center", behavior: "instant"}); await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); const bounds = element.getBoundingClientRect(); const point = {x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2}; const hit = document.elementFromPoint(point.x, point.y); if (!hit || !element.contains(hit)) throw new Error("Click target is obscured: " + JSON.stringify({selector: ${JSON.stringify(selector)}, point, hit: hit?.outerHTML.slice(0, 300)})); return point; })()`,
        );
        await cdp.send("Input.dispatchMouseEvent", {
          type: "mousePressed",
          button: "left",
          clickCount: 1,
          ...point,
        });
        await cdp.send("Input.dispatchMouseEvent", {
          type: "mouseReleased",
          button: "left",
          clickCount: 1,
          ...point,
        });
      };
      const activateText = async (text) => {
        await evaluate(
          `Array.from(document.querySelectorAll("button")).find(button => button.textContent.trim() === ${JSON.stringify(text)}).setAttribute("data-browser-action", "active")`,
        );
        await activate('[data-browser-action="active"]');
        await evaluate(
          'document.querySelector("[data-browser-action=active]")?.removeAttribute("data-browser-action")',
        );
      };
      const login = async () => {
        await navigate("/login");
        await waitDom(
          '!!document.querySelector("input[type=email]") && !!Array.from(document.querySelectorAll("nav a")).find(link => link.getAttribute("href") === "/register")',
          "guest login form",
        );
        await fill("input[type=email]", "pat@example.test");
        await fill("input[type=password]", "synthetic-password");
        await activate("form button[type=submit]");
        await waitDom(
          'location.pathname === "/dashboard" && !!document.querySelector("h1") && document.querySelector("h1").textContent.includes("Welcome")',
          "signed-in dashboard",
        );
      };
      await t.test(
        "login → search → failed save/retry → notes → logout",
        async () => {
          await navigate("/saved");
          await waitDom(
            'location.pathname === "/login" && !!document.querySelector("input[type=email]")',
            "protected guest redirect",
          );
          const beforeLogin = calls.filter(
            (call) => call.url === "/api/v1/auth/login",
          ).length;
          await activate("form button[type=submit]");
          assert.equal(
            calls.filter((call) => call.url === "/api/v1/auth/login").length,
            beforeLogin,
            "Native required validation must prevent empty submission",
          );
          await fill("input[type=email]", "pat@example.test");
          await fill("input[type=password]", "wrong-synthetic-password");
          await activate("form button[type=submit]");
          await waitDom(
            'document.querySelector("[role=alert]")?.textContent.includes("Synthetic invalid credentials")',
            "login rejection",
          );
          assert.equal(await evaluate("location.pathname"), "/login");
          await fill("input[type=password]", "synthetic-password");
          await activate("form button[type=submit]");
          await waitDom(
            'location.pathname === "/dashboard" && !!document.querySelector("form")',
            "login navigation",
          );
          const cookie = (
            await cdp.send("Network.getCookies", { urls: [origin] })
          ).cookies.find((cookie) => cookie.name === "vc_session");
          assert.equal(cookie?.httpOnly, true);
          assert.equal(
            await evaluate('document.cookie.includes("vc_session")'),
            false,
          );
          await waitDom(
            'Array.from(document.querySelectorAll("main p")).some(element => element.textContent === "Nothing saved yet")',
            "real empty library",
          );
          await fill("main form input[pattern]", "90210");
          await fill("main form input:not([pattern])", "counseling");
          await evaluate(
            'const selects = document.querySelectorAll("main form select"); selects[0].value = "HEALTHCARE"; selects[0].dispatchEvent(new Event("change", {bubbles:true})); selects[1].value = "50"; selects[1].dispatchEvent(new Event("change", {bubbles:true}))',
          );
          await activate("main form button[type=submit]");
          await waitDom(
            'location.pathname === "/resources" && !!document.querySelector("main h3")',
            "resource results",
          );
          assert.equal(
            await evaluate(
              'new URLSearchParams(location.search).get("zipCode")',
            ),
            "90210",
          );
          assert.equal(
            await evaluate(
              'new URLSearchParams(location.search).get("radius")',
            ),
            "50",
          );
          assert.ok(
            calls.some(
              (call) =>
                call.url.includes("zipCode=90210") &&
                call.url.includes("category=HEALTHCARE") &&
                call.url.includes("keyword=counseling") &&
                call.url.includes("radius=50"),
            ),
          );
          await activate('[aria-label^="Save Resource:"]');
          await waitDom(
            'document.querySelector("[role=alert]")?.textContent.includes("Synthetic save unavailable")',
            "save failure",
          );
          assert.equal(saved.length, 0);
          await activate('[aria-label^="Save Resource:"]');
          await waitDom(
            '!!Array.from(document.querySelectorAll("button")).find(button => button.getAttribute("aria-label")?.startsWith("Saved:"))',
            "save retry",
          );
          assert.equal(saved.length, 1);
          await activate('nav a[href="/saved"]');
          await waitDom(
            '!!document.querySelector("[data-resource-id]")',
            "saved resource navigation",
          );
          await activate('[aria-label^="Add Notes:"]');
          await waitDom(
            '!!document.querySelector("dialog[open]")',
            "notes open",
          );
          await fill("textarea", "Personal plan. ".repeat(20));
          await activateText("Save Notes");
          await waitDom('!document.querySelector("dialog")', "notes saved");
          assert.equal(saved[0].notes, "Personal plan. ".repeat(20));
          await navigate("/saved");
          await waitDom(
            '!!document.querySelector("[data-resource-id]") && document.body.textContent.includes("Personal plan.")',
            "notes persisted across reload",
          );
          await activateText("Sign Out");
          await waitDom(
            'location.pathname === "/login" && !!document.querySelector("input[type=email]")',
            "sign-out redirect",
          );
          assert.equal(authenticated, false);
          assert.equal(
            (
              await cdp.send("Network.getCookies", { urls: [origin] })
            ).cookies.some((cookie) => cookie.name === "vc_session"),
            false,
          );
          assert.equal(
            await evaluate(
              'document.body.textContent.includes("Personal plan.")',
            ),
            false,
          );
          await navigate("/saved");
          await waitDom(
            'location.pathname === "/login" && !!document.querySelector("input[type=email]")',
            "post-logout protected redirect",
          );
        },
      );
      await login();
      await t.test(
        "scoped client and server render failures recover",
        async () => {
          await navigate("/review-client-error");
          await waitDom(
            'document.querySelector("h1")?.textContent === "Client recovered"',
            "client fixture",
          );
          await activateText("Trigger rendering failure");
          await waitDom(
            'document.querySelector("h1")?.textContent === "This workspace is unavailable"',
            "scoped dashboard boundary",
          );
          assert.equal(
            await evaluate(
              'document.activeElement === document.querySelector("h1")',
            ),
            true,
          );
          assert.equal(
            await evaluate(
              'document.body.textContent.includes("Synthetic private client detail")',
            ),
            false,
          );
          await activateText("Try again");
          await waitDom(
            'document.querySelector("h1")?.textContent === "Client recovered"',
            "client recovery",
          );
          await navigate("/review-server-error");
          await waitDom(
            'document.querySelector("h1")?.textContent === "This page is unavailable"',
            "root route boundary",
          );
          assert.equal(
            await evaluate(
              'document.body.textContent.includes("Synthetic private server detail")',
            ),
            false,
          );
          failRender = false;
          await activateText("Try again");
          await waitDom(
            'document.querySelector("h1")?.textContent === "Server recovered"',
            "server refetch and recovery",
          );
        },
      );
      holdNotes = true;
      writeCount = 0;
      await navigate("/saved");
      await waitDom(
        '!!document.querySelector("[data-resource-id]")',
        "saved resources",
      );
      assert.equal(
        await evaluate('document.querySelectorAll("main").length'),
        1,
      );
      assert.equal(
        await evaluate('document.querySelectorAll("a button").length'),
        0,
      );
      assert.equal(
        await evaluate(
          'document.querySelector("nav [aria-current=page]")?.getAttribute("href")',
        ),
        "/saved",
      );
      for (const width of [320, 768, 1280]) await reflow(width);
      // Keyboard-only skip navigation.
      await evaluate("document.activeElement.blur()");
      await cdp.send("Page.navigate", { url: `${origin}/saved` });
      await waitDom(
        '!!document.querySelector("[data-resource-id]")',
        "saved reload",
      );
      await key("Tab");
      assert.equal(
        await evaluate("document.activeElement.textContent.trim()"),
        "Skip to main content",
      );
      await key("Enter");
      assert.equal(await evaluate("document.activeElement.id"), "main-content");
      await evaluate(
        'window.openerButton = document.querySelector("[aria-label^=\\"Edit Notes:\\"]"); window.openerButton.focus(); window.openerButton.click()',
      );
      await waitDom('!!document.querySelector("dialog[open]")', "notes dialog");
      assert.equal(
        await evaluate("document.activeElement.tagName"),
        "TEXTAREA",
      );
      assert.equal(
        await evaluate('document.querySelector("dialog").matches(":modal")'),
        true,
      );
      assert.equal(
        await evaluate("getComputedStyle(document.documentElement).overflow"),
        "hidden",
      );
      for (let index = 0; index < 12; index++) {
        await key("Tab", index > 5 ? 8 : 0);
        assert.equal(
          await evaluate(
            'document.querySelector("dialog").contains(document.activeElement)',
          ),
          true,
          `Tab escaped the modal at ${index}`,
        );
      }
      await evaluate('document.querySelector("nav a").focus()');
      assert.equal(
        await evaluate(
          'document.querySelector("dialog").contains(document.activeElement)',
        ),
        true,
        "Background must be inert",
      );
      const ax = await cdp.send("Accessibility.getFullAXTree");
      assert.ok(
        ax.nodes.some(
          (node) =>
            node.role?.value === "dialog" &&
            node.name?.value.startsWith("Notes: Community"),
        ),
      );
      // Contrast comes from computed production CSS, including OKLCH tokens.
      const cssColors = await evaluate(
        `(() => {const text = document.querySelector('dialog p'); const editor = document.querySelector('textarea'); const footer = document.querySelector('footer'); return {helper: getComputedStyle(text).color, placeholder: getComputedStyle(editor, '::placeholder').color, white: getComputedStyle(document.querySelector("dialog")).backgroundColor, footer: getComputedStyle(footer.querySelector('.text-xs')).color};})()`,
      );
      const colors = await evaluate(
        `(() => { const colors = ${JSON.stringify(cssColors)}; const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1; const context = canvas.getContext("2d"); return Object.fromEntries(Object.entries(colors).map(([key, value]) => { context.clearRect(0, 0, 1, 1); context.fillStyle = value; context.fillRect(0, 0, 1, 1); return [key, Array.from(context.getImageData(0, 0, 1, 1).data)]; })); })()`,
      );
      assert.ok(
        contrast(colors.helper, colors.white) >= 4.5,
        JSON.stringify(colors),
      );
      assert.ok(contrast(colors.placeholder, colors.white) >= 4.5);
      assert.ok(contrast(colors.footer, colors.white) >= 4.5);
      for (const width of [320, 768, 1280]) {
        await reflow(width, 600);
        assert.equal(
          await evaluate(
            '(() => {const r = document.querySelector("dialog").getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight;})()',
          ),
          true,
          "Dialog must fit the viewport",
        );
      }
      // 1280x800 at 400% browser zoom exposes a 320x200 CSS-pixel viewport.
      // Test the same reflow dimensions and keyboard visibility explicitly.
      await reflow(320, 200);
      for (let index = 0; index < 8; index++) {
        await key("Tab");
        assert.equal(
          await evaluate(
            "(() => {const bounds = document.activeElement.getBoundingClientRect(); return bounds.height > 0 && bounds.top >= 0 && bounds.bottom <= innerHeight;})()",
          ),
          true,
          `Dialog control at ${index}: ${await evaluate('JSON.stringify({tag:document.activeElement.tagName, bounds:document.activeElement.getBoundingClientRect().toJSON(), dialog:document.querySelector("dialog").getBoundingClientRect().toJSON()})')}`,
        );
      }
      await reflow(1280, 800);
      await key("Escape");
      await waitDom('!document.querySelector("dialog")', "clean Escape");
      assert.equal(
        await evaluate("document.activeElement === window.openerButton"),
        true,
      );
      await evaluate("window.openerButton.click()");
      await waitDom('!!document.querySelector("dialog[open]")', "reopen");
      await evaluate(
        'document.querySelector("textarea").focus(); document.querySelector("textarea").select()',
      );
      await cdp.send("Input.insertText", { text: "Unsaved keyboard draft" });
      await key("Escape");
      assert.equal(confirmCount, 1);
      assert.equal(
        await evaluate('document.querySelector("textarea").value'),
        "Unsaved keyboard draft",
      );
      acceptConfirm = true;
      await key("Escape");
      await waitDom('!document.querySelector("dialog")', "confirmed discard");
      assert.equal(confirmCount, 2);
      await evaluate("window.openerButton.click()");
      await waitDom('!!document.querySelector("dialog[open]")', "save reopen");
      await evaluate(
        'document.querySelector("textarea").focus(); document.querySelector("textarea").select()',
      );
      await cdp.send("Input.insertText", { text: "Saved keyboard draft" });
      await evaluate(
        'Array.from(document.querySelectorAll("dialog button")).find(button => button.textContent.trim() === "Save Notes").click()',
      );
      await until(() => pendingWrite, "pending save");
      await key("Escape");
      assert.equal(confirmCount, 2);
      assert.equal(writeCount, 1);
      assert.equal(
        await evaluate(
          '!!document.querySelector("dialog[open]") && document.querySelector("textarea").readOnly',
        ),
        true,
      );
      await cdp.send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "reduce" }],
      });
      assert.equal(
        await evaluate(
          "getComputedStyle(document.documentElement).scrollBehavior",
        ),
        "auto",
      );
      assert.equal(
        await evaluate(
          'getComputedStyle(document.querySelector("dialog svg")).animationName',
        ),
        "none",
      );
      releaseWrite();
      await waitDom('!document.querySelector("dialog")', "saved close");
      assert.equal(
        await evaluate("document.activeElement === window.openerButton"),
        true,
      );
      await navigate("/dashboard");
      await waitDom(
        '!!document.querySelector("h1") && document.querySelector("h1").textContent.includes("Welcome")',
        "dashboard",
      );
      assert.equal(
        await evaluate('document.querySelectorAll("main").length'),
        1,
      );
      for (const width of [320, 768, 1280]) await reflow(width);
      await navigate("/resources?zipCode=12345&radius=25");
      await waitDom('!!document.querySelector("main h3")', "search results");
      for (const width of [320, 768, 1280]) await reflow(width);
      assert.match(
        await evaluate(
          'document.querySelector("output[aria-live]").textContent',
        ),
        /1 resources found near 12345/,
      );
      await activateText("Sign Out");
      await waitDom('location.pathname === "/login"', "guest transition");
      await navigate("/register");
      await waitDom(
        '!!document.querySelector("input[name=confirmPassword]")',
        "registration",
      );
      for (const width of [320, 768, 1280]) await reflow(width);
      for (const path of [
        "/",
        "/login",
        "/privacy",
        "/terms",
        "/disclaimer",
        "/guides",
        "/resources/healthcare",
        "/resources/benefits",
        "/resources/mental-health",
        "/resources/housing",
        "/resources/financial-assistance",
        "/resources/education",
        "/resources/employment",
      ]) {
        await navigate(path);
        await waitDom(
          '!!Array.from(document.querySelectorAll("nav a")).find(link => link.getAttribute("href") === "/login")',
          "guest navigation",
        );
        assert.equal(
          await evaluate('document.querySelectorAll("a button").length'),
          0,
        );
        for (const width of [320, 768, 1280]) await reflow(width);
        if (path.startsWith("/resources/")) {
          assert.ok(
            await evaluate(
              `!!document.querySelector('nav[aria-label="Breadcrumb"]')`,
            ),
          );
          assert.ok(
            await evaluate(
              `!!document.querySelector('script[type="application/ld+json"]')`,
            ),
          );
        }
      }
      t.diagnostic(
        `Chrome checks passed: focus containment/restoration, inert background, clean/dirty/pending Escape, skip link, semantics, reduced motion, computed contrast, and 320/768/1280px reflow with long content. Helper contrast ${contrast(colors.helper, colors.white).toFixed(2)}:1.`,
      );
    } finally {
      pendingWrite?.destroy();
      cdp?.close();
      await stop(browser);
      await stop(app);
      upstream.closeAllConnections();
      if (upstream.listening)
        await new Promise((resolve) => upstream.close(resolve));
      await rm(workspace, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 100,
      });
    }
  },
);
