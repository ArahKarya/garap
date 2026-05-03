import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { prisma } from '../../lib/prisma.js';
import { createTestUser, cleanupUser, type TestUser } from '../../test/factories.js';

const app = createApp();

describe('POST /api/workspaces', () => {
  let user: TestUser;
  beforeAll(async () => {
    user = await createTestUser();
  });
  afterAll(async () => {
    await cleanupUser(user.id);
    await prisma.$disconnect();
  });

  it('reject without auth', async () => {
    const res = await request(app)
      .post('/api/workspaces')
      .send({ name: 'X' });
    expect(res.status).toBe(401);
  });

  it('create workspace', async () => {
    const res = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ name: 'Acme Corp', color: '#ff0000' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Acme Corp');
    expect(res.body.data.ownerId).toBe(user.id);
  });

  it('reject duplicate name per owner', async () => {
    await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ name: 'Dup Test' })
      .expect(201);

    const res = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ name: 'Dup Test' });
    expect(res.status).toBe(409);
  });

  it('reject invalid color', async () => {
    const res = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ name: 'Bad Color', color: 'red' });
    expect(res.status).toBe(422);
  });

  it('reject empty name', async () => {
    const res = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ name: '' });
    expect(res.status).toBe(422);
  });
});

describe('GET /api/workspaces', () => {
  let user: TestUser;
  let other: TestUser;
  beforeAll(async () => {
    user = await createTestUser();
    other = await createTestUser();
    await prisma.workspace.create({
      data: { ownerId: user.id, name: 'Mine A' },
    });
    await prisma.workspace.create({
      data: { ownerId: other.id, name: 'Other A' },
    });
  });
  afterAll(async () => {
    await cleanupUser(user.id);
    await cleanupUser(other.id);
  });

  it('only returns own workspaces (no cross-user leak)', async () => {
    const res = await request(app)
      .get('/api/workspaces')
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    const names = res.body.data.map((w: { name: string }) => w.name);
    expect(names).toContain('Mine A');
    expect(names).not.toContain('Other A');
  });
});

describe('DELETE /api/workspaces/:id', () => {
  let user: TestUser;
  beforeAll(async () => {
    user = await createTestUser();
  });
  afterAll(async () => cleanupUser(user.id));

  it('cannot delete default workspace', async () => {
    const res = await request(app)
      .delete(`/api/workspaces/${user.workspaceId}`)
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(422);
  });

  it('cannot delete workspace with active projects', async () => {
    const ws = await prisma.workspace.create({
      data: { ownerId: user.id, name: `WithProj-${Date.now()}` },
    });
    await prisma.project.create({
      data: { ownerId: user.id, workspaceId: ws.id, name: 'p' },
    });
    const res = await request(app)
      .delete(`/api/workspaces/${ws.id}`)
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(422);
  });

  it('soft-delete workspace ok when empty', async () => {
    const ws = await prisma.workspace.create({
      data: { ownerId: user.id, name: `Empty-${Date.now()}` },
    });
    const res = await request(app)
      .delete(`/api/workspaces/${ws.id}`)
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    const after = await prisma.workspace.findUnique({ where: { id: ws.id } });
    expect(after?.deletedAt).not.toBeNull();
  });
});

describe('Workspace ownership scoping on Tasks/Links/Notes', () => {
  let user: TestUser;
  let other: TestUser;
  beforeAll(async () => {
    user = await createTestUser();
    other = await createTestUser();
    await prisma.task.create({
      data: { ownerId: other.id, workspaceId: other.workspaceId, title: 'OTHER TASK' },
    });
  });
  afterAll(async () => {
    await cleanupUser(user.id);
    await cleanupUser(other.id);
  });

  it('cannot reference another user\'s workspace on task create', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ title: 'Sneaky', workspaceId: other.workspaceId });
    expect(res.status).toBe(404);
  });

  it('task list does not leak across users', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    const titles = res.body.data.map((t: { title: string }) => t.title);
    expect(titles).not.toContain('OTHER TASK');
  });
});
