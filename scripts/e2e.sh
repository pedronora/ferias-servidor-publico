#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
BASE_URL="${E2E_BASE_URL:-http://localhost:3000}"

cleanup() {
  docker compose -f "$COMPOSE_FILE" down -v
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
