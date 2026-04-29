# Security Rules

## RBAC (WAJIB)

Setiap endpoint protected WAJIB pakai middleware:
```ts
router.get('/', authenticate, requirePermissions('entity:read'), handler);
router.post('/', authenticate, requirePermissions('entity:write'), handler);
```

`SUPER_ADMIN` bypass semua permission check secara otomatis.
JANGAN skip RBAC dengan alasan "cuma admin yang akses".

## Audit Log (WAJIB)

Setiap mutation endpoint (POST/PATCH/DELETE) WAJIB pakai audit middleware:
```ts
router.post('/', validate(schema), audit('CREATE', 'entity'), handler);
router.patch('/:id', validate(schema), audit('UPDATE', 'entity'), handler);
router.delete('/:id', audit('DELETE', 'entity'), handler);
```

JANGAN skip audit log di endpoint mutasi.

## JWT & Auth

- Refresh token di-hash SHA-256 sebelum disimpan
- Revoke token lama saat rotate
- Access token: short-lived (15m default)
- Refresh token: longer-lived (7d default)

## Secrets

- JANGAN hard-code secrets, API keys, passwords di source code
- Selalu pakai environment variables via `server/src/config/`
- Validasi env vars saat startup (Zod schema)
- File `.env` TIDAK boleh masuk git (sudah di `.gitignore`)

## Input Validation

- Validasi di boundary: semua request body via `validate()` middleware + Zod schema
- JANGAN trust data dari client tanpa validasi
- Prisma parameterized queries — SQL injection safe by default

## Rate Limiting

Rate limit sudah aktif global via middleware.
Endpoint sensitif (login, password reset) bisa ditambah rate limit lebih ketat.
