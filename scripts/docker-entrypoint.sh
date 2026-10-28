#!/bin/sh
set -eu

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  node .output/scripts/migrate.js
fi

if [ "${RUN_SEED:-false}" = "true" ]; then
  node .output/scripts/seed.js
fi

exec node .output/server/index.mjs
