#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-ferias-e2e}"
BASE_URL="${E2E_BASE_URL:-http://localhost:3000}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin12345}"

export COMPOSE_PROJECT_NAME ADMIN_EMAIL ADMIN_PASSWORD

cleanup() {
  docker compose -f "$COMPOSE_FILE" down -v --remove-orphans
}
trap cleanup EXIT

SEED_DEMO_DATA=true docker compose -f "$COMPOSE_FILE" up -d --build

for attempt in $(seq 1 60); do
  if curl -fsS "$BASE_URL/api/health" >/dev/null 2>&1; then
    break
  fi
  if [ "$attempt" -eq 60 ]; then
    echo "A aplicação não ficou saudável a tempo." >&2
    docker compose -f "$COMPOSE_FILE" logs app
    exit 1
  fi
  sleep 2
done

pnpm exec playwright test "$@"
