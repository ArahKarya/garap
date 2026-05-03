import type { Prisma } from '@prisma/client';
import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  WorkspaceListQuery,
} from '@panggonmikir/shared';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError, ConflictError, ValidationError } from '../../lib/errors.js';

interface OwnerScope {
  ownerId: string;
}

function buildWhere(q: WorkspaceListQuery, scope: OwnerScope): Prisma.WorkspaceWhereInput {
  const where: Prisma.WorkspaceWhereInput = { ownerId: scope.ownerId };
  if (q.deletedOnly) {
    where.deletedAt = { not: null };
  } else if (!q.includeDeleted) {
    where.deletedAt = null;
  }
  if (!q.includeArchived && !q.deletedOnly) {
    where.archivedAt = null;
  }
  return where;
}

export async function list(q: WorkspaceListQuery, scope: OwnerScope) {
  const where = buildWhere(q, scope);
  const orderBy: Prisma.WorkspaceOrderByWithRelationInput[] =
    q.sortBy === 'sortOrder'
      ? [{ sortOrder: q.sortOrder }, { createdAt: 'asc' }]
      : [{ [q.sortBy]: q.sortOrder }];
  return prisma.workspace.findMany({
    where,
    orderBy,
    include: {
      _count: {
        select: {
          projects: { where: { deletedAt: null } },
        },
      },
    },
  });
}

export async function get(id: string, scope: OwnerScope) {
  const item = await prisma.workspace.findFirst({
    where: { id, ownerId: scope.ownerId, deletedAt: null },
    include: {
      _count: {
        select: {
          projects: { where: { deletedAt: null } },
        },
      },
    },
  });
  if (!item) throw NotFoundError('Workspace', id);
  return item;
}

export async function create(input: CreateWorkspaceInput, scope: OwnerScope) {
  try {
    return await prisma.workspace.create({
      data: { ...input, ownerId: scope.ownerId },
    });
  } catch (err) {
    if (
      err instanceof Error &&
      'code' in err &&
      (err as { code?: string }).code === 'P2002'
    ) {
      throw ConflictError(`Workspace dengan nama "${input.name}" sudah ada`);
    }
    throw err;
  }
}

export async function update(id: string, input: UpdateWorkspaceInput, scope: OwnerScope) {
  await get(id, scope);

  try {
    return await prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.workspace.updateMany({
          where: { ownerId: scope.ownerId, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.workspace.update({
        where: { id },
        data: input,
      });
    });
  } catch (err) {
    if (
      err instanceof Error &&
      'code' in err &&
      (err as { code?: string }).code === 'P2002'
    ) {
      throw ConflictError(`Workspace dengan nama "${input.name}" sudah ada`);
    }
    throw err;
  }
}

export async function softDelete(id: string, scope: OwnerScope) {
  const item = await get(id, scope);
  if (item.isDefault) {
    throw ValidationError('Workspace default tidak bisa dihapus');
  }
  await prisma.$transaction(async (tx) => {
    const projectCount = await tx.project.count({
      where: { workspaceId: id, deletedAt: null },
    });
    if (projectCount > 0) {
      throw ValidationError(
        `Workspace masih punya ${projectCount} project aktif. Pindahkan atau arsipkan dulu.`,
      );
    }
    await tx.workspace.update({ where: { id }, data: { deletedAt: new Date() } });
  });
}

export async function restore(id: string, scope: OwnerScope) {
  const item = await prisma.workspace.findFirst({
    where: { id, ownerId: scope.ownerId, NOT: { deletedAt: null } },
  });
  if (!item) throw NotFoundError('Workspace', id);
  return prisma.workspace.update({ where: { id }, data: { deletedAt: null } });
}

export async function purge(id: string, scope: OwnerScope) {
  const item = await prisma.workspace.findFirst({
    where: { id, ownerId: scope.ownerId, NOT: { deletedAt: null } },
  });
  if (!item) throw NotFoundError('Workspace', id);
  // RESTRICT FK enforces "no live children" at the database layer; surface
  // a friendly message when violated.
  const projectCount = await prisma.project.count({ where: { workspaceId: id } });
  const taskCount = await prisma.task.count({ where: { workspaceId: id } });
  const linkCount = await prisma.link.count({ where: { workspaceId: id } });
  const noteCount = await prisma.note.count({ where: { workspaceId: id } });
  const docCount = await prisma.document.count({ where: { workspaceId: id } });
  if (projectCount + taskCount + linkCount + noteCount + docCount > 0) {
    throw ValidationError(
      'Workspace masih punya child entity. Purge child dulu (project/task/link/note/document).',
    );
  }
  await prisma.workspace.delete({ where: { id } });
}

export async function archive(id: string, scope: OwnerScope) {
  const item = await get(id, scope);
  if (item.isDefault) {
    throw ValidationError('Workspace default tidak bisa diarsipkan');
  }
  return prisma.workspace.update({
    where: { id },
    data: { archivedAt: new Date() },
  });
}

export async function unarchive(id: string, scope: OwnerScope) {
  await get(id, scope);
  return prisma.workspace.update({
    where: { id },
    data: { archivedAt: null },
  });
}

export async function setDefault(id: string, scope: OwnerScope) {
  await get(id, scope);
  return prisma.$transaction(async (tx) => {
    await tx.workspace.updateMany({
      where: { ownerId: scope.ownerId, isDefault: true },
      data: { isDefault: false },
    });
    return tx.workspace.update({
      where: { id },
      data: { isDefault: true },
    });
  });
}

/**
 * Memastikan owner memiliki minimal satu workspace. Dipanggil otomatis saat
 * user pertama kali login agar UI tidak kosong.
 */
export async function ensureDefaultWorkspace(ownerId: string) {
  const existing = await prisma.workspace.findFirst({
    where: { ownerId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });
  if (existing) return existing;
  return prisma.workspace.create({
    data: {
      ownerId,
      name: 'Personal',
      description: 'Workspace default',
      isDefault: true,
      sortOrder: 0,
    },
  });
}
