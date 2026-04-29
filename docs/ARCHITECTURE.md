# ArahKarya — Architecture

## High-Level

```
┌────────────┐         ┌─────────────┐         ┌────────────┐
│  Browser   │────────▶│  Express    │────────▶│ PostgreSQL │
│ React SPA  │   HTTP  │  API        │  Prisma │   (main)   │
└────────────┘         │  Port 3001  │         └────────────┘
                       │             │
                       │             │         ┌────────────┐
                       │             │────────▶│   Redis    │
                       └─────────────┘ BullMQ  │ (queue)    │
                              │                └─────┬──────┘
                              │ enqueue              │
                              ▼                      │
                       ┌─────────────┐               │
                       │  Worker     │◀──────────────┘
                       │  process    │
                       └─────────────┘
```

## Request Flow

1. Client → `POST /api/auth/login` dengan email+password
2. Express middleware: helmet → cors → compression → pinoHttp → rate-limit
3. Route `auth/login`: validate (Zod) → service (bcrypt compare) → issue JWT + refresh
4. Audit middleware capture response → async write ke `audit_logs`
5. Client simpan token di Zustand + localStorage
6. Subsequent requests: Axios interceptor inject `Authorization: Bearer ...`
7. Protected routes: `authenticate` middleware verify JWT → load user roles/permissions
8. RBAC: `requirePermissions(...)` check → 403 if no access

## Token Strategy

- **Access token** — short-lived (15m default), dipakai di setiap request
- **Refresh token** — long-lived (7d default), SHA-256 hash stored di DB
- **Rotation** — setiap refresh issue pair baru, revoke old
- **Logout** — mark refresh token `revokedAt`
- **Change password** — revoke ALL refresh tokens user tersebut

## RBAC Model

```
User ─┬─> UserRole ─> Role ─┬─> RolePermission ─> Permission
      │                     │
      └─ many-to-many ──────┘
```

- `SUPER_ADMIN` role bypass semua permission check (hardcoded di middleware)
- Permission granular via key string (`user:read`, `audit:read`, dll)
- Roles system-defined (can't delete) vs custom

## Audit Log Strategy

Middleware wrapping `res.json` — capture on success (2xx):
- `action`: CREATE / UPDATE / DELETE / LOGIN / LOGIN_FAILED / EXPORT / dll
- `entity`: nama entity ("user", "invoice", ...)
- `entityId`: ID diambil dari `body.data.id` atau `req.params.id`
- `diff`: request body (kecuali GET)
- `ip`, `userAgent`: dari request

Indexed: `userId`, `(entity, entityId)`, `createdAt`.

## BullMQ Queues

5 queue default di `@arahkarya/shared` constants:

| Queue | Use Case |
|---|---|
| `email` | Kirim email (SMTP/SES) |
| `export` | Generate Excel/PDF besar async |
| `report` | Scheduled report generation |
| `notification` | Create in-app notification |
| `cleanup` | Audit log purge, expired token cleanup |

Worker jalan di proses terpisah → horizontal scale independen dari HTTP server.

**Enqueue pattern**:
```ts
await enqueue('email', 'invoice-overdue', { to, subject, html });
```

**Graceful degradation**: jika Redis down, `enqueue()` return `null` dan log error (tidak throw).

## Error Handling

Standard error constructors di `server/src/lib/errors.ts`:
- `NotFoundError(entity, id?)` → 404
- `UnauthorizedError(message?)` → 401
- `ForbiddenError(message?)` → 403
- `ConflictError(message)` → 409
- `ValidationError(message, details?)` → 422

Global `errorHandler`:
- `ZodError` → 422 dengan `flatten()` details
- `AppError` → statusCode + code + message
- Unknown → 500 (di production hide stack trace)

## Deployment Modes

### Mode 1: Docker Compose (dev-prod)

4 services: `postgres`, `redis`, `app`, `worker`. App + worker pakai image yang sama, beda `CMD`.

### Mode 2: Dockerfile.allinone (single container)

Untuk deploy ringan (1 VM, Railway, Fly.io). Client dibuild ke static → Express serve sebagai SPA. Worker tetap harus process terpisah (pakai PM2 atau container kedua).

### Mode 3: Manual

- Build: `pnpm build`
- Run: `pnpm start` + `pnpm start:worker` (dua process)
- Serve static `client/dist` via nginx/caddy di depan Express

## Scaling Strategies

- **Horizontal scale HTTP**: app stateless, bisa N instance di belakang load balancer
- **Horizontal scale worker**: worker concurrency 5 per process, scale out dengan lebih banyak container
- **DB**: PostgreSQL cukup sampai 10M+ rows; tambah read replica kalau butuh
- **Redis**: cluster/sentinel kalau queue throughput tinggi

## Security Baseline

- ✅ Helmet (CSP, HSTS, dll)
- ✅ CORS whitelist
- ✅ Rate limit 300 req/min per IP
- ✅ JWT rotation + revocation
- ✅ bcrypt cost 10
- ✅ SQL injection: Prisma parameterized
- ✅ XSS: React auto-escape + Helmet CSP
- ✅ Input validation: Zod di semua boundary
- ✅ Audit log untuk forensic
- ✅ Secrets via env, Zod validated at startup
- ⚠️ TODO: CSRF (pakai JWT bearer, bukan cookie — lower risk, tapi tambah kalau pakai cookie auth)
- ⚠️ TODO: 2FA / MFA (optional future)
