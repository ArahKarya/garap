import bcrypt from 'bcryptjs';
import type { CreateUserInput, UpdateUserInput, PaginationQuery } from '@garap/shared';
import { buildPagination, toSkipTake } from '@garap/shared';
import { prisma } from '../../lib/prisma.js';
import { ConflictError, NotFoundError } from '../../lib/errors.js';

export async function list(q: PaginationQuery) {
  const { skip, take } = toSkipTake(q.page, q.limit);
  const where = q.search
    ? {
        OR: [
          { email: { contains: q.search, mode: 'insensitive' as const } },
          { name: { contains: q.search, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: q.sortOrder },
      include: { roles: { include: { role: true } } },
    }),
    prisma.user.count({ where }),
  ]);

  const mapped = items.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    isActive: u.isActive,
    roles: u.roles.map((ur) => ur.role.name),
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
  }));

  return buildPagination(mapped, total, q.page, q.limit);
}

export async function get(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: { roles: { include: { role: true } } },
  });
  if (!user) throw NotFoundError('User', id);
  return user;
}

export async function create(input: CreateUserInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw ConflictError('Email sudah terdaftar');
  const passwordHash = await bcrypt.hash(input.password, 10);

  return prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      name: input.name,
      isActive: input.isActive,
      roles: { create: input.roleIds.map((roleId) => ({ roleId })) },
    },
    include: { roles: { include: { role: true } } },
  });
}

export async function update(id: string, input: UpdateUserInput) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw NotFoundError('User', id);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id },
      data: {
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
    if (input.roleIds) {
      await tx.userRole.deleteMany({ where: { userId: id } });
      await tx.userRole.createMany({
        data: input.roleIds.map((roleId) => ({ userId: id, roleId })),
      });
    }
    return updated;
  });
}

export async function remove(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw NotFoundError('User', id);
  await prisma.user.delete({ where: { id } });
}

export async function resetPassword(id: string, newPassword: string) {
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id }, data: { passwordHash } });
  await prisma.refreshToken.updateMany({
    where: { userId: id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
