# NextSITREP branding and SEO implementation

Date: November 10, 2026. Implements the approved [audit](NEXTSITREP_BRANDING_SEO_AUDIT.md). The earlier [inventory](NEXTSITREP_BRANDING_INVENTORY.md) is a pre-change snapshot, not a list of current defects.

## Implemented

- Exact **NextSITREP** spelling in visible branding, accessible navbar name, metadata, legal labels, documentation, and geocoding identity. The navbar retains a colored SITREP segment without inserting a space. No CSS uppercase transformation is applied to the legal brand label.
- Contributor and template copy, README tree/badges, issue-support destinations, and Maven description updated. Repository links follow the configured Git origin; external GitHub browsing could not verify remote availability. Questions point to Issues rather than assuming Discussions is enabled.
- Distinct public and private titles/descriptions. Canonical and Open Graph URLs are specific to public pages; private pages omit canonical URLs and personal metadata. Shared social-image fields survive metadata inheritance.
- Explicit runtime canonical/launch settings, validated HTTPS origin, noindex headers, private/auth route metadata, dynamic robots.txt, and a curated sitemap. Indexing defaults off even for a production build. Search ZIP codes, interests, saved resources, and auth routes never enter the sitemap.
- New public `/guides` hub and seven source-linked guides under `/resources/`: healthcare, benefits, mental-health, housing, financial-assistance, education, and employment. Every guide has substantive task-specific content, provider/application limitations, visible breadcrumbs, related links, review date, unique metadata, and official source links. No account is needed to read them. No empty community or location landing pages were created.
- Homepage Organization/WebSite and guide BreadcrumbList JSON-LD with per-response CSP nonces and HTML-safe serialization. No fabricated contact/address/rating/social/government fields, FAQ eligibility claim, or authenticated SearchAction.
- Homepage, dashboard shortcuts, search explanation, and keyword hint corrected to describe VA facility discovery. Education/housing/financial filters are explicitly described as benefits-office searches. No promise of available housing, grants, jobs, or complete geographic coverage.
- Independent/non-VA status and provider cost/eligibility limits made visible. Provider search remains authenticated, and save/notes/CSRF/cookie/proxy-trust behavior is preserved.
- Code-native SVG initials icon and NextSITREP wordmark preview, ICO favicon, Apple PNG icon, and 1200×630 social PNG. Assets were visually inspected; SVG sources are included. No AI-generated artwork or new dependency was required.
- Owner-confirmed **help@nextsitrep.org** published for support/privacy requests, with a validated server runtime override. Privacy copy now reflects actual account fields, cookies, logs, geocoding, and VA facility data. Its substantive update is dated November 10, 2026; other legal dates were preserved.
- Semantic heading/decorative emoji corrections and responsive navigation/footer adjustments. Tests exercise rendered HTML before hydration and real browser workflows.

## Deliberately preserved

Java packages/classes/imports, Maven coordinates/name, Spring operational name/logging keys, package/lock identity, DB names/schema/migration checksums, API endpoints, container/network/volume/Compose identity, and dated historical documents. These are intentional technical/history exceptions and not user-facing branding defects. This work does not create a second database or change existing resource-category persistence/contracts.

Request-time Next rendering, standalone deployment, strict nonce CSP, private/no-store page policy, backend authorization, owner-scoped saved data, secure cookie/CSRF handling, and trusted ingress constraints remain in place. No static export, edge caching of nonce HTML, broad cookie domain, or public search API was introduced.

## Launch actions outside this checkout

1. Verify actual DNS/TLS, domain ownership/hosting, and the `.org` canonical selection. Configure owned `.com`/selected www/HTTP permanent redirects at the controlled ingress, preserving paths/queries and existing HTTP API rejection rules. Forward the real canonical public host/scheme, reject unknown hosts, and test public responses rather than assuming an environment flag configures ingress.
2. Confirm help@nextsitrep.org receives private requests and that account-data request handling is operational. A published mailto link is not proof of mailbox delivery or an automated account export/deletion feature.
3. Verify approved production VA source/credentials and real geographic availability. The backend default remains sandbox and the provider client currently retrieves a limited first page. This SEO change does not fabricate programs or certify complete results.
4. Keep `SITE_INDEXING_ENABLED=false` for development/staging. Only after launch verification, set `SITE_URL=https://nextsitrep.org`, `HTTPS_DEPLOYMENT=true`, and `SITE_INDEXING_ENABLED=true` in production. Check that the public HTTPS response has no unintended noindex, robots allows public content, and the sitemap contains only the 12 intended public URLs.
5. Verify Search Console ownership and submit the sitemap through the owner's account. Monitor coverage and actual queries before expanding the qualitative keyword strategy. No rankings, rich-result outcome, Core Web Vitals score, or deployed redirect was claimed.

See the [frontend README](../../frontend/README.md#branding-public-guides-and-search-indexing) for the configuration contract. No code was committed/pushed and no deployment, DNS change, external message, or Search Console mutation was performed.

## Validation

- Frontend unit/component suite: **170 tests passed**, including both original navbar tests and 18 SEO/environment/serialization cases.
- Frontend lint and formatting checks: passed.
- Production build and TypeScript: passed; public/auth/private HTML and crawl endpoints retain dynamic server rendering. The Apple icon is a static asset.
- Production HTTP/security/SEO regression suite: **4 tests passed**, covering both HTTPS flag modes, public/private initial metadata, all guides, exact brand, unique descriptions/titles, canonical/social URLs, viewport, nonce JSON-LD, default-off/explicit-on crawl files, images, unknown-guide 404, and existing API/CSP regressions.
- Backend offline Maven verify: **280 tests passed**, coverage gate passed.
- Browser regression suite: **3 tests passed**, including login/search/save retry/notes/logout, error recovery, accessibility and long-content reflow at **320/768/1280px**, and all seven public guide routes. The long-name navbar overflow was corrected with an explicit overflow-wrap rule.
- Docker Compose configuration: `docker compose config --quiet` passed.
- Final `git diff --check`: passed.

Integration suites initially hit sandbox restrictions on local socket binding; the authorized reruns use isolated local fixture servers and synthetic account/resource data. Browser automation was updated to select visible responsive controls and wait for stable, unobscured click targets rather than hidden desktop duplicates. It does not bypass application validation or invoke handlers directly.
