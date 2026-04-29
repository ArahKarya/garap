#!/bin/sh
# ArahKarya — PostgreSQL backup script
set -e

TS=$(date +%Y%m%d-%H%M%S)
OUTPUT_DIR=${OUTPUT_DIR:-./backups}
mkdir -p "$OUTPUT_DIR"

DB_USER=${POSTGRES_USER:-arahkarya}
DB_NAME=${POSTGRES_DB:-arahkarya}
OUTPUT_FILE="$OUTPUT_DIR/arahkarya-$TS.sql.gz"

if [ -n "$DOCKER_CONTAINER" ]; then
  docker exec "$DOCKER_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" | gzip > "$OUTPUT_FILE"
else
  pg_dump -U "$DB_USER" -d "$DB_NAME" | gzip > "$OUTPUT_FILE"
fi

echo "[backup] created: $OUTPUT_FILE ($(du -h "$OUTPUT_FILE" | cut -f1))"
