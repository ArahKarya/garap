import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { prisma } from '../../lib/prisma.js';
import { createTestUser, cleanupUser, type TestUser } from '../../test/factories.js';

const app = createApp();

describe('Reference module', () => {
  let user: TestUser;
  beforeAll(async () => {
    user = await createTestUser();
  });
  afterAll(async () => {
    await cleanupUser(user.id);
    await prisma.$disconnect();
  });

  it('rejects without auth', async () => {
    const res = await request(app).post('/api/references').send({});
    expect(res.status).toBe(401);
  });

  it('creates a reference (journal article)', async () => {
    const res = await request(app)
      .post('/api/references')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        workspaceId: user.workspaceId,
        type: 'JOURNAL_ARTICLE',
        title: 'Attention is all you need',
        authors: 'Vaswani, A.; Shazeer, N.',
        year: 2017,
        source: 'NeurIPS',
        doi: '10.48550/arXiv.1706.03762',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Attention is all you need');
  });

  it('rejects without workspaceId', async () => {
    const res = await request(app)
      .post('/api/references')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ type: 'BOOK', title: 'no-ws' });
    expect(res.status).toBe(422);
  });

  it('rejects invalid year (>9999)', async () => {
    const res = await request(app)
      .post('/api/references')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        workspaceId: user.workspaceId,
        type: 'BOOK',
        title: 'bad year',
        year: 99999,
      });
    expect(res.status).toBe(422);
  });

  it('rejects URL with private hostname (SSRF Zod guard)', async () => {
    const res = await request(app)
      .post('/api/references')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        workspaceId: user.workspaceId,
        type: 'WEBSITE',
        title: 'localhost',
        url: 'http://localhost:8080',
      });
    expect(res.status).toBe(422);
  });

  it('lists references (workspace-scoped)', async () => {
    const res = await request(app)
      .get(`/api/references?workspaceId=${user.workspaceId}`)
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('searches by title fragment', async () => {
    const res = await request(app)
      .get(`/api/references?workspaceId=${user.workspaceId}&search=attention`)
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    const titles = res.body.data.map((r: { title: string }) => r.title);
    expect(titles.some((t: string) => /Attention/i.test(t))).toBe(true);
  });

  it('does not leak references from other users', async () => {
    const other = await createTestUser();
    await prisma.reference.create({
      data: {
        ownerId: other.id,
        workspaceId: other.workspaceId,
        type: 'BOOK',
        title: 'OTHER USER REF',
      },
    });

    const res = await request(app)
      .get('/api/references')
      .set('Authorization', `Bearer ${user.token}`);
    const titles = res.body.data.map((r: { title: string }) => r.title);
    expect(titles).not.toContain('OTHER USER REF');

    await cleanupUser(other.id);
  });
});
