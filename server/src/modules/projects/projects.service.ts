import type { Prisma } from '@prisma/client';
import type {
  CreateProjectInput,
  UpdateProjectInput,
  ProjectListQuery,
} from '@panggonmikir/shared';
import { buildPagination, toSkipTake } from '@panggonmikir/shared';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../lib/errors.js';

interface OwnerScope {
  ownerId: string;
}

function buildWhere(q: ProjectListQuery, scope: OwnerScope): Prisma.ProjectWhereInput {
  const where: Prisma.ProjectWhereInput = { ownerId: scope.ownerId };
  if (q.deletedOnly) {
    where.deletedAt = { not: null };
  } else if (!q.includeDeleted) {
    where.deletedAt = null;
  }
  if (q.status) {
    where.status = q.status;
  } else if (!q.includeArchived) {
    where.status = { not: 'ARCHIVED' };
  }
  if (q.search) {
    where.OR = [
      { name: { contains: q.search, mode: 'insensitive' } },
      { description: { contains: q.search, mode: 'insensitive' } },
    ];
  }
  return where;
}

export async function list(q: ProjectListQuery, scope: OwnerScope) {
  const { skip, take } = toSkipTake(q.page, q.limit);
  let where = buildWhere(q, scope);

  if (q.tagIds && q.tagIds.length > 0) {
    const tagged = await prisma.entityTag.findMany({
      where: { entityType: 'PROJECT', tagId: { in: q.tagIds } },
      select: { entityId: true },
    });
    const ids = Array.from(new Set(tagged.map((t) => t.entityId)));
    where = { ...where, id: { in: ids } };
  }

  const orderBy: Prisma.ProjectOrderByWithRelationInput = { [q.sortBy]: q.sortOrder };
  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        _count: {
          select: {
            tasks: { where: { deletedAt: null } },
            links: { where: { deletedAt: null } },
          },
        },
      },
    }),
    prisma.project.count({ where }),
  ]);
  return buildPagination(items, total, q.page, q.limit);
}

export async function get(id: string, scope: OwnerScope) {
  const item = await prisma.project.findFirst({
    where: { id, ownerId: scope.ownerId, deletedAt: null },
    include: {
      milestones: { orderBy: { sortOrder: 'asc' } },
      _count: {
        select: {
          tasks: { where: { deletedAt: null } },
          links: { where: { deletedAt: null } },
        },
      },
    },
  });
  if (!item) throw NotFoundError('Project', id);
  return item;
}

export async function create(input: CreateProjectInput, scope: OwnerScope) {
  return prisma.project.create({
    data: {
      ...input,
      ownerId: scope.ownerId,
    },
  });
}

export async function update(id: string, input: UpdateProjectInput, scope: OwnerScope) {
  await get(id, scope);
  const archivedAt =
    input.status === 'ARCHIVED' ? new Date() : input.status ? null : undefined;
  return prisma.project.update({
    where: { id },
    data: {
      ...input,
      ...(archivedAt !== undefined ? { archivedAt } : {}),
    },
  });
}

export async function softDelete(id: string, scope: OwnerScope) {
  await get(id, scope);
  await prisma.project.update({ where: { id }, data: { deletedAt: new Date() } });
}

export async function restore(id: string, scope: OwnerScope) {
  const item = await prisma.project.findFirst({
    where: { id, ownerId: scope.ownerId, NOT: { deletedAt: null } },
  });
  if (!item) throw NotFoundError('Project', id);
  return prisma.project.update({ where: { id }, data: { deletedAt: null } });
}

/**
 * Hard delete — cascades to milestones (FK: Cascade) but **detaches** tasks,
 * links, notes, documents (FK: SetNull). Only allowed when project is in trash.
 */
export async function purge(id: string, scope: OwnerScope) {
  const item = await prisma.project.findFirst({
    where: { id, ownerId: scope.ownerId, NOT: { deletedAt: null } },
  });
  if (!item) throw NotFoundError('Project', id);
  await prisma.project.delete({ where: { id } });
}
