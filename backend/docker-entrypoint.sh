#!/bin/sh
set -e

DB_PATH="${DATABASE_PATH:-/app/data/gabarito.db}"
DATA_DIR="$(dirname "$DB_PATH")"

log() {
  printf '[gabarito-api] %s\n' "$1"
}

if [ -d "$DATA_DIR" ]; then
  chown -R node:node "$DATA_DIR" 2>/dev/null || true
fi

is_valid_sqlite() {
  [ -f "$1" ] || return 1
  [ -s "$1" ] || return 1
  [ "$(dd if="$1" bs=1 count=15 2>/dev/null)" = "SQLite format 3" ]
}

if [ -f "$DB_PATH" ] && ! is_valid_sqlite "$DB_PATH"; then
  backup="${DB_PATH}.invalid.$(date +%s)"
  log "Invalid SQLite file at ${DB_PATH}; moving to ${backup}"
  mv "$DB_PATH" "$backup"
  rm -f "${DB_PATH}-wal" "${DB_PATH}-shm"
fi

cd /app

log "Applying database migrations..."
if ! gosu node npx drizzle-kit migrate; then
  log "ERROR: drizzle-kit migrate failed."
  if [ -f "$DB_PATH" ]; then
    log "Database file exists at ${DB_PATH}."
    log "If this is a fresh deploy, reset the volume:"
    log "  docker compose down && docker volume rm gabaritoweb-db && ./manage.sh prod-start"
    log "If you have data, inspect/backup the file before resetting."
  fi
  exit 1
fi

log "Starting API server..."
exec gosu node npm run start
