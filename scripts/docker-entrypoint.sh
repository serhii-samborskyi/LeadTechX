#!/usr/bin/env bash
set -euo pipefail

if [ "${RUN_DB_DEPLOY_ON_START:-0}" = "1" ]; then
  echo "[docker] Running database deployment before app start"
  for attempt in 1 2 3 4 5; do
    if npm run db:deploy; then
      break
    fi
    if [ "$attempt" = "5" ]; then
      echo "[docker] Database deployment failed after $attempt attempts"
      exit 1
    fi
    echo "[docker] Database deployment failed on attempt $attempt; retrying in 5 seconds"
    sleep 5
  done
else
  echo "[docker] Skipping database deployment; set RUN_DB_DEPLOY_ON_START=1 to enable"
fi

exec "$@"
