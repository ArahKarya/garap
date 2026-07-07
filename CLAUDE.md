# CLAUDE.md — Garap

Guidance untuk AI assistant (Claude Code) saat bekerja di codebase ini.

> **Renamed 2026-06-04:** sebelumnya **Panggon Mikir** (folder `Panggon-Mikir`, domain
> `panggonmikir.arahkarya.com`, package `@panggonmikir/*`, DB `panggonmikir_db`). Sekarang
> **Garap** — folder `/home/arah/apps/garap`, repo `ArahKarya/garap`, domain
> `garap.arahkarya.com`, package `@garap/*`, DB `garap_db`/role `garap`.
> **Update 2026-07-07 (rebrand total):** volume Docker juga di-rename ke `garap_*`
> (deploy fresh di PC arah-pc; volume lama `panggon-mikir_*` hanya ada di RPi5 — kalau
> data lama dibutuhkan, migrasi manual via dump/restore).

## Apa itu Garap

**Garap** (Jawa: "menggarap/mengerjakan") — aplikasi *second brain* personal untuk
mengelola **task, project, dokumen, link, dan note**. Solo-user, dipakai oleh
**Yayang Setya Nugroho** (`yayang.nugroho.s@gmail.com`).

- **Domain**: `garap.arahkarya.com` (live via Cloudflare Tunnel)
- **Deploy**: RPi5 via Docker Compose, exposed via `cloudflared` tunnel
  (NOT nginx + DNS proxy — nginx exists di RPi5 tapi cuma untuk LAN/localhost).
  Lihat `docs/DEPLOY.md` untuk arsitektur deploy lengkap.
- **Auth**: Login email/password (JWT lokal, single user, email allowlist)

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

## Domain Model (7 entitas inti)

Lihat `server/prisma/schema.prisma`. Semua punya `ownerId`, `createdAt`,
`updatedAt`, `deletedAt` (soft delete). Hierarki:
**Workspace → Project → {Task, Link, Note, Document, Reference}**.
Task/Link/Note/Document/Reference punya FK langsung ke Workspace (NOT NULL)
plus FK opsional ke Project. Link juga bisa attached ke Task spesifik
(nullable `taskId`). Bisa di-tag via `EntityTag` polymorphic.

| Model | Tujuan | Phase |
|---|---|---|
| `Workspace` | Container per perusahaan/konteks; root hierarki | 2 |
| `Task` | Todo + due date + prioritas + sub-task hierarchy + recurrence | 1 |
| `Project` | Container task/link/note/document + milestones (dalam workspace) | 1 |
| `Link` | Bookmark multi-platform (og-tag metadata); bisa attached ke task | 1 |
| `Tag` | Universal tag (polymorphic via `EntityTag`) | 1 |
| `Note` | Markdown notes (backlink antar entitas) | 2 |
| `Document` | File upload lokal atau pointer ke external_url | 2 |
| `Reference` | Bibliografi: buku, jurnal, paper, thesis, dengan DOI/ISBN/authors | 2 |

## Phase Plan

- **Phase 1 — MVP** (Tasks 1-7): Task + Project + Link + Tag + Search + Dashboard
- **Phase 2 — Knowledge**: Note + Document upload + cross-entity backlink
- **Phase 3 — Productivity**: Calendar view + quick capture (PWA share target) +
  reminder (BullMQ scheduled) + weekly review template

## Auth Flow

Login email/password (JWT lokal) — endpoint `/api/auth/login`:

1. Client POST `{ email, password }` ke `POST /api/auth/login`.
2. Server verifikasi password (bcrypt), cek gating verifikasi email bila
   `REQUIRE_EMAIL_VERIFICATION=true`, lalu terbitkan JWT access + refresh token
   (skema rotation milik skeleton tetap dipakai).
3. Pendaftaran via `POST /api/auth/register` (aktif saat `PUBLIC_SIGNUP=true`;
   saat `false` hanya email di `ALLOWED_EMAILS` yang boleh daftar).

Email yang tidak ada di `ALLOWED_EMAILS` (saat `PUBLIC_SIGNUP=false`) → ditolak.

> **Google OAuth dihapus total (2026-07-07):** fitur login Google dibuang atas
> perintah Ndoro ("menyulitkan"). Yang tersisa hanya login email/password.

Login JWT lokal (email/password) adalah satu-satunya jalur autentikasi.

## Permissions Tambahan

Di luar 16 permission bawaan ArahKarya, Garap tambah 23 permission domain
(`workspace:*`, `task:*`, `project:*`, `link:*`, `tag:*`, `note:*`,
`document:*`, `reference:*`). Lihat `packages/shared/src/constants/index.ts`.

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
   `@garap/shared` → `{ success, data, error, meta? }`.
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
2. `pnpm --filter @garap/server db:migrate:dev --name add-<name>`
3. Register router di `server/src/routes/index.ts`
4. Add route di `client/src/App.tsx` + nav di sidebar

## Module Tier Decision (untuk Garap)

Saat ini semua module pakai tier **Simple** (`routes.ts + service.ts`, service
akses Prisma langsung). Upgrade ke Layered hanya saat business logic
benar-benar berat dan butuh repository abstraction.

| Module | Tier | Alasan |
|---|---|---|
| `workspaces` | Simple | CRUD + isDefault flip + soft delete |
| `tasks` | Simple | CRUD + filter + recurrence + sub-task |
| `projects` | Simple | CRUD + milestone child + status |
| `links` | Simple | CRUD + metadata fetch (sync di create) + health worker |
| `tags` | Simple | CRUD universal |
| `notes` | Simple | CRUD markdown |
| `documents` | Simple | Upload + external URL + path-traversal guard |
| `references` | Simple | Bibliografi: 9 type, search judul/authors/DOI |

## Testing

- Server: Vitest + supertest (`pnpm --filter @garap/server test`)
- Pakai PostgreSQL container (5439) di test, **jangan mock DB**
- Target coverage 80%+ untuk business logic (task recurrence, link metadata
  parsing, tag uniqueness)
- E2E: Playwright untuk login email/password → create task → tag → search

## Branding & Trademark

Aplikasi ini WAJIB menampilkan branding ArahKarya (sesuai aturan parent framework):

- `BRANDING.APP_NAME` = "Garap" (tampil di sidebar header, login, PWA)
- `BRANDING.COPYRIGHT` = "© Garap — Built on ArahKarya by PT Arah Karya Sinergi"
- Footer sidebar: copyright lengkap

Logo & favicon: sudah pakai aset **Garap** sendiri (huruf "G" + centang mint di atas
rounded-square emerald `#10b981`, gaya mirip app Tilik). Master SVG di
`client/public/icons/icon.svg` + `icon-maskable.svg`; PNG (192/512/maskable/arah-bk/arah-wh)
+ `favicon.ico` di-generate dari situ via `rsvg-convert`/`magick`. Tema app juga emerald
(lihat `client/src/styles/index.css`). Saat ganti aset: regenerate semua PNG, bump
`?v=` di `index.html`/`BRANDING.LOGO_*` dan `CACHE_NAME` di `client/public/sw.js`.

## Jangan Lakukan

- ❌ Hard delete domain entity (Task/Project/Link/Note/Document) — pakai `deletedAt`
- ❌ Skip audit log atau RBAC di endpoint mutasi
- ❌ Duplikat Zod schema antara FE dan BE
- ❌ Hard-code `ALLOWED_EMAILS`, JWT secrets — selalu via env
- ❌ Mock database di integration test
- ❌ Tabrak port aplikasi lain di RPi5 (3001 Keuangan, 3002 lainnya, dst.)

## File Referensi Wajib Dibaca

Sebelum coding besar, baca:
- `packages/shared/src/constants/index.ts` — permission keys, role names, queue names
- `server/src/middleware/` — error, auth, rbac, audit, validate
- `server/src/lib/errors.ts` — standard error constructors
- `server/src/services/queue.ts` — cara enqueue job
- `server/src/modules/auth/auth.service.ts` — login/register/refresh email/password
- `docs/PRD.md` — product requirement detail
