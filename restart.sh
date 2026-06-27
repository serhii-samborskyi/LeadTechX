#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$ROOT_DIR/scripts/use-node-22.sh"
PORT="${1:-${PORT:-3000}}"
MODE="${2:---foreground}"
HTTPS_MODE="${3:-${HTTPS_MODE:-}}"
LOG_DIR="$ROOT_DIR/logs"
PID_DIR="$ROOT_DIR/pids"
LOG_FILE="$LOG_DIR/app-$PORT.log"
PID_FILE="$PID_DIR/app-$PORT.pid"

log() {
  printf '[%s] %s\n' "$(date '+%H:%M:%S')" "$*"
}

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

kill_pid() {
  local pid="$1"
  if [ -n "$pid" ] && kill -0 "$pid" >/dev/null 2>&1; then
    log "Stopping process $pid"
    kill "$pid" >/dev/null 2>&1 || true
    for _ in 1 2 3 4 5; do
      if ! kill -0 "$pid" >/dev/null 2>&1; then
        return
      fi
      sleep 1
    done
    log "Force stopping process $pid"
    kill -9 "$pid" >/dev/null 2>&1 || true
  fi
}

cd "$ROOT_DIR"
mkdir -p "$LOG_DIR" "$PID_DIR"

if [ "$MODE" != "--foreground" ] && [ "$MODE" != "--background" ]; then
  echo "Usage: ./restart.sh [port] [--foreground|--background] [--https]"
  exit 1
fi

if [ -n "$HTTPS_MODE" ] && [ "$HTTPS_MODE" != "--https" ]; then
  echo "Usage: ./restart.sh [port] [--foreground|--background] [--https]"
  exit 1
fi

if [ "$HTTPS_MODE" = "--https" ]; then
  export HTTPS=true
fi

PROTOCOL="http"
if [ "${HTTPS:-}" = "true" ]; then
  PROTOCOL="https"
fi

if [ -f "$PID_FILE" ]; then
  old_pid="$(cat "$PID_FILE" || true)"
  kill_pid "$old_pid"
  rm -f "$PID_FILE"
fi

if has_cmd lsof; then
  port_pids="$(lsof -ti tcp:"$PORT" || true)"
  if [ -n "$port_pids" ]; then
    log "Stopping processes using port $PORT"
    for pid in $port_pids; do
      kill_pid "$pid"
    done
  fi
elif has_cmd fuser; then
  log "Stopping processes using port $PORT"
  fuser -k "${PORT}/tcp" >/dev/null 2>&1 || true
fi

if [ ! -d node_modules ]; then
  log "node_modules missing, running npm install"
  npm install
fi

log "Preparing database"
npm run db:local >/dev/null
npm run db:init >/dev/null

if [ "$MODE" = "--background" ]; then
  log "Starting app on port $PORT in background"
  PORT="$PORT" HTTPS="${HTTPS:-}" SSL_CERT="${SSL_CERT:-}" SSL_KEY="${SSL_KEY:-}" nohup node server.js >"$LOG_FILE" 2>&1 &
  app_pid="$!"
  echo "$app_pid" > "$PID_FILE"

  sleep 1
  if ! kill -0 "$app_pid" >/dev/null 2>&1; then
    log "App failed to start. Last log lines:"
    tail -n 80 "$LOG_FILE" || true
    exit 1
  fi

  log "App started"
  printf 'URL: %s://localhost:%s\n' "$PROTOCOL" "$PORT"
  printf 'PID: %s\n' "$app_pid"
  printf 'Log: %s\n' "$LOG_FILE"
else
  rm -f "$PID_FILE"
  log "Starting app on port $PORT in foreground"
  printf 'URL: %s://localhost:%s\n' "$PROTOCOL" "$PORT"
  printf 'Press Ctrl+C to stop.\n'
  exec env PORT="$PORT" HTTPS="${HTTPS:-}" SSL_CERT="${SSL_CERT:-}" SSL_KEY="${SSL_KEY:-}" node server.js
fi
