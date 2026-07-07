# Garap

> *Tempat berpikir, mengelola, dan menyimpan.*

Aplikasi *second brain* personal — task, project, dokumen, link, dan note dalam
satu tempat. Solo-user, deploy di RPi5, akses lewat
`garap.arahkarya.com`.

Dibangun di atas **[ArahKarya Framework](https://github.com/ArahKarya/ArahKarya-Frameworks)**
(React + Express + Prisma + PostgreSQL + BullMQ).

## Status

Phase 1 — MVP (sedang dibangun).

| Phase | Fitur | Status |
|---|---|---|
| 1 | Task + Project + Link + Tag + Search + Dashboard | In progress |
| 2 | Note + Document upload + cross-entity backlink | Planned |
| 3 | Calendar + quick capture + reminder + weekly review | Planned |

## Tech Stack

| Layer | Choice |
|---|---|
| Monorepo | pnpm workspaces |
| Frontend | React 19 + Vite + Tailwind 4 + TanStack Query + Zustand + shadcn/ui |
| Backend | Node 20 + Express 5 + Prisma + PostgreSQL 16 |
| Queue | BullMQ + Redis 7 |
| Auth | Google OAuth (primary) + JWT rotation fallback |
| Logging | Pino |
| Deploy | Docker Compose di RPi5 |

## Port Mapping (RPi5)

| Service | Host port | Container port |
|---|---|---|
| App | 3007 | 3007 |
| PostgreSQL | 5439 | 5432 |
| Redis | 6380 | 6379 |

## Quick Start (Development)

**Prasyarat**: Node 20+, pnpm 10+, PostgreSQL 16, Redis 7.

```bash
# 1. Install dependencies
pnpm install

# 2. Siapkan Google OAuth credentials
#    https://console.cloud.google.com → APIs & Services → Credentials
#    Buat OAuth 2.0 Client (Web application)
#    Authorized redirect URIs:
#      - http://localhost:3007/api/auth/google/callback
#      - https://garap.arahkarya.com/api/auth/google/callback

# 3. Copy & isi env
cp .env.docker.example .env
nano .env
#   - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
#   - ALLOWED_EMAILS=yayang.nugroho.s@gmail.com
#   - JWT_ACCESS_SECRET, JWT_REFRESH_SECRET (openssl rand -base64 48)

# 4. Migrate & seed
pnpm --filter @garap/server prisma:generate
pnpm --filter @garap/server db:migrate:dev
pnpm --filter @garap/server db:seed

# 5. Run dev
pnpm dev
```

Akses:
- Frontend: http://localhost:5173
- API: http://localhost:3007/api
- Bull Board: http://localhost:3007/admin/queues (login dulu)

## Quick Start (Docker, production-like)

```bash
cp .env.docker.example .env
# EDIT .env (Google OAuth + JWT secrets)

./deploy.sh             # build + up + migrate + seed
docker compose logs -f app
```

App accessible:
- `http://localhost:3007` — direct
- `https://garap.arahkarya.com` — public via Cloudflare Tunnel
  (cloudflared needs ingress rule for the hostname; lihat
  [docs/DEPLOY.md](./docs/DEPLOY.md))

## Domain Model

Lihat `server/prisma/schema.prisma`. Lima entitas utama saling terhubung:

```
User (Yayang)
 ├── Project ──┬── Task (sub-task hierarchy)
 │            ├── Link (with og-metadata)
 │            ├── Note (markdown — Phase 2)
 │            ├── Document (Phase 2)
 │            └── Milestone
 └── Tag (polymorphic via EntityTag)
```

Semua punya `deletedAt` (soft delete) dan auto-audited.

## Auth — Google OAuth

Solo-user, email allowlist via `ALLOWED_EMAILS`. Yang tidak terdaftar → 403.

Endpoints:
- `GET /api/auth/google` — kembalikan URL Google consent screen
- `POST /api/auth/google` — body `{ idToken }` atau `{ code }`, kembalikan
  JWT access + refresh token (rotation otomatis tiap refresh)
- `POST /api/auth/refresh` — rotate token
- `POST /api/auth/logout` — revoke refresh token
- `GET /api/auth/me` — current user info + permissions

Login email/password (`POST /api/auth/login`) tetap ada sebagai fallback.

## Branding

App branding di-control via `BRANDING` constant
(`packages/shared/src/constants/index.ts`):

- `APP_NAME` = "Garap"
- `COPYRIGHT` = "© Garap — Built on ArahKarya by PT Arah Karya Sinergi"

Logo & favicon: sudah pakai aset Garap sendiri di `client/public/icons/`.

## Scripts

```bash
pnpm dev                # client + server paralel
pnpm dev:server         # API only
pnpm dev:worker         # BullMQ worker
pnpm build              # build semua
pnpm typecheck          # tsc semua workspace
pnpm test               # vitest semua

pnpm db:migrate         # prisma migrate deploy
pnpm db:seed            # seed admin + roles + permissions + settings
pnpm db:reset           # WARNING: drop + migrate + seed (DEV only)

pnpm new:module <name>            # generate modul simple
pnpm new:module <name> --layered  # generate modul layered
```

## Documentation

- [docs/PRD.md](./docs/PRD.md) — Product Requirements
- [CLAUDE.md](./CLAUDE.md) — AI agent guidance

## License

Private — internal personal use.

---

**Powered by ArahKarya Framework** — © PT Arah Karya Sinergi
