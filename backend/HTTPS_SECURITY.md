# H2-B: HTTPS, browser headers, and reverse-proxy trust

This implements application controls for H2-B only. H2-C remains pending. AWS
resources, certificates, DNS, proxy servers, and firewall rules were not created.
C1 signing checks, H1 relative `/api` routing, and H2-A profile/credential/schema
validation remain in place. No dependencies or package versions were changed.

## Audit and resulting policy

Before this change, Next supplied DENY framing, nosniff, no-referrer and a restrictive
Permissions-Policy, but no document CSP/HSTS. Spring supplied a JSON-oriented CSP,
framing/nosniff/referrer controls and HSTS with `includeSubDomains=true`, but no
Permissions-Policy. Boot forwarding was not explicitly configured and the limiter
could optionally trust raw X-Forwarded-For. No controlled AWS ingress was established.

| Header | Next documents | Spring API / security errors |
| --- | --- | --- |
| Content-Security-Policy | Fresh 32-byte random nonce per response. Scripts use self + nonce + strict-dynamic; styles use self + nonce. Connections/fonts are same-origin; images self/data. No objects, frames or base URI; forms same-origin. | `default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`. Next API rewrites also set this as a fallback for proxy-generated errors. |
| Strict-Transport-Security | `max-age=31536000` when server-runtime `HTTPS_DEPLOYMENT=true`. | Same host-only value when deployment HTTPS is required and the request is genuinely secure or normalized by the guarded native valve. |
| X-Content-Type-Options | nosniff | nosniff |
| Referrer-Policy | no-referrer | no-referrer |
| Permissions-Policy | camera=(), microphone=(), geolocation=() | Same |
| X-Frame-Options | DENY, alongside frame-ancestors none | Same |

Neither `includeSubDomains` nor `preload` is enabled. Do not add either at an edge
until an explicit decision covers all affected domains. One year's HSTS can persist
in browsers; establish working HTTPS and certificate renewal before enabling the
deployment flag. HSTS does not configure a certificate, authenticate a proxy, secure
an origin, or make an initial HTTP credential submission safe.

## CSP compatibility and narrowly scoped exceptions

Next Proxy sets the nonce/CSP on the request for Next's renderer and the matching
response header. Inbound client nonce/policy headers are overwritten. The root
layout waits for a connection so Next can attach the request nonce to generated
scripts. No new authentication or UI behavior is implemented by the proxy.

**Rendering/hosting change:** HTML is now rendered per request, not prerendered.
Nonce-bearing HTML must remain private/no-store, including 404s; never cache/replay
one nonce across viewers or inject a different cached CSP header. This increases
server work and rules out the earlier candidate S3 static-export architecture
without a separately reviewed hash-based/static CSP design. Retain the existing
Next server for this implementation. Cache only immutable static assets at the
CDN; measure Next memory/latency and recalculate the deployment budget before
selecting the instance size.

**Production exception:** `style-src-attr 'unsafe-inline'` is deliberately limited
to CSS attributes. The installed Next built-in 404 emits four style attributes;
blocking them changes framework error-page presentation. Inline script/event
handlers and arbitrary style elements are not authorized by this exception.
There is no production script unsafe-inline or unsafe-eval. Removing this CSS
exception requires replacing/reviewing framework fallback styling separately.

**Development exception:** script unsafe-eval and ws:/wss: connect sources are
allowed only by `next dev` for debugging/refresh. They are absent from production
build responses. HTTPS upgrade-insecure-requests is included only when the explicit
HTTPS deployment flag is true, so local HTTP next dev/next start/Compose remain
usable. See [Next's nonce guidance](https://nextjs.org/docs/app/guides/content-security-policy).

## Application configuration

| Setting | Local / test | AWS Development and Production |
| --- | --- | --- |
| Backend profile | local / test | aws-dev / prod; existing shared deploy group |
| `TRUSTED_PROXY_IPS` | Empty by default: no forwarding trust | Required comma-separated **exact literal immediate-peer IPs**, e.g. loopback only if the actual controlled proxy connects from loopback. No hostname, wildcard, regex, CIDR, unspecified address, or implicit private-network trust. |
| `server.forward-headers-strategy` / `SERVER_FORWARD_HEADERS_STRATEGY` | none | Must remain none; framework/native Boot-wide forwarding overrides fail startup. A custom guarded Tomcat valve owns interpretation. |
| `AUTH_RATE_LIMIT_TRUST_FORWARDED_HEADERS` | false | Must remain false; true now fails startup. The limiter reads only request.getRemoteAddr(), which Tomcat may safely normalize. |
| `security.https.required` | false | true, enforced by H2-A startup validation. HTTP API requests are rejected with JSON 403, not redirected. |
| Frontend server-runtime `HTTPS_DEPLOYMENT` | false (default), including local production-mode Next | Set true only after the controlled HTTPS-only ingress is in place. This flag is not automatic AWS detection or proof of transport security. Invalid values fail requests. |

No live `.env` file is changed. Templates annotate the new knobs; local Compose
keeps its local profile and HTTP behavior. Production definitions must explicitly
inject the new backend peer list and frontend flag. CI needs no secrets; the new
integration tests require ordinary loopback socket access (GitHub-hosted runners
allow it; this desktop sandbox requires execution approval).

## Forwarding trust and HTTPS enforcement

Boot's global forwarded-header support is explicitly disabled. The custom Tomcat
RemoteIpValve uses a generated, escaped pattern of only the listed literal IPs.
When the TCP peer is not listed, X-Forwarded-Proto and X-Forwarded-For cannot change
scheme/client identity. From a listed peer, Tomcat interprets the protocol and walks
the IP chain right-to-left, stopping at the nearest untrusted hop. It does not use
Forwarded, X-Forwarded-Host, X-Forwarded-Port or prefixes to rewrite the host/URLs.
See [Tomcat RemoteIpValve](https://tomcat.apache.org/tomcat-10.1-doc/config/valve.html#Remote_IP_Valve).

A filter inside the security chain rejects non-secure deployment requests before
CSRF/authentication handling; Spring security headers still wrap its errors. The
only HTTP exemption is the exact `/actuator/health` path for private probes. Do not
expose that endpoint publicly through the ingress. Local/test requests do not
require HTTPS. HSTS is issued only for deployment requests recognized as secure.

The H1 Next rewrite fallback strips inbound Forwarded, X-Forwarded-*, and X-Real-IP
before proxying API requests, then sets protocol from the server's HTTPS contract.
It preserves cookies, Origin, X-XSRF-TOKEN, method, body and query. Since Next's
Proxy API does not authenticate the socket peer, it does not turn a viewer-supplied
IP into trusted identity. That path may aggregate rate limiting under the Next peer
rather than the real viewer. Prefer routing production `/api/*` directly through
the controlled origin proxy to Spring if canonical viewer IPs are required; keep
Next rewriting for local HTTP or the documented controlled fallback. This does not
complete the separate limiter-abuse finding.

JWT cookies remain Secure in deployed profiles, HttpOnly, host-only, path `/`, with
the configured SameSite value. CSRF cookies remain host-only, readable by JS, path
`/`, and Secure in deployed profiles independent of the servlet's internal scheme.
The browser still fetches `/api/v1/auth/csrf` then echoes the cookie in X-XSRF-TOKEN;
missing/incorrect tokens remain rejected. No cookie domain is broadened across AWS
accounts or subdomains. Existing CSRF SameSite defaults are unchanged.

## Required infrastructure controls and AWS acceptance checks

1. Use each account's own hostname/certificate and hardened backend profile. Require
   HTTPS at the viewer edge. Redirect only safe page navigation if desired; reject
   HTTP API writes. Never rely on a security header to recover credentials already
   sent over HTTP. Verify certificate issuance/renewal, TLS policy and DNS.
2. Use authenticated/restricted HTTPS from CloudFront to the origin. Restrict origin
   access to the intended distribution/ingress, not just any arbitrary caller. Bind
   Next and Spring to private/local interfaces or protected container networks;
   block direct public application ports. Protect the private health probe path.
3. At the controlled ingress, remove viewer-supplied forwarding metadata and create
   canonical protocol/client metadata from the verified chain. A trusted socket
   peer is allowed to assert metadata: a public unsanitized proxy breaks this trust
   contract. Restrict access to that proxy and protect every hop before enabling
   the frontend HTTPS flag or adding its address to the backend trust list.
4. Put only actual last-hop proxy IPs in TRUSTED_PROXY_IPS. Container/instance IP
   changes need an owned configuration rollout; do not widen trust to all private
   IPs. Validate CloudFront viewer identity/forwarding behavior with the selected
   origin proxy. Do not use the first arbitrary X-Forwarded-For value.
5. Keep shared-origin `/api/*` routing and all methods, query strings, cookies,
   Origin, Authorization and CSRF headers. Disable CDN API/error caching. Do not
   apply the JSON CSP to HTML or replace nonce HTML CSP with a static edge policy.
   Ensure cache policies honor HTML private/no-store; immutable assets can cache.
6. From the public hostname, verify login, saved-resource writes, logout, expired
   sessions and missing/incorrect CSRF rejection. Verify the complete browser-visible
   header set, cookie flags and CSP behavior on pages, navigation, 404s and API errors.
7. Attempt direct-origin access and forged Forwarded/X-Forwarded-* from an untrusted
   network. They must not bypass HTTPS, spoof identity, alter redirects or create
   HSTS on insecure requests. Confirm only the expected ingress can reach the
   trusted listener and public HTTP API requests never reach authentication.

Actual AWS TLS, firewall isolation, header normalization, CDN caching and browsers
on the final topology remain deployment gates; local metadata tests do not prove
TLS encryption. JDK 21 runtime CI, database TLS/permissions, logging/privacy and H2-C
remain separate checks. No infrastructure was provisioned by H2-B.

## Verification and changed files

- Backend: `./mvnw -o clean verify -B` passed **214 tests**, no failures/errors/skips.
  JaCoCo **671/851 lines (78.85%)** passes the unchanged 70% gate. This includes real
  loopback Tomcat tests for trusted/unlisted peers, forged scheme/client metadata,
  ignored host/RFC forwarding, mixed protocols, security headers on errors,
  HSTS scope, and a valid/invalid CSRF handshake. Cookie tests cover Secure,
  HttpOnly, host-only scope, path, lifetime, and SameSite on JWT issuance/clear.
- Frontend: **28 tests passed**; type checking and production webpack build passed.
  Changed TypeScript files pass scoped Biome checks. Full lint/format commands
  still fail on the existing formatting issue in `components/layout/Navbar.test.tsx`;
  that unrelated file was preserved.
- HTTP smoke: all ten page/error routes in local and HTTPS-deployment modes have
  fresh, matching script nonces, expected headers and private/no-store HTML. API
  cookie forwarding and stripping forged forwarding metadata were verified against
  a synthetic upstream. The same build was used with both runtime HTTPS flags.
- Browser: production-mode local HTTP login, dashboard navigation, sign-out and 404
  rendering were exercised with synthetic data; `next dev` login/navigation also
  worked. No CSP errors were observed. The existing dev smooth-scroll warning is
  unrelated. Temporary servers/tabs were shut down after verification.
- Tests ran in an isolated review copy; application files are checked byte-for-byte
  against the tested copy when applying. Installed JDK **25.0.2**, compiler release
  **21**; Java 21 runtime CI, real Docker startup, AWS TLS/network/origin isolation
  and CDN behavior remain unverified. No real secrets or accounts were used.

Changed files (paths relative to the repository):

- `frontend/app/layout.tsx`
- `frontend/.env.local.example`
- `backend/src/main/java/com/veteransconnect/config/SecurityConfig.java`
- `backend/src/main/java/com/veteransconnect/config/StartupConfigurationValidator.java`
- `backend/src/main/java/com/veteransconnect/security/AuthRateLimiter.java`
- `backend/src/main/resources/application.properties`
- `backend/src/main/resources/application-deploy.properties`
- `backend/src/test/java/com/veteransconnect/config/StartupConfigurationValidatorTest.java`
- `backend/src/test/java/com/veteransconnect/security/CsrfTransportTest.java`
- `backend/CONFIGURATION.md`
- `README.md`
- `.env.example`
- `backend/.env.example`
- `frontend/next.config.test.ts`
- `frontend/proxy.ts`
- `frontend/proxy.test.ts`
- `backend/src/main/java/com/veteransconnect/config/TrustedProxyConfiguration.java`
- `backend/src/main/java/com/veteransconnect/security/HttpsRequirementFilter.java`
- `backend/src/test/java/com/veteransconnect/config/TrustedProxyIntegrationTest.java`
- `backend/HTTPS_SECURITY.md`
