# Backend environment configuration (H2-A)

Select exactly one environment using `SPRING_PROFILES_ACTIVE`. There is no relaxed
default. The legacy `dev` profile is rejected with an activation error.

| Environment | Activation | Configuration |
| --- | --- | --- |
| Local workstation / local Compose | `local` | Shared settings plus local PostgreSQL and HTTP-cookie defaults. Still requires a private JWT secret. Never use for AWS. |
| Automated tests | `test` | Shared settings plus H2 and a public test-only JWT fixture in `src/test/resources`. Keeps Flyway, Hibernate validation, and the real security chain available. Not packaged in the runtime JAR; packaged launches reject `test`. |
| AWS Development account | `aws-dev` | Activates the shared hardened `deploy` group. Requires account-local credentials and an exact HTTPS browser origin. |
| AWS Production account | `prod` | Activates the same hardened `deploy` group, with independent production credentials and origin. |

`application.properties` holds shared settings, `application-local.properties` only
local overrides, and `application-deploy.properties` the common deployed lifetime
default. There is no duplicated production/development cloud configuration. See
[Spring Boot profile groups](https://docs.spring.io/spring-boot/3.4/reference/features/profiles.html#features.profiles.groups).
Do not activate `deploy` alone. Combining environment profiles, including
`prod,local`, `prod,test`, or `prod,aws-dev`, fails startup regardless of order.
Auxiliary profiles are allowed alongside exactly one environment; they cannot
bypass validation of the effective settings.

## Required deployment settings

Set these in the runtime environment or equivalent external Spring configuration.
No cloud credentials or environment-specific secrets belong in the image, Git,
frontend, command-line history, or documentation. Spring's canonical property
names are also supported, for example `spring.datasource.url` from external config.

| Variable | Requirement / deployed default |
| --- | --- |
| `SPRING_PROFILES_ACTIVE` | `aws-dev` or `prod`, matching the AWS account. |
| `JWT_SECRET` | Independent random Base64-encoded key, at least 32 decoded bytes. Missing/blank, malformed, weak, and the known legacy key are rejected using the C1 checks. Length does not prove randomness; generate it with `openssl rand -base64 32`. |
| `SPRING_DATASOURCE_URL` | Explicit single-host `jdbc:postgresql://HOST:PORT/DATABASE` URL; optional query parameters such as `sslmode=verify-full`. No embedded user/password or credential query parameters. Local `POSTGRES_*` aliases do not satisfy this requirement in deployed profiles. |
| `SPRING_DATASOURCE_USERNAME` | Explicit, nonblank application database username. Use an account-local least-privilege role; no `postgres` fallback. Role permissions are not inspected by configuration validation. |
| `SPRING_DATASOURCE_PASSWORD` | Explicit, nonblank account-local database password; no fallback. Supply securely at runtime. |
| `CORS_ALLOWED_ORIGINS` | Comma-separated exact HTTPS public frontend origins, e.g. `https://app.example.com`. No wildcard, credentials, path, trailing slash, query, fragment, or empty list entry. Use the development hostname in AWS Development. |
| `JWT_COOKIE_SECURE` | Defaults to `true`; any deployment override other than true is rejected. Session and CSRF cookies are Secure even when TLS terminates before Spring. |
| `JWT_COOKIE_SAME_SITE` | Defaults to `Lax`; supports `Lax`, `Strict`, and `None`. `None` requires Secure, including locally. Prefer `Lax` for the existing same-origin browser flow. |
| `JWT_COOKIE_NAME` | Defaults to `vc_session`; must be a valid cookie name. `__Host-` / `__Secure-` names require Secure. The session remains HttpOnly, host-only, path `/`. |
| `JWT_EXPIRATION` | Deployed default `3600000` ms (one hour). Must be a positive integer; deployed maximum `86400000` ms (24 hours). Local/test default stays 24 hours. |
| `SPRING_JPA_SHOW_SQL` | Defaults to false; true is rejected in deployments. This does not replace the separate audit of application/debug logging. |

Provider, geocoding, and authentication-rate-limit variables retain their existing
behavior. This change does not certify provider credentials, quotas, or endpoint
readiness. Review those separately before using real data.

`spring.flyway.enabled=true`, `spring.flyway.clean-disabled=true`, and
`spring.jpa.hibernate.ddl-auto=validate` are startup invariants. Attempts to disable
migrations, enable Flyway clean, or switch Hibernate to update/create are rejected.
Migration SQL is unchanged. Existing migrations must succeed and Hibernate must
validate the migrated database before the full application becomes ready.

## Local development and Compose compatibility

Provide a local random `JWT_SECRET` and activate `local` in your shell/IDE. For
example, after setting your local variables:

```bash
SPRING_PROFILES_ACTIVE=local ./backend/mvnw -f backend/pom.xml spring-boot:run
```

`backend/.env.example` is a template, not an automatically loaded Spring file.
Compose reads the root `.env`; direct Maven/IDE launches require exported variables
or IDE configuration. The local profile supports existing `POSTGRES_HOST`,
`POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD` settings,
or explicit `SPRING_DATASOURCE_*` overrides. Only this profile supplies the former
localhost/postgres defaults and non-Secure cookie default for local HTTP.

**Compatibility change:** the repository Compose definition explicitly pins
`local`. Its `SPRING_PROFILES_ACTIVE` no longer comes from root `.env`. Existing
`.env` files with `dev` still work through Compose because of that pin, but direct
launches must change `dev` to `local`. Missing profile activation now fails fast.
Do not reuse this local Compose definition for AWS by changing that one variable;
it contains local database/admin port mappings and local-only settings. An AWS
runtime definition must supply `aws-dev`/`prod` and the required settings above.
No real `.env` file is modified by this patch.

## Startup validation and cookies

A registered `EnvironmentPostProcessor` runs after Spring loads profile config and
before datasource, Flyway, web-server, or other application beans are initialized.
It validates effective overrides as well as defaults. Errors name settings and
rules, without echoing rejected values or attaching secret-bearing parser causes.
The C1 signing-key validator is reused without changing token signing/verification.

The session cookie continues to be HttpOnly and host-only. The CSRF cookie remains
readable by JavaScript for H1's cookie/header handshake; hardened profiles force
its Secure flag independently of the servlet's internal HTTP/HTTPS scheme. CSRF
and exact-origin CORS are still enabled. H2-B now supplies guarded forwarding and
HTTPS enforcement; see [HTTPS/proxy configuration](HTTPS_SECURITY.md).
Browser requests must continue to use the shared-origin `/api/*` ingress.

These checks validate configuration, not the actual AWS account, network path,
certificate, database grants, secret randomness or distinctness across accounts.
Keep activation/configuration restricted to the correct deployment role. Actual
HTTPS routing, trusted-proxy handling, database certificate verification and
private networking require deployment verification. Supplying a JDBC URL without
`sslmode=verify-full` is not blocked by this H2-A change; database TLS policy remains
a separate readiness requirement. H2-B application controls are documented separately;
H2-C and actual AWS transport verification remain pending.

## Tests and CI

```bash
cd backend
./mvnw clean verify -B
```

Spring MVC/JPA tests explicitly activate `test`; no real database or JWT secret is
needed. Configuration tests start a minimal Spring application with actual config
files and the registered validator, isolated from developer environment variables;
they cover both cloud profile groups, missing/invalid settings, profile conflicts,
sanitized errors, local/test behavior, and security/migration invariants. The C1/H1
regression tests remain in the full suite. The secure-cookie regression also tests
an internal HTTP request behind TLS termination.

CI needs no profile/secret injection for these tests. The existing workflow still
runs `test` rather than `verify`; wiring the coverage gate into CI remains the
separate release-check finding. The local acceptance command above executes the
suite, packaging, and the unchanged 70% JaCoCo gate. No dependency/POM, workflow,
frontend, migration, or AWS resource change is part of H2-A.

## Verification recorded for this change

- `./mvnw -o clean verify -B`: **192 tests passed**, no failures/errors/skips.
- JaCoCo: **618/798 lines, 77.44%**, above the unchanged 70% requirement.
- Packaged-JAR smoke checks: missing profile, missing `prod`/`aws-dev` settings,
  invalid production settings, and packaged `test` activation all reject startup
  before database/web infrastructure. Invalid-value secret sentinels do not appear
  in output. The JAR excludes test config and retains migration SQL unchanged.
- Executed on the installed **JDK 25.0.2**, with compiler `release=21` (Java 21
  class format). A Java 21 runtime was not installed locally; the existing Java 21
  CI job still needs to run against this change.
- Tests ran in an isolated review copy; applied source is checked against that
  exact tested copy. No actual PostgreSQL server, browser HTTPS deployment, Docker
  image startup, or AWS account was exercised by these configuration checks.
