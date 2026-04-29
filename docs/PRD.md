# PRD — Panggon Mikir v1.0

**Pemilik**: Yayang Setya Nugroho
**Tanggal**: 2026-04-28
**Status**: Phase 1 — In progress

## 1. Visi

Aplikasi *second brain* personal yang menyatukan **task, project, link,
dokumen, dan note** Yayang dalam satu tempat. Akses via web (RPi5 + domain
`panggonmikir.arahkarya.com`), login Google.

## 2. Why

Yayang punya banyak channel tempat informasi tersebar:
- Task tercatat di banyak app (Keuangan PMD, HR, GA Monitor, DPA ERP, MES)
- File penting tersimpan di Google Drive, GitHub, Notion, Figma
- Note ad-hoc bertebaran di mana-mana

Panggon Mikir = pusat **manajemen pekerjaan personal** — bukan untuk
menggantikan app-app produksi tersebut, tapi sebagai *index* dan *workspace*
yang merangkum semuanya.

## 3. User & Constraints

| Constraint | Nilai |
|---|---|
| Pengguna | 1 (solo: Yayang) |
| Mode | Standalone (tidak terhubung ke app lain) |
| Auth | Google OAuth + email allowlist |
| Deploy | RPi5 (sudah host Keuangan PMD, DPA ERP, Simple ERP, MES) |
| Domain | `panggonmikir.arahkarya.com` |

## 4. Scope per Phase

### Phase 1 — MVP (saat ini)

**Goal**: bisa simpan task, kelompokkan ke project, simpan link multi-platform,
pakai tag, search semua dari satu kotak.

| Fitur | Detail |
|---|---|
| Task | CRUD, status (TODO/IN_PROGRESS/BLOCKED/DONE/CANCELLED), prioritas (LOW/MEDIUM/HIGH/URGENT), due date, sub-task, recurrence (RRULE-lite) |
| Project | CRUD, status (ACTIVE/ON_HOLD/COMPLETED/ARCHIVED), color chip, start/due date, milestone |
| Link | Paste URL → auto-fetch og-tags (title, description, favicon, thumbnail), platform auto-detect (GDrive/GitHub/Figma/Notion/YouTube/Generic), notes pribadi, access tracking |
| Tag | Universal — polymorphic via `EntityTag` (TASK/PROJECT/LINK/NOTE/DOCUMENT) |
| Search | Global (Postgres full-text — tsvector + GIN index), filter per entity |
| Dashboard | Today's task, upcoming, overdue, recent links, recent activity |
| Trash | Soft delete via `deletedAt`, halaman Trash untuk restore/purge |

**Tech**: TanStack Query + RHF + Zod + shadcn/ui table & forms.

### Phase 2 — Knowledge Layer

| Fitur | Detail |
|---|---|
| Note | Markdown editor, pinned notes, backlink antar entitas via `[[entity-id]]` syntax |
| Document | Upload file ke disk RPi5 (max 50MB/file, total quota 5GB), atau pointer ke `externalUrl` (e.g., GDrive). PDF/image preview. |
| Cross-link | Task/Note bisa reference Project/Document/Link/Note lain |

### Phase 3 — Productivity Boost

| Fitur | Detail |
|---|---|
| Calendar | Bulan/minggu view, gabungan task due date + project milestone |
| Quick Capture | PWA share target → simpan link/note dari mobile |
| Reminder | BullMQ scheduled job: due-date task → in-app + email |
| Weekly Review | Template note auto-generated tiap Senin |
| Link Health Check | Scheduled sweep mingguan (cek 404 / private) |
| Export | Backup semua data ke JSON / markdown |

## 5. Data Model (Phase 1)

Lihat `server/prisma/schema.prisma`. Highlights:

- Semua domain entity punya `ownerId`, `createdAt`, `updatedAt`, `deletedAt`
- `Task` — sub-task via self-reference (`parentId`)
- `Link` — `LinkPlatform` enum, metadata fields (faviconUrl, thumbnailUrl), `accessCount`
- `Tag` + `EntityTag` (polymorphic, `(tagId, entityType, entityId)` PK)
- Indexes pada `(ownerId)`, `(projectId)`, `(status)`, `(dueDate)`, `(deletedAt)`

## 6. API Surface (Phase 1)

Standard CRUD per resource (semua butuh auth + permission):

```
GET    /api/tasks                ?projectId=&status=&priority=&dueBefore=&tag=&q=&page=&limit=
POST   /api/tasks
GET    /api/tasks/:id
PATCH  /api/tasks/:id
DELETE /api/tasks/:id            (soft delete)
POST   /api/tasks/:id/restore    (undelete)
POST   /api/tasks/:id/complete   (toggle done + completedAt)

GET    /api/projects             ?status=&q=
POST   /api/projects
GET    /api/projects/:id
PATCH  /api/projects/:id
DELETE /api/projects/:id

GET    /api/links                ?platform=&projectId=&q=
POST   /api/links                (auto-enqueue link-metadata job)
GET    /api/links/:id
PATCH  /api/links/:id
DELETE /api/links/:id
POST   /api/links/:id/visit      (increment accessCount + lastAccessedAt)

GET    /api/tags
POST   /api/tags
PATCH  /api/tags/:id
DELETE /api/tags/:id
POST   /api/tags/attach          { tagId, entityType, entityId }
POST   /api/tags/detach          { tagId, entityType, entityId }

GET    /api/search               ?q=                  (federated across tasks/projects/links/tags)

GET    /api/dashboard/summary    (today/upcoming/overdue/recent counts)
```

## 7. UX & Navigation

Sidebar (mengikuti pola HRIS/skeleton):
- 🏠 Dashboard
- ✅ Tasks (List + Kanban view)
- 📁 Projects
- 🔗 Links
- 🏷️ Tags
- 🔍 Search (Cmd+K command palette juga)
- 🗑️ Trash
- ⚙️ Settings (theme, profile, owner)

## 8. Non-functional

- **Auth**: Google OAuth saja (allowlist), email/password lokal sebagai fallback dev
- **Performance**: <200ms p95 untuk endpoint list (pagination wajib)
- **Storage**: max 5GB total upload (Phase 2), enforced di service layer
- **Backup**: Postgres dump harian via cron (script di `scripts/`)
- **PWA**: installable di tablet/HP, offline shell cache (read-only)
- **Audit**: semua mutasi tercatat di `audit_logs`

## 9. Permissions (RBAC)

Solo-user → user pertama dapat `SUPER_ADMIN` otomatis (bypass semua check).
Permission keys disiapkan untuk masa depan:

```
task:read|write|delete
project:read|write|delete
link:read|write|delete
tag:read|write
note:read|write|delete
document:read|write|delete
```

## 10. Out of Scope

- Multi-user / team sharing — solo app
- Mobile native app — PWA cukup
- Two-way sync ke GDrive / GitHub — link aggregator only
- AI / LLM features — Phase 4 mungkin
- Multi-language — UI Indonesian only

## 11. Success Criteria (Phase 1 ship)

- [ ] Login Google berhasil, hanya email allowlist yang lolos
- [ ] Bisa CRUD task, project, link, tag dari UI
- [ ] Paste URL → metadata terisi otomatis (judul, favicon, platform)
- [ ] Search global menemukan entity dari satu kotak
- [ ] Dashboard menampilkan today/upcoming/overdue
- [ ] Trash bisa restore + purge
- [x] Deploy di RPi5, public via Cloudflare Tunnel `panggonmikir.arahkarya.com`
- [ ] Coverage test backend ≥80% untuk service layer
