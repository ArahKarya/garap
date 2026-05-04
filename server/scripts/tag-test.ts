import { prisma } from '../src/lib/prisma.js';
import { signAccessToken } from '../src/lib/jwt.js';

async function main(): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { isActive: true },
    include: { roles: { include: { role: true } } },
  });
  if (!user) {
    console.error('no user');
    process.exit(1);
  }
  const roles = user.roles.map((r) => r.role.name);
  const token = signAccessToken({ sub: user.id, email: user.email, roles });
  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const ws = await prisma.workspace.findFirst({
    where: { ownerId: user.id, deletedAt: null },
  });
  if (!ws) {
    console.error('no ws');
    process.exit(1);
  }

  const t = await fetch('http://localhost:3007/api/tasks', {
    method: 'POST',
    headers: h,
    body: JSON.stringify({ workspaceId: ws.id, title: 'tag-test' }),
  });
  const taskJ = (await t.json()) as { data: { id: string } };
  const taskId = taskJ.data.id;
  console.log('task id:', taskId);

  const tg = await fetch('http://localhost:3007/api/tags', {
    method: 'POST',
    headers: h,
    body: JSON.stringify({ name: `tag-test-${Date.now()}` }),
  });
  const tagJ = (await tg.json()) as { data: { id: string } };
  const tagId = tagJ.data.id;
  console.log('tag id:', tagId);

  const at = await fetch('http://localhost:3007/api/tags/attach', {
    method: 'POST',
    headers: h,
    body: JSON.stringify({ tagId, entityType: 'TASK', entityId: taskId }),
  });
  console.log('attach status:', at.status);
  console.log('attach body:', await at.text());

  // Verify list
  const ls = await fetch(
    `http://localhost:3007/api/tags/by-entity?entityType=TASK&entityId=${taskId}`,
    { headers: h },
  );
  console.log('by-entity status:', ls.status);
  console.log('by-entity body:', await ls.text());

  await fetch(`http://localhost:3007/api/tasks/${taskId}`, { method: 'DELETE', headers: h });
  await fetch(`http://localhost:3007/api/tasks/${taskId}/purge`, { method: 'DELETE', headers: h });
  await fetch(`http://localhost:3007/api/tags/${tagId}`, { method: 'DELETE', headers: h });
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
