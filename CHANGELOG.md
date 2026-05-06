# Changelog

## [0.6.0] — 2026-05-06

### Task UX

- Click task title → opens TaskDetailDialog (read-only view + edit pivot)
  with status/priority/recurrence badges, sub-task checklist, full tag picker,
  and per-task link attachments
- New Link.taskId nullable FK (migration `20260506000000_add_task_id_to_links`):
  attach work URLs (Google Docs, Figma, GitHub PR) directly to a task
- Tasks list always shows DONE/CANCELLED in muted color (was hidden); active
  tasks ranked above completed for focus
- Project detail page: separate "Selesai" tab for completed tasks
- Inline search bar on Tasks (debounced 250ms, server-side title/desc filter)
- Inline TagPicker (replaced base-ui Popover that was conflicting with Radix
  Dialog portal — clicks now register reliably)
- Refresh metadata preserves user-edited title/description (only fills if empty)

### Workspace management

- New /workspaces page: edit, set default, archive/unarchive, delete; non-default
  guard rails
- "Kelola workspace" link in sidebar switcher dropdown
- Sticky DialogFooter on long-form dialogs (Notes, Tasks edit, References) so
  Save button is always reachable; max-h-[90vh] overflow on all form dialogs

### Bug fixes

- Dashboard now properly workspace-scoped (was leaking orphan tasks across
  workspaces via legacy OR-filter)
- Task list 422 silent failure on `limit>100` (raised cap to 500)
- Form workspaceId silent validation failure when activeWorkspaceId loaded
  late (added useEffect sync)
- Form Save button silent failure on Zod errors (manual onSubmit + safeParse +
  toast)
- Google OAuth audience mismatch (fresh `docker compose build --no-cache` +
  fixed server/.env GOOGLE_CLIENT_ID)

### Audit v2 fixes (this release)

- ReferencesPage edit flow uses updateReferenceSchema (was using create
  schema)
- Bulk task mutations now show toast on partial failure
- Migration `20260503000000_add_workspaces` made idempotent via
  `ON CONFLICT (owner_id, name) DO NOTHING`
- `/api/search` validates `workspaceId` ownership before query fan-out
- Removed dead currency utility (formatIDR/parseIDR — ArahKarya skeleton
  leftover, never used)
- Removed `server/scripts/tag-test.ts` debug script
- Cleaned 5 unused imports flagged by ESLint
- TaskDetailDialog cache invalidation centralized + `[project-tasks, projectId]`
  exact key when available

## [0.5.0] — 2026-05-04

### Reference / Bibliography

- New `Reference` entity for storing books, journal articles, conference papers,
  theses, etc. with bibliographic fields (authors, year, source, volume, issue,
  pages, DOI, ISBN, URL, abstract, notes, citation)
- 9 reference types: BOOK, JOURNAL_ARTICLE, CONFERENCE_PAPER, THESIS,
  BOOK_CHAPTER, REPORT, WEBSITE, PREPRINT, OTHER
- Workspace + project scoping like other entities; soft delete with Trash
- Tag support (entity type `REFERENCE` added to polymorphic tagging)
- ReferencesPage: search by title/authors/DOI, filter by type, tag filter
- 3 new permissions: `reference:read|write|delete`
- Integrated into `/api/search`, command palette (Cmd+K), tag detail page,
  and trash
- Sidebar: "Jurnal & Referensi" entry

## [0.4.1] — 2026-05-03

### Search & Tag — UX improvements

- **Dedicated `/search` page** dengan tab per entitas (Tasks/Projects/Links/Notes/Documents/Tags), workspace-scoped, deep-linkable via `?q=...`
- **Tag detail page `/tags/:id`** — lihat semua entitas yang punya tag tertentu, dikelompokkan per jenis
- TagsPage: nama tag + count link ke detail page
- CommandPalette (Cmd+K) sekarang workspace-scoped + tag link arahkan ke detail page
- Sidebar: tombol "Cari" baru di nav

### Polish

- `setDefault` workspace, `softDelete` workspace, dan `update` workspace yang flip `isDefault` sekarang dibungkus `prisma.$transaction` — tidak ada window race
- TagPicker: hooks tidak lagi conditional (rules-of-hooks compliant)
- ESLint + typescript-eslint terinstall + `eslint.config.js` baru; lint script semua workspace berfungsi
- NotesPage: hapus stale `eslint-disable` comment

## [0.4.0] — 2026-05-03

### Workspace Hierarchy

- New `Workspace` entity sebagai root container per perusahaan/konteks
- Hierarchy baru: **Workspace → Project → {Task, Link, Note, Document}**
- `Project.workspaceId` NOT NULL (FK RESTRICT)
- `Task/Link/Note/Document` punya `workspaceId` langsung (NOT NULL, FK RESTRICT) — orphan tanpa project tetap bisa dimiliki workspace
- Workspace switcher di sidebar (desktop + mobile) — Zustand persist
- 3 permission baru: `workspace:read|write|delete`
- Composite indexes `(owner_id, workspace_id)` + `(owner_id, project_id)` di semua entitas anak

### Security Hardening

- **XSS fix**: NotesPage markdown rendering pakai `marked` + DOMPurify (bukan regex injection)
- **SSRF guard**: link metadata fetch + health check tolak `localhost`/`127.0.0.1`/`192.168.x`/`172.16-31.x`/`169.254.x`/non-http(s); DNS-resolution check sebelum fetch
- **Auth rate limiting**: per-IP limiter strict di `/auth/login`, `/auth/google` (20/15min), `/auth/refresh` (30/min)
- **Document upload validation**: Zod schema untuk multipart fields (workspaceId required); MIME blocklist diperluas (`.html`, `.svg`, `.xml`, scripts); `X-Content-Type-Options: nosniff` di download
- **Seed admin**: `SEED_ADMIN_PASSWORD` default dihapus; jika kosong → seed di-skip; min 12 char saat di-set; tidak lagi log plaintext
- **JWT errors**: `TokenExpiredError`/`JsonWebTokenError` di-handle sebagai 401 (sebelumnya bocor 500)

### Search

- `/api/search` sekarang scoped ke workspace aktif

### Testing

- Vitest + supertest setup baru di `server/vitest.config.ts`
- Test factories di `server/src/test/factories.ts` (createTestUser + cleanup)
- 34 test untuk: workspace CRUD/scoping, auth boundaries, URL safety guard

## [0.3.0] — 2026-04-22

### Progressive Layering

- Module generator (`pnpm new:module`) sekarang support `--layered` flag
- **Simple tier** (default): routes + service (Prisma langsung) — untuk CRUD master data
- **Layered tier**: routes + service + repository + types — untuk modul dengan business rules
- `BaseRepository<T>` generic di `server/src/lib/base-repository.ts` — extend untuk custom queries
- Client page template diupgrade: pakai shadcn/ui components (Card, Table, Skeleton, EmptyState)
- Prisma model template pakai `@map("snake_case")` by default

### PWA Support

- `public/manifest.json` — app manifest (standalone, installable)
- `public/sw.js` — service worker (cache shell, network-first navigasi, skip `/api/`)
- `src/lib/register-sw.ts` — auto-register + update notification prompt
- `index.html` — ditambah `<meta name="theme-color">`, `<link rel="manifest">`, `<link rel="apple-touch-icon">`
- Placeholder icons di `public/icons/`

### Docs

- README: tambah section Design System, Cara Pakai, Progressive Layering, PWA Support
- CLAUDE.md: tambah panduan Progressive Layering + PWA

## [0.2.0] — 2026-04-16

### Design system dari HRIS

**UI/UX overhaul:**
- Port design system dari App-Human-Resources (WCAG 2.2 AA compliant)
- OKLCH color space dengan tokens: primary (steel blue), success, warning, info, destructive
- Light + dark mode via custom ThemeProvider (SPA-compatible, tidak butuh next-themes)
- Font stack: Inter Variable (sans) + Plus Jakarta Sans Variable (heading) via @fontsource
- `tw-animate-css` untuk animasi shadcn

**shadcn/ui components (17 core):**
- button, card, input, label, badge, separator, skeleton, avatar
- dropdown-menu, table, dialog, sheet, select, tabs, tooltip, scroll-area, sonner

**Layout improvement:**
- Sidebar collapsible (60px ↔ 240px) dengan smooth transition
- Mobile sidebar pakai Sheet drawer
- Header: theme toggle + notification + user menu dropdown
- Sidebar-specific color tokens (`--sidebar`, `--sidebar-primary`, etc)

**Pages refactored:**
- LoginPage — Card layout dengan logo bubble
- DashboardPage — StatCard dengan icon + semantic colors
- UsersPage — shadcn Table + Badge + Skeleton loading
- AuditLogPage — action-colored badges (CREATE=success, DELETE=destructive, etc)
- SettingsPage — Card wrapper + Table

**New deps:**
- `@base-ui/react`, `cmdk`, `react-day-picker`, `next-themes`
- `@fontsource-variable/{inter,plus-jakarta-sans}`
- Radix primitives: avatar, popover, scroll-area, select, separator, tabs, tooltip

## [0.1.0] — 2026-04-16

### Initial release

**Foundation:**
- pnpm monorepo (client + server + packages/shared)
- TypeScript + strict mode across all packages
- Prettier + EditorConfig + Husky ready

**Server:**
- Express 5 + TypeScript + Prisma (PostgreSQL 16)
- JWT access + refresh token with rotation & revocation
- RBAC: 5 default roles, 17 permission keys
- Audit log middleware (auto-capture mutations)
- Zod validation at boundary, shared schemas with client
- Pino structured logging
- Security: Helmet, CORS, rate limit, bcrypt
- BullMQ + Redis (5 queues: email, export, report, notification, cleanup)
- Bull Board admin UI at /admin/queues
- Multer file upload
- Excel export utility (ExcelJS)
- Health check endpoint

**Client:**
- Vite 6 + React 19 + Tailwind CSS 4
- TanStack Query v5 + React Hook Form + Zod
- Zustand auth store with persist
- React Router v7 with ProtectedRoute
- Login, Dashboard, Users, AuditLog, Settings pages
- Axios with refresh token interceptor
- Sonner toast notifications
- Lucide icons

**DevOps:**
- Docker Compose (4 services: postgres, redis, app, worker)
- Dockerfile.allinone for single-container production
- GitHub Actions CI (typecheck + test)
- Module generator: `pnpm new:module <name>`

**Docs:**
- README, ARCHITECTURE, GETTING-STARTED, CLAUDE.md
