#!/usr/bin/env bash
set -Eeuo pipefail

# Execute on NextSITREP Development EC2 via SSM Session Manager.
# Deploys reviewed origin/main only. Does not run Terraform or modify SSM parameters.
APP_DIR="/opt/nextsitrep/app"
COMPOSE_FILE="docker-compose.aws-dev.yml"
APP_ENV=".env"
VA_ENV="/etc/nextsitrep/secrets/va-api.env"
BRANCH="main"
DRY_RUN=false
PREVIOUS_COMMIT=""

usage() { printf 'Usage: %s [--dry-run]\n' "$0"; }
case "${1:-}" in
  --dry-run) DRY_RUN=true ;;
  '') ;;
  *) usage >&2; exit 2 ;;
esac

log() { printf '\n%s\n' "$*"; }
fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

on_error() {
  local status=$?
  printf '\nDEPLOYMENT FAILED (exit %s).\n' "$status" >&2
  if [[ -n "$PREVIOUS_COMMIT" ]]; then
    printf 'Previous reviewed commit: %s\n' "$PREVIOUS_COMMIT" >&2
    printf 'Do not blindly reset Git or restart PostgreSQL. Investigate container logs and follow README recovery steps.\n' >&2
  fi
  exit "$status"
}
trap on_error ERR

[[ -d "$APP_DIR/.git" ]] || fail "Expected EC2 repository at $APP_DIR"
cd "$APP_DIR"
for tool in git docker sudo; do
  command -v "$tool" >/dev/null 2>&1 || fail "Missing command: $tool"
done
[[ -f "$COMPOSE_FILE" && -f "$APP_ENV" ]] || fail "Missing Compose file or application .env"
[[ -f backend/Dockerfile && -f frontend/Dockerfile ]] || fail "Missing Dockerfile"
[[ "$(git branch --show-current)" == "$BRANCH" ]] || fail "Expected branch $BRANCH"
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || fail "Tracked working tree is dirty"
# The EC2 operator must be authorized to run Docker Compose with sudo.
sudo -n true || fail "Noninteractive sudo authorization is required"
sudo test -f "$VA_ENV" || fail "Protected VA environment file missing"
sudo docker compose version >/dev/null || fail "Docker Compose plugin unavailable"

compose() {
  sudo docker compose --env-file "$APP_ENV" --env-file "$VA_ENV" -f "$COMPOSE_FILE" "$@"
}

log 'NextSITREP — Development deployment'
log "Current commit: $(git rev-parse --short HEAD)"
log 'Validating current Compose configuration (secrets not printed)...'
compose config --quiet

if [[ "$DRY_RUN" == true ]]; then
  cat <<'PLAN'
DRY RUN: No Git fetch, code update, build, or container change performed.
Actual deployment will:
  1. Fetch and fast-forward to reviewed origin/main.
  2. Validate Compose using both protected environment files.
  3. Build frontend and backend images.
  4. Recreate backend and frontend only (no dependencies).
  5. Check backend container health and frontend HTTP response.
  6. Report deployed commit or previous commit for manual recovery.
PLAN
  exit 0
fi

log 'Fetching reviewed origin/main...'
git fetch origin "$BRANCH"
git merge-base --is-ancestor HEAD "origin/$BRANCH" || fail 'origin/main is not a fast-forward'
PREVIOUS_COMMIT="$(git rev-parse HEAD)"
NEXT_COMMIT="$(git rev-parse "origin/$BRANCH")"
if [[ "$PREVIOUS_COMMIT" == "$NEXT_COMMIT" ]]; then
  log 'Already at latest origin/main. No containers changed.'
  exit 0
fi

git merge --ff-only "origin/$BRANCH"
log 'Validating updated Compose configuration...'
compose config --quiet
log 'Building application images without replacing running containers...'
compose build backend frontend

wait_for_backend() {
  local cid status attempt
  cid="$(compose ps -q backend)"
  [[ -n "$cid" ]] || fail 'Backend container not found'
  for ((attempt=1; attempt<=60; attempt++)); do
    status="$(sudo docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' "$cid")"
    case "$status" in
      healthy) log 'Backend health: healthy'; return 0 ;;
      unhealthy|no-healthcheck) fail "Backend health status: $status" ;;
    esac
    sleep 2
  done
  fail 'Backend did not become healthy within 120 seconds'
}

wait_for_frontend() {
  local cid attempt
  cid="$(compose ps -q frontend)"
  [[ -n "$cid" ]] || fail 'Frontend container not found'
  # The frontend runtime is Node.js. Probe locally inside the container, avoiding Cloudflare Access.
  for ((attempt=1; attempt<=60; attempt++)); do
    if sudo docker exec "$cid" node -e '
      const timeout = AbortSignal.timeout(4000);
      fetch("http://127.0.0.1:3000/", { signal: timeout, redirect: "manual" })
        .then(r => process.exit(r.status >= 200 && r.status < 400 ? 0 : 1))
        .catch(() => process.exit(1));
    ' >/dev/null 2>&1; then
      log 'Frontend HTTP: responding (2xx/3xx)'
      return 0
    fi
    sleep 2
  done
  fail 'Frontend did not respond successfully within 120 seconds'
}

log 'Updating backend (without dependencies)...'
compose up -d --no-deps --no-build backend
wait_for_backend
log 'Updating frontend (without dependencies)...'
compose up -d --no-deps --no-build frontend
wait_for_frontend

log "Deployment succeeded: $(git rev-parse --short HEAD)"
log 'PostgreSQL and cloudflared were not targeted for recreation.'
log 'Complete a signed-in browser smoke test at https://dev.nextsitrep.org.'
