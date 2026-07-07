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
| Auth | Login email/password (JWT rotation) |
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

# 2. Copy & isi env
cp .env.docker.example .env
nano .env
#   - ALLOWED_EMAILS=yayang.nugroho.s@gmail.com
#   - JWT_ACCESS_SECRET, JWT_REFRESH_SECRET (openssl rand -base64 48)
#   - SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD (login pertama)

# 3. Migrate & seed
pnpm --filter @garap/server prisma:generate
pnpm --filter @garap/server db:migrate:dev
pnpm --filter @garap/server db:seed

# 4. Run dev
pnpm dev
```

Akses:
- Frontend: http://localhost:5173
- API: http://localhost:3007/api
- Bull Board: http://localhost:3007/admin/queues (login dulu)

## Quick Start (Docker, production-like)

```bash
cp .env.docker.example .env
# EDIT .env (ALLOWED_EMAILS + JWT secrets + SEED_ADMIN_*)

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

## Auth — Email/Password (JWT lokal)

Solo-user, email allowlist via `ALLOWED_EMAILS` (saat `PUBLIC_SIGNUP=false`).
Yang tidak terdaftar → ditolak daftar.

Endpoints:
- `POST /api/auth/login` — body `{ email, password }`, kembalikan JWT access +
  refresh token (rotation otomatis tiap refresh)
- `POST /api/auth/register` — daftar akun baru (gated `PUBLIC_SIGNUP`/`ALLOWED_EMAILS`)
- `POST /api/auth/refresh` — rotate token
- `POST /api/auth/logout` — revoke refresh token
- `GET /api/auth/me` — current user info + permissions

> **Google OAuth dihapus total (2026-07-07)** — hanya login email/password yang tersisa.

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
