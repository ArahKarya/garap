#!/usr/bin/env bash
# ============================================================================
# Garap — Production deploy on RPi5
#
# Usage:
#   ./deploy.sh                # full rebuild + restart
#   ./deploy.sh app            # rebuild app container only (skip postgres/redis)
#   ./deploy.sh logs           # tail logs
#   ./deploy.sh down           # stop everything
#
# Prereqs:
#   - Docker + Docker Compose installed
#   - .env populated (cp .env.docker.example .env, isi semua)
#   - Cloudflare Tunnel (cloudflared) running with hostname
#     garap.arahkarya.com → http://127.0.0.1:3007 ingress rule.
#     Lihat docs/DEPLOY.md untuk setup-nya.
# ============================================================================
set -euo pipefail

cd "$(dirname "$0")"

if [[ ! -f .env ]]; then
  echo "❌ .env tidak ditemukan."
  echo "   Jalankan: cp .env.docker.example .env && nano .env"
  exit 1
fi

# Validate critical env vars
required_vars=(
  POSTGRES_PASSWORD
  JWT_ACCESS_SECRET
  JWT_REFRESH_SECRET
  GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_SECRET
  ALLOWED_EMAILS
)

# shellcheck disable=SC1091
source .env
for v in "${required_vars[@]}"; do
  if [[ -z "${!v:-}" ]] || [[ "${!v}" == "replace-with-"* ]] || [[ "${!v}" == "ganti-"* ]]; then
    echo "❌ Env var $v belum di-set di .env"
    exit 1
  fi
done

case "${1:-all}" in
  app)
    echo "→ Rebuild app + worker (postgres/redis tetap jalan)..."
    docker compose up -d --build app worker
    ;;
  logs)
    docker compose logs -f --tail=100
    ;;
  down)
    echo "→ Stop semua container..."
    docker compose down
    ;;
  all|"")
    echo "→ Full rebuild & restart..."
    docker compose up -d --build
    echo ""
    echo "→ Waiting for postgres healthy..."
    until docker compose exec -T postgres pg_isready -U "${POSTGRES_USER:-garap}" >/dev/null 2>&1; do
      sleep 2
    done
    echo "→ Run migrations..."
    docker compose exec -T app pnpm --filter @garap/server db:migrate || true
    echo "→ Seed (idempotent)..."
    docker compose exec -T app pnpm --filter @garap/server db:seed || true
    echo ""
    echo "✓ Selesai. App: http://localhost:${APP_PORT:-3007}"
    echo "  Public: ${APP_URL:-https://garap.arahkarya.com}"
    ;;
  *)
    echo "Usage: $0 [all|app|logs|down]"
    exit 1
    ;;
esac
