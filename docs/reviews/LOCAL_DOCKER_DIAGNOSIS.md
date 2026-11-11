# Local Docker/Compose diagnosis

Observed 2026-11-09 against main `652f354` on this workstation. Configuration,
daemon/container status and recent existing logs were inspected. No containers
were started/recreated, images built, volumes changed or Docker settings edited.
These are observed causes and proposed startup commands, not a successful full-stack
startup report.

## What is happening

### 1. Docker CLI is looking in a different configuration directory

`DOCKER_CONFIG` is set to `/Users/agoge/.config/docker`. That directory has no
`cli-plugins` directory. The installed Compose plugin is instead linked from
`/Users/agoge/.docker/cli-plugins/docker-compose` to Docker Desktop's application.

Observed results:

```text
docker compose version                     -> unknown command: docker compose
docker-compose --version                   -> Docker Compose version v5.3.1
docker --config ~/.docker compose version   -> Docker Compose version v5.3.1
```

Compose is installed. Its discovery path is the immediate CLI problem. The two
Docker binaries on PATH are not by themselves proof of this failure; the explicit
configuration-directory override is what successfully exposes Compose here.

The `--config` flag overrides `DOCKER_CONFIG` for one command. This behavior is
specified in the [Docker CLI configuration reference](https://docs.docker.com/reference/cli/docker/).
The command override may also select the contexts/credentials stored in that
configuration directory; both inspected configurations selected `desktop-linux`.

For a persistent repair, choose which configuration directory you intend to use:
update the existing shell export to `DOCKER_CONFIG="$HOME/.docker"`, or keep the
XDG directory and configure plugin discovery there. Review and merge settings;
do not overwrite the whole Docker config, which can contain credential settings.
This diagnosis did not change your shell configuration.

### 2. Renaming the checkout changed the default Compose project

The current checkout is `/Users/agoge/Developer/repos/github/NextSITREP`. Compose
resolves its project name to `nextsitrep`. Its existing containers belong to
`veterans-connect`:

| Container | Existing project | Observed state |
| --- | --- | --- |
| vet-connect-db | veterans-connect | Exited, code 0 |
| vet-connect-backend | veterans-connect | Exited, code 143; historical logs show graceful shutdown |
| vet-connect-frontend | veterans-connect | Exited, code 0 |

The database container mounts **veterans-connect_postgres_data**. A normal `ps`
under the new project shows no services even though these older containers exist.
The Compose file also fixes their `container_name` values. Creating a second
project with those names would collide with the old containers; a differently
named project would normally use different project-scoped volume names too.

Use `-p veterans-connect` to address the existing local stack consistently. Project
name precedence and directory defaults are documented by
[Docker Compose](https://docs.docker.com/compose/how-tos/project-name/).
Keeping an old internal project name is compatible with NextSITREP public branding.
A future infrastructure rename needs an explicit data/resource migration plan.

### 3. The application services require a profile

The default resolved service list is only `postgres`. The `full-stack` profile
adds `backend` and `frontend`; `tools` adds pgAdmin. Running a plain `up` does not
start the application services in this repository. This follows the configured
[Compose profile behavior](https://docs.docker.com/reference/compose-file/profiles/).

### 4. Existing containers do not contain the current source

The stopped frontend's logs show Next.js **16.1.1**. The current source pins
**16.4.5**. Restarting that old container does not rebuild it with sections 1–4.
Historical backend logs show an older successful startup and later shutdown;
they do not establish how the current backend image would start.

Use a build when bringing up the current full stack. Image downloads, builds,
migrations and application health must still be checked after actually running it.

## Commands for this workstation

Run from the repository root:

```sh
cd /Users/agoge/Developer/repos/github/NextSITREP

# Read-only: confirm Compose discovery and validate the selected model.
docker --config "$HOME/.docker" compose version
docker --config "$HOME/.docker" compose -p veterans-connect --profile full-stack config --quiet

# Proposed startup: reuse the existing project/database and rebuild current apps.
docker --config "$HOME/.docker" compose -p veterans-connect --profile full-stack up -d --build

# Inspect startup and health.
docker --config "$HOME/.docker" compose -p veterans-connect --profile full-stack ps -a
docker --config "$HOME/.docker" compose -p veterans-connect --profile full-stack logs --tail 100 backend frontend
```

The version/config checks above were run successfully. The startup command was
not executed during diagnosis: it rebuilds/recreates application containers and
starts the current backend against the existing database, including its normal
Flyway migration checks.

For database-only development, followed by Maven/IDE and Next on the host:

```sh
docker --config "$HOME/.docker" compose -p veterans-connect up -d postgres
```

The already-working standalone command can also address the same stack:

```sh
docker-compose -p veterans-connect --profile full-stack up -d --build
```

Using the same explicit project name matters whichever spelling you choose.
Do not delete `veterans-connect_postgres_data` to solve plugin discovery or a
project-name mismatch. A volume deletion would discard existing local data.

## What was checked and what remains unverified

- Docker Desktop responds: Engine 29.6.2, Linux ARM64 daemon.
- The root `.env` exists and required database/JWT/VA entries are populated.
  Values were not included in this report.
- JWT_SECRET satisfies the application's Base64/minimum-32-byte format check.
  That check does not establish how it was generated or any deployment readiness.
- Both the default Compose model and the explicit existing-project/full-stack
  model validate. Full-stack service resolution includes postgres/backend/frontend.
- Existing containers are stopped; their state does not show an OOM kill or a
  new startup error. Recent frontend output says Ready but belongs to the old build.
- No full-stack build/start, current image health, provider request, registry pull
  or database migration was exercised during this inspection.

If a subsequent build fails, retain the first failing build step and its error.
If images build but services remain unhealthy, inspect the new backend/frontend
logs and dependency health. With default port settings the browser app is at
`http://localhost:3000` and backend health is at
`http://localhost:8080/actuator/health`; use your configured ports if different.
Recheck these after startup rather than treating older logs as current evidence.

For permanent Compose-name changes, coordinate container names, network names and
volume attachment. Public branding can be updated without renaming these resources;
see the [manual rebranding checklist](NEXTSITREP_MANUAL_REBRANDING_CHECKLIST.md).
