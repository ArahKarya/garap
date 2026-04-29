# Changelog

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
