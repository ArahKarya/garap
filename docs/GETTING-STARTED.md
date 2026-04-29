# Getting Started — ArahKarya

## Prasyarat

- Node.js 20+
- pnpm 10+
- PostgreSQL 16 (atau pakai Docker)
- Redis 7 (atau pakai Docker)

## Setup Lokal (tanpa Docker)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Setup PostgreSQL & Redis

Kalau belum ada service lokal, jalankan via Docker:

```bash
docker run -d --name arahkarya-pg \
  -e POSTGRES_USER=arahkarya -e POSTGRES_PASSWORD=arahkarya \
  -e POSTGRES_DB=arahkarya -p 5432:5432 postgres:16-alpine

docker run -d --name arahkarya-redis -p 6379:6379 redis:7-alpine
```

### 3. Env files

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Edit `server/.env`:
- `JWT_ACCESS_SECRET` dan `JWT_REFRESH_SECRET` → generate: `openssl rand -base64 48`

### 4. Database

```bash
pnpm --filter @arahkarya/server prisma:generate
pnpm --filter @arahkarya/server db:migrate:dev
pnpm --filter @arahkarya/server db:seed
```

Output akhir: `[seed] admin user ready: admin@arahkarya.local / admin123`

### 5. Run

```bash
pnpm dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3001/api
- Bull Board: http://localhost:3001/admin/queues

Worker (di terminal terpisah):
```bash
pnpm dev:worker
```

## Setup dengan Docker

```bash
cp .env.docker.example .env
# edit .env → ganti JWT_ACCESS_SECRET dan JWT_REFRESH_SECRET
docker compose up -d --build
```

Akses: http://localhost:3001

## Membuat Modul Pertama

Misal mau bikin modul `customer`:

```bash
pnpm new:module customer
```

Lalu:

1. Edit `server/prisma/schema.prisma` — tambah model:
   ```prisma
   model Customer {
     id        String   @id @default(cuid())
     name      String
     email     String?
     phone     String?
     createdAt DateTime @default(now())
     updatedAt DateTime @updatedAt
     @@map("customers")
   }
   ```

2. Migrate:
   ```bash
   pnpm --filter @arahkarya/server db:migrate:dev --name add-customer
   ```

3. Register router di `server/src/routes/index.ts`:
   ```ts
   import { customerRouter } from '../modules/customer/customer.routes.js';
   apiRouter.use('/customer', customerRouter);
   ```

4. Add route di `client/src/App.tsx`:
   ```tsx
   import { CustomerPage } from './pages/CustomerPage';
   <Route path="customer" element={<CustomerPage />} />
   ```

5. Add nav item di `client/src/layouts/AppLayout.tsx`:
   ```ts
   { to: '/customer', label: 'Customer', icon: Users, permission: null },
   ```

Done — CRUD customer siap pakai.

## Troubleshooting

**Prisma generate gagal**: pastikan `DATABASE_URL` valid di `server/.env`.

**JWT error "secret must be at least 32 chars"**: generate ulang secret.

**CORS error**: cek `CORS_ORIGIN` di `server/.env` match dengan client URL.

**Bull Board 404**: pastikan login dulu, dan user punya role `SUPER_ADMIN` atau `ADMIN`.

**Redis connection refused**: pastikan Redis jalan di `REDIS_HOST:REDIS_PORT`.
