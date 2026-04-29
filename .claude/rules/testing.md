# Testing Rules

## Framework

- Server: **Vitest** + **supertest** untuk integration tests
- Client: **Vitest** + **@testing-library/react**
- Shared: `tsc --noEmit` (type checking)
- E2E: **Playwright** untuk critical user flows

## Coverage Target

- 80%+ untuk business logic modules
- Boilerplate CRUD boleh lebih rendah
- Selalu test: validasi, error handling, edge cases

## Test-Driven Development

Untuk fitur baru dan bug fix:
1. Write test first (RED) — test harus FAIL
2. Implement minimal code (GREEN) — test harus PASS
3. Refactor (IMPROVE) — test tetap PASS

## Integration Tests

- JANGAN mock database — pakai PostgreSQL container
- Test full request/response cycle via supertest
- Test RBAC: pastikan unauthorized user ditolak
- Test validation: pastikan invalid input ditolak

```ts
describe('POST /api/entity', () => {
  it('should reject without auth', async () => {
    const res = await request(app).post('/api/entity').send(data);
    expect(res.status).toBe(401);
  });

  it('should reject without permission', async () => {
    const res = await request(app)
      .post('/api/entity')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send(data);
    expect(res.status).toBe(403);
  });
});
```

## What to Test

- Validation schemas (valid + invalid inputs)
- Service functions (business logic, edge cases)
- API endpoints (auth, rbac, happy path, error path)
- Client: critical user flows (login, CRUD operations)
