#!/bin/sh
set -eu

echo "[Entrypoint] Applying Prisma schema"
DB_FILE="${DATABASE_FILE_PATH:-./src/prisma/wealth-plus.db}"
DB_ALREADY_EXISTS="false"

if [ -f "$DB_FILE" ]; then
  DB_ALREADY_EXISTS="true"
fi

npm run db:push

if [ ! -f "$DB_FILE" ]; then
  echo "[Entrypoint] Database file was not created at $DB_FILE"
  exit 1
fi

if [ "${AUTO_SEED_ON_START:-true}" = "true" ]; then
  if [ "$DB_ALREADY_EXISTS" = "false" ] && [ -n "${SEED_USER1_PASSWORD:-}" ] && [ -n "${SEED_USER2_PASSWORD:-}" ]; then
    echo "[Entrypoint] Seeding default users"
    node dist/seed.js
  elif [ "$DB_ALREADY_EXISTS" = "true" ]; then
    echo "[Entrypoint] Seed skipped because database already exists"
  else
    echo "[Entrypoint] Seed skipped because seed passwords were not provided"
  fi
fi

exec node dist/index.js
