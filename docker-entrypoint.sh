#!/bin/sh
set -e

echo "[entrypoint] running prisma migrate deploy"
cd /app/server
npx prisma migrate deploy || echo "[entrypoint] migrate failed, continuing"

echo "[entrypoint] checking if DB needs seed"
if [ "$AUTO_SEED" = "true" ]; then
  echo "[entrypoint] running seed"
  node --experimental-specifier-resolution=node ../node_modules/.pnpm/tsx*/node_modules/tsx/dist/cli.mjs prisma/seed.ts 2>/dev/null || \
    npx tsx prisma/seed.ts || \
    echo "[entrypoint] seed skipped"
fi

cd /app
exec "$@"
