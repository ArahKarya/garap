import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { signAccessToken } from '../lib/jwt.js';
import { ROLES } from '@panggonmikir/shared';

let testCounter = 0;

export interface TestUser {
  id: string;
  email: string;
  name: string;
  token: string;
  workspaceId: string;
}

/**
 * Creates an isolated test user with the SUPER_ADMIN role and a default
 * workspace. Each call returns a fresh user; callers MUST call cleanupUser
 * (or rely on global teardown) to remove the data.
 */
export async function createTestUser(opts?: { role?: string }): Promise<TestUser> {
  testCounter += 1;
  const suffix = `${Date.now()}-${testCounter}`;
  const email = `test-${suffix}@panggonmikir.test`;
  const passwordHash = await bcrypt.hash('test-password-123', 4);

  const role = await prisma.role.upsert({
    where: { name: opts?.role ?? ROLES.SUPER_ADMIN },
    update: {},
    create: { name: opts?.role ?? ROLES.SUPER_ADMIN, isSystem: true },
  });

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: `Test User ${suffix}`,
      isActive: true,
      roles: { create: { roleId: role.id } },
    },
  });

  const workspace = await prisma.workspace.create({
    data: {
      ownerId: user.id,
      name: 'Personal',
      isDefault: true,
    },
  });

  const token = signAccessToken({ sub: user.id, email: user.email, roles: [opts?.role ?? ROLES.SUPER_ADMIN] });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    token,
    workspaceId: workspace.id,
  };
}

export async function cleanupUser(userId: string): Promise<void> {
  // Cascade-delete user removes refresh tokens, audit logs, workspaces, etc.
  await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
}
