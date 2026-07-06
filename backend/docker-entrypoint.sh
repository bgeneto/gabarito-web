#!/bin/sh
set -e

DB_PATH="${DATABASE_PATH:-/app/data/gabarito.db}"
DATA_DIR="$(dirname "$DB_PATH")"

log() {
  printf '[gabarito-api] %s\n' "$1"
}

mkdir -p "$DATA_DIR"

if chown -R node:node "$DATA_DIR" 2>/dev/null; then
  log "Data directory ownership set for node user (${DATA_DIR})."
else
  log "chown unavailable; using permissive mode on ${DATA_DIR}."
  chmod -R 777 "$DATA_DIR"
fi

if ! gosu node sh -c "touch '${DATA_DIR}/.write-test' && rm '${DATA_DIR}/.write-test'"; then
  log "ERROR: ${DATA_DIR} is not writable by the node user."
  ls -lan "$DATA_DIR" || true
  exit 1
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
if ! gosu node node dist/db/migrate.js; then
  log "Migration failed. Directory listing:"
  ls -lan "$DATA_DIR" || true
  exit 1
fi

log "Starting API server..."
exec gosu node npm run start
