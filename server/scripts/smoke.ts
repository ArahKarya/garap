import { prisma } from '../src/lib/prisma.js';
import { signAccessToken } from '../src/lib/jwt.js';

const BASE = 'http://localhost:3007/api';

interface ProbeResult {
  ok: boolean;
  status: number;
  body: unknown;
}

async function main(): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { isActive: true },
    include: { roles: { include: { role: true } } },
  });
  if (!user) {
    console.error('No active user');
    process.exit(1);
  }
  const roles = user.roles.map((r) => r.role.name);
  const token = signAccessToken({ sub: user.id, email: user.email, roles });
  console.log(`[smoke] user=${user.email} roles=${roles.join(',')}`);

  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  let pass = 0;
  let fail = 0;
  const probe = async (
    label: string,
    url: string,
    init?: RequestInit,
    expectStatus = 200,
  ): Promise<ProbeResult> => {
    try {
      const res = await fetch(url, { ...init, headers: { ...h, ...(init?.headers ?? {}) } });
      const body = await res.text();
      let j: unknown = {};
      try {
        j = body ? JSON.parse(body) : {};
      } catch {
        // ignore
      }
      const ok = res.status === expectStatus;
      if (ok) {
        console.log(`✓ ${label} ${res.status}`);
        pass += 1;
      } else {
        console.log(
          `✗ ${label} expected=${expectStatus} got=${res.status} body=${body.slice(0, 250)}`,
        );
        fail += 1;
      }
      return { ok, status: res.status, body: j };
    } catch (e) {
      console.log(`✗ ${label} EXCEPTION ${(e as Error).message}`);
      fail += 1;
      return { ok: false, status: 0, body: null };
    }
  };

  await probe('GET /health', `${BASE}/health`);
  await probe('GET /auth/me', `${BASE}/auth/me`);
  const ws = await probe('GET /workspaces', `${BASE}/workspaces`);
  await probe('GET /projects', `${BASE}/projects`);
  await probe('GET /tasks', `${BASE}/tasks`);
  await probe('GET /links', `${BASE}/links`);
  await probe('GET /notes', `${BASE}/notes`);
  await probe('GET /documents', `${BASE}/documents`);
  await probe('GET /tags', `${BASE}/tags`);
  await probe('GET /dashboard/summary', `${BASE}/dashboard/summary`);
  await probe('GET /search', `${BASE}/search?q=test`);
  await probe('GET /notifications', `${BASE}/notifications`);
  await probe('GET /audit-logs', `${BASE}/audit-logs`);

  type WsResp = { data?: Array<{ id: string }> };
  const wsId = (ws.body as WsResp)?.data?.[0]?.id;
  if (!wsId) {
    console.error('No workspace');
    process.exit(1);
  }

  await probe('GET workspace-scoped tasks', `${BASE}/tasks?workspaceId=${wsId}`);
  await probe('GET workspace-scoped projects', `${BASE}/projects?workspaceId=${wsId}`);
  await probe('GET workspace-scoped search', `${BASE}/search?q=test&workspaceId=${wsId}`);

  await probe(
    'POST /tasks no ws (expect 422)',
    `${BASE}/tasks`,
    { method: 'POST', body: JSON.stringify({ title: 'no-ws' }) },
    422,
  );

  type CreatedItem = { data?: { id: string } };

  const taskRes = await probe(
    'POST /tasks valid',
    `${BASE}/tasks`,
    {
      method: 'POST',
      body: JSON.stringify({ workspaceId: wsId, title: '[smoke] Task A', priority: 'MEDIUM' }),
    },
    201,
  );
  const taskId = (taskRes.body as CreatedItem)?.data?.id;
  if (taskId) {
    await probe('GET task by id', `${BASE}/tasks/${taskId}`);
    await probe('PATCH task title', `${BASE}/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title: '[smoke] Task A updated' }),
    });
    const listRes = await fetch(`${BASE}/tasks?workspaceId=${wsId}&limit=200`, { headers: h });
    const list = (await listRes.json()) as { data?: Array<{ id: string }> };
    const found = list.data?.some((t) => t.id === taskId);
    if (found) {
      console.log('  ✓ created task appears in workspace-scoped list');
      pass += 1;
    } else {
      console.log('  ✗ created task NOT in workspace-scoped list');
      fail += 1;
    }
    await probe('DELETE task (soft)', `${BASE}/tasks/${taskId}`, { method: 'DELETE' });
    await probe('POST task restore', `${BASE}/tasks/${taskId}/restore`, { method: 'POST' });
    await probe('DELETE task (soft again)', `${BASE}/tasks/${taskId}`, { method: 'DELETE' });
    await probe('DELETE task purge', `${BASE}/tasks/${taskId}/purge`, { method: 'DELETE' });
  }

  await probe(
    'POST /links localhost (SSRF)',
    `${BASE}/links`,
    { method: 'POST', body: JSON.stringify({ workspaceId: wsId, url: 'http://localhost:8080' }) },
    422,
  );
  await probe(
    'POST /links 127.0.0.1 (SSRF)',
    `${BASE}/links`,
    { method: 'POST', body: JSON.stringify({ workspaceId: wsId, url: 'http://127.0.0.1' }) },
    422,
  );
  await probe(
    'POST /links 192.168 (SSRF)',
    `${BASE}/links`,
    { method: 'POST', body: JSON.stringify({ workspaceId: wsId, url: 'http://192.168.1.1' }) },
    422,
  );

  const noteRes = await probe(
    'POST /notes valid',
    `${BASE}/notes`,
    {
      method: 'POST',
      body: JSON.stringify({ workspaceId: wsId, title: '[smoke] Note A', content: 'hi' }),
    },
    201,
  );
  const noteId = (noteRes.body as CreatedItem)?.data?.id;
  if (noteId) {
    await probe('PATCH note', `${BASE}/notes/${noteId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title: '[smoke] Note B' }),
    });
    await probe('DELETE note', `${BASE}/notes/${noteId}`, { method: 'DELETE' });
    await probe('DELETE note purge', `${BASE}/notes/${noteId}/purge`, { method: 'DELETE' });
  }

  const docRes = await probe(
    'POST /documents/external',
    `${BASE}/documents/external`,
    {
      method: 'POST',
      body: JSON.stringify({
        workspaceId: wsId,
        title: '[smoke] Doc',
        externalUrl: 'https://example.com',
      }),
    },
    201,
  );
  const docId = (docRes.body as CreatedItem)?.data?.id;
  if (docId) {
    await probe('DELETE doc', `${BASE}/documents/${docId}`, { method: 'DELETE' });
    await probe('DELETE doc purge', `${BASE}/documents/${docId}/purge`, { method: 'DELETE' });
  }

  const refRes = await probe(
    'POST /references valid',
    `${BASE}/references`,
    {
      method: 'POST',
      body: JSON.stringify({
        workspaceId: wsId,
        type: 'JOURNAL_ARTICLE',
        title: '[smoke] Reference A',
        authors: 'Smith, J.',
        year: 2024,
        source: 'Test Journal',
      }),
    },
    201,
  );
  const refId = (refRes.body as CreatedItem)?.data?.id;
  if (refId) {
    await probe('GET /references list', `${BASE}/references?workspaceId=${wsId}`);
    await probe('PATCH /references/:id', `${BASE}/references/${refId}`, {
      method: 'PATCH',
      body: JSON.stringify({ year: 2025 }),
    });
    await probe('DELETE /references/:id', `${BASE}/references/${refId}`, { method: 'DELETE' });
    await probe('DELETE /references/:id/purge', `${BASE}/references/${refId}/purge`, {
      method: 'DELETE',
    });
  }

  const newWs = await probe(
    'POST /workspaces',
    `${BASE}/workspaces`,
    { method: 'POST', body: JSON.stringify({ name: `[smoke]-${Date.now()}` }) },
    201,
  );
  const newWsId = (newWs.body as CreatedItem)?.data?.id;
  if (newWsId) {
    await probe('PATCH ws', `${BASE}/workspaces/${newWsId}`, {
      method: 'PATCH',
      body: JSON.stringify({ description: 'updated' }),
    });
    await probe('POST archive ws', `${BASE}/workspaces/${newWsId}/archive`, { method: 'POST' });
    await probe('POST unarchive ws', `${BASE}/workspaces/${newWsId}/unarchive`, { method: 'POST' });
    await probe('DELETE ws (soft)', `${BASE}/workspaces/${newWsId}`, { method: 'DELETE' });
    await probe('DELETE ws purge', `${BASE}/workspaces/${newWsId}/purge`, { method: 'DELETE' });
  }

  const tagsRes = await fetch(`${BASE}/tags`, { headers: h });
  const tagsList = ((await tagsRes.json()) as { data?: Array<{ id: string }> }).data ?? [];
  if (tagsList[0]) {
    await probe('GET /tags/:id/entities', `${BASE}/tags/${tagsList[0].id}/entities`);
  } else {
    console.log('[smoke] (no tags exist; skipping /tags/:id/entities probe)');
  }

  console.log(`\n[smoke] PASS=${pass} FAIL=${fail}`);
  await prisma.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
