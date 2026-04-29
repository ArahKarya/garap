# Architecture Rules

## Monorepo Structure

Tiga workspace — JANGAN tambah workspace baru tanpa alasan kuat:
- `client/` — React SPA (Vite + Tailwind + shadcn/ui)
- `server/` — Express API (Prisma + PostgreSQL + BullMQ)
- `packages/shared/` — Zod schemas, types, utils, constants

## Shared Schema (WAJIB)

Zod schema SELALU di `packages/shared/src/schemas/` — dipakai server DAN client.
JANGAN duplikat schema antara FE dan BE.

```ts
// BENAR: import dari shared
import { createUserSchema } from '@arahkarya/shared';

// SALAH: bikin schema sendiri di client atau server
const schema = z.object({ ... });
```

## API Response Envelope

Semua response via `ok()` / `fail()` dari `@arahkarya/shared`:
```ts
res.json(ok(data));           // { success: true, data }
res.json(ok(items, meta));    // { success: true, data, meta }
res.json(fail('message'));    // { success: false, error: { message } }
```

JANGAN return response tanpa envelope.

## Progressive Layering

Pilih tier per modul, JANGAN campur dalam satu modul:

### Simple (default)
- `routes.ts` + `service.ts`
- Service langsung akses Prisma
- Untuk: CRUD master data, settings, lookup

### Layered
- `routes.ts` + `service.ts` + `repository.ts` + `types.ts`
- Service HANYA panggil repository, TIDAK import Prisma
- Untuk: business rules berat, kalkulasi, state machine

### Kapan upgrade?
- Mulai Simple, upgrade ke Layered saat business logic muncul
- JANGAN mulai Layered untuk CRUD sederhana

## File Size

Target <400 LOC per file, maksimum 800 LOC.
Split by feature: service, routes, repository, types terpisah.
