#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/scripts/use-node-22.sh"
cd "$ROOT_DIR"

if [ -f .env ]; then
  database_url="$(sed -n 's/^DATABASE_URL=//p' .env | head -n 1)"
  database_url="${database_url#\"}"
  database_url="${database_url%\"}"
  database_url="${database_url#\'}"
  database_url="${database_url%\'}"
else
  database_url="${DATABASE_URL:-}"
fi

if [[ "$database_url" != *"localhost:51214"* && "$database_url" != *"127.0.0.1:51214"* ]]; then
  echo "DATABASE_URL is not the managed local Prisma Postgres instance; skipping local database startup."
  exit 0
fi

mkdir -p logs pids

database_port_ready() {
  node -e 'const net=require("node:net"); const socket=net.createConnection({host:"127.0.0.1",port:51214}); socket.on("connect",()=>{socket.end();process.exit(0)}); socket.on("error",()=>process.exit(1)); setTimeout(()=>process.exit(1),500);' >/dev/null 2>&1
}

database_query_ready() {
  npx prisma db execute --stdin --schema prisma/schema.prisma >/dev/null 2>&1 <<< "select 1;"
}

if database_port_ready; then
  if database_query_ready; then
    echo "Local Prisma Postgres is already running."
    exit 0
  fi
  echo "Local Prisma Postgres port is open but SQL readiness failed; restarting local database."
  npx prisma dev stop live-receptionist >>logs/prisma-postgres.log 2>&1 || true
fi

echo "Starting local Prisma Postgres instance live-receptionist..."
npx prisma dev --name live-receptionist --detach >logs/prisma-postgres.log 2>&1
rm -f pids/prisma-postgres.pid

for _ in $(seq 1 30); do
  if database_port_ready && database_query_ready; then
    echo "Local Prisma Postgres is ready."
    exit 0
  fi
  sleep 1
done

echo "Local Prisma Postgres failed to start."
tail -n 80 logs/prisma-postgres.log || true
exit 1
