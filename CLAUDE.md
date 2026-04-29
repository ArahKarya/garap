# CLAUDE.md — Panggon Mikir

Guidance untuk AI assistant (Claude Code) saat bekerja di codebase ini.

## Apa itu Panggon Mikir

**Panggon Mikir** (Jawa: "tempat berpikir") — aplikasi *second brain* personal untuk
mengelola **task, project, dokumen, link, dan note**. Solo-user, dipakai oleh
**Yayang Setya Nugroho** (`yayang.nugroho.s@gmail.com`).

- **Domain**: `panggonmikir.arahkarya.com` (live via Cloudflare Tunnel)
- **Deploy**: RPi5 via Docker Compose, exposed via `cloudflared` tunnel
  (NOT nginx + DNS proxy — nginx exists di RPi5 tapi cuma untuk LAN/localhost).
  Lihat `docs/DEPLOY.md` untuk arsitektur deploy lengkap.
- **Auth**: Google OAuth (single user, email allowlist)

Dibangun di atas **ArahKarya Framework** — semua module bawaan (Auth, RBAC, Audit,
Settings, Notifications, File Upload, Job Queue, Bull Board) dipakai apa adanya.

## Arsitektur

- **Monorepo** pnpm workspaces: `client/`, `server/`, `packages/shared/`
- **Client**: Vite + React 19 + TS + Tailwind 4 + TanStack Query + RHF + Zod + Zustand + shadcn/ui
- **Server**: Express 5 + TS + Prisma + PostgreSQL 16 + JWT + Zod
- **Queue**: BullMQ + Redis 7 (worker proses terpisah)
- **Deploy**: Docker Compose (postgres + redis + app + worker)

## Port Mapping (jangan tabrak app lain di RPi5)

| Service | Host port | Container port |
|---|---|---|
| App | 3007 | 3007 |
| PostgreSQL | 5439 | 5432 |
| Redis | 6380 | 6379 |

## Domain Model (5 entitas inti)

Lihat `server/prisma/schema.prisma`. Semua punya `ownerId`, `createdAt`,
`updatedAt`, `deletedAt` (soft delete). Bisa di-tag via `EntityTag` polymorphic.

| Model | Tujuan | Phase |
|---|---|---|
| `Task` | Todo + due date + prioritas + sub-task hierarchy + recurrence | 1 |
| `Project` | Container task/link/note/document + milestones | 1 |
| `Link` | Bookmark multi-platform (GDrive/GitHub/Figma/Notion/dll) dengan og-tag metadata | 1 |
| `Tag` | Universal tag (polymorphic via `EntityTag`) | 1 |
| `Note` | Markdown notes (backlink antar entitas) | 2 |
| `Document` | File upload lokal atau pointer ke external_url | 2 |

## Phase Plan

- **Phase 1 — MVP** (Tasks 1-7): Task + Project + Link + Tag + Search + Dashboard
- **Phase 2 — Knowledge**: Note + Document upload + cross-entity backlink
- **Phase 3 — Productivity**: Calendar view + quick capture (PWA share target) +
  reminder (BullMQ scheduled) + weekly review template

## Auth Flow

Login Google OAuth — endpoint `/api/auth/google`:

1. Client memanggil `GET /api/auth/google` → server kembalikan `url` (Google consent screen).
2. Setelah user setuju, Google redirect ke `GOOGLE_REDIRECT_URI` dengan `code`.
3. Client POST `code` (atau `id_token` dari Google Identity Services) ke `POST /api/auth/google`.
4. Server verifikasi via `google-auth-library`, cek email di `ALLOWED_EMAILS`,
   upsert user (auto-link Google sub), terbitkan JWT access + refresh token
   (skema rotation milik skeleton tetap dipakai).

Email yang tidak ada di `ALLOWED_EMAILS` → **403 Forbidden**.

Login JWT lokal (email/password) tetap tersedia sebagai fallback dev/break-glass.

## Permissions Tambahan

Di luar 16 permission bawaan ArahKarya, Panggon Mikir tambah 17 permission domain
(`task:*`, `project:*`, `link:*`, `tag:*`, `note:*`, `document:*`). Lihat
`packages/shared/src/constants/index.ts`.

Solo-user app — user pertama otomatis dapat role `SUPER_ADMIN` dan bypass semua
permission check, jadi seluruh permission existing untuk persiapan masa depan
(misal kalau nanti add team member / share tertentu).

## Job Queues Tambahan

- `link-metadata` — fetch og-tags + favicon saat user paste URL baru
- `link-health` — scheduled sweep cek 404/private (mingguan)
- `reminder` — kirim notifikasi due-date task (in-app + opsional email)

## Prinsip Ketat (warisan ArahKarya — tetap berlaku)

1. **Zod schema share**: schema validasi selalu di `packages/shared/src/schemas/`
   — dipakai server (request body) DAN client (form). Jangan duplikat.
2. **API envelope konsisten**: semua response via `ok()` / `fail()` dari
   `@panggonmikir/shared` → `{ success, data, error, meta? }`.
3. **Immutable data**: jangan mutate, return object baru.
4. **Small files**: target <400 LOC per file, max 800.
5. **Audit everything**: mutation endpoint (POST/PATCH/DELETE) WAJIB pakai
   `audit('ACTION', 'entity')` middleware.
6. **RBAC everywhere**: protected endpoint WAJIB `requirePermissions(...)`.
   `SUPER_ADMIN` bypass otomatis.
7. **Soft delete**: domain entity WAJIB pakai `deletedAt` — jangan hard delete
   tanpa konfirmasi user via Trash UI.

## Tambahkan Module Baru

Selalu pakai generator (warisan skeleton):

```bash
pnpm new:module tasks               # Simple — CRUD langsung Prisma
pnpm new:module projects --layered  # Layered — repository + service split
```

Lalu manual:
1. Pastikan model sudah di `server/prisma/schema.prisma`
2. `pnpm --filter @panggonmikir/server db:migrate:dev --name add-<name>`
3. Register router di `server/src/routes/index.ts`
4. Add route di `client/src/App.tsx` + nav di sidebar

## Module Tier Decision (untuk Panggon Mikir)

| Module | Tier | Alasan |
|---|---|---|
| `tasks` | Simple | CRUD + filter + soft delete |
| `projects` | Simple | CRUD + milestone child + status |
| `links` | Layered | Metadata fetch async, health check, polymorphic tagging |
| `tags` | Simple | CRUD universal |
| `notes` | Simple | CRUD markdown |
| `documents` | Layered | Upload + external URL + storage abstraction |

## Testing

- Server: Vitest + supertest (`pnpm --filter @panggonmikir/server test`)
- Pakai PostgreSQL container (5439) di test, **jangan mock DB**
- Target coverage 80%+ untuk business logic (task recurrence, link metadata
  parsing, tag uniqueness)
- E2E: Playwright untuk login Google → create task → tag → search

## Branding & Trademark

Aplikasi ini WAJIB menampilkan branding ArahKarya (sesuai aturan parent framework):

- `BRANDING.APP_NAME` = "Panggon Mikir" (tampil di sidebar header, login, PWA)
- `BRANDING.COPYRIGHT` = "© Panggon Mikir — Built on ArahKarya by PT Arah Karya Sinergi"
- Footer sidebar: copyright lengkap

Logo & favicon: ganti file di `client/public/icons/` saat asset Panggon Mikir
sudah disiapkan (sementara pakai placeholder ArahKarya).

## Jangan Lakukan

- ❌ Hard delete domain entity (Task/Project/Link/Note/Document) — pakai `deletedAt`
- ❌ Skip audit log atau RBAC di endpoint mutasi
- ❌ Duplikat Zod schema antara FE dan BE
- ❌ Hard-code `ALLOWED_EMAILS`, `GOOGLE_CLIENT_*` — selalu via env
- ❌ Mock database di integration test
- ❌ Tabrak port aplikasi lain di RPi5 (3001 Keuangan, 3002 lainnya, dst.)

## File Referensi Wajib Dibaca

Sebelum coding besar, baca:
- `packages/shared/src/constants/index.ts` — permission keys, role names, queue names
- `server/src/middleware/` — error, auth, rbac, audit, validate
- `server/src/lib/errors.ts` — standard error constructors
- `server/src/services/queue.ts` — cara enqueue job
- `server/src/modules/auth/google.service.ts` — Google OAuth flow
- `docs/PRD.md` — product requirement detail
