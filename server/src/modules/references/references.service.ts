import type { Prisma } from '@prisma/client';
import type {
  CreateReferenceInput,
  UpdateReferenceInput,
  ReferenceListQuery,
} from '@panggonmikir/shared';
import { buildPagination, toSkipTake } from '@panggonmikir/shared';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../lib/errors.js';

interface OwnerScope {
  ownerId: string;
}

function buildWhere(q: ReferenceListQuery, scope: OwnerScope): Prisma.ReferenceWhereInput {
  const where: Prisma.ReferenceWhereInput = { ownerId: scope.ownerId };
  if (q.deletedOnly) {
    where.deletedAt = { not: null };
  } else if (!q.includeDeleted) {
    where.deletedAt = null;
  }
  if (q.workspaceId) where.workspaceId = q.workspaceId;
  if (q.projectId) where.projectId = q.projectId;
  if (q.type) where.type = q.type;
  if (q.yearFrom || q.yearTo) {
    where.year = {
      ...(q.yearFrom !== undefined ? { gte: q.yearFrom } : {}),
      ...(q.yearTo !== undefined ? { lte: q.yearTo } : {}),
    };
  }
  if (q.search) {
    where.OR = [
      { title: { contains: q.search, mode: 'insensitive' } },
      { authors: { contains: q.search, mode: 'insensitive' } },
      { source: { contains: q.search, mode: 'insensitive' } },
      { abstract: { contains: q.search, mode: 'insensitive' } },
      { doi: { contains: q.search, mode: 'insensitive' } },
      { isbn: { contains: q.search, mode: 'insensitive' } },
    ];
  }
  return where;
}

async function assertWorkspaceOwned(workspaceId: string, ownerId: string): Promise<void> {
  const ws = await prisma.workspace.findFirst({
    where: { id: workspaceId, ownerId, deletedAt: null },
    select: { id: true },
  });
  if (!ws) throw NotFoundError('Workspace', workspaceId);
}

async function assertProjectOwned(
  projectId: string | null | undefined,
  workspaceId: string,
  ownerId: string,
): Promise<void> {
  if (!projectId) return;
  const p = await prisma.project.findFirst({
    where: { id: projectId, ownerId, workspaceId, deletedAt: null },
    select: { id: true },
  });
  if (!p) throw NotFoundError('Project', projectId);
}

export async function list(q: ReferenceListQuery, scope: OwnerScope) {
  const { skip, take } = toSkipTake(q.page, q.limit);
  let where = buildWhere(q, scope);

  if (q.tagIds && q.tagIds.length > 0) {
    const tagged = await prisma.entityTag.findMany({
      where: { entityType: 'REFERENCE', tagId: { in: q.tagIds } },
      select: { entityId: true },
    });
    const ids = Array.from(new Set(tagged.map((t) => t.entityId)));
    where = { ...where, id: { in: ids } };
  }

  const orderBy: Prisma.ReferenceOrderByWithRelationInput = {
    [q.sortBy]: q.sortOrder,
  };
  const [items, total] = await Promise.all([
    prisma.reference.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        project: { select: { id: true, name: true, color: true } },
      },
    }),
    prisma.reference.count({ where }),
  ]);
  return buildPagination(items, total, q.page, q.limit);
}

export async function get(id: string, scope: OwnerScope) {
  const item = await prisma.reference.findFirst({
    where: { id, ownerId: scope.ownerId, deletedAt: null },
    include: { project: { select: { id: true, name: true, color: true } } },
  });
  if (!item) throw NotFoundError('Reference', id);
  return item;
}

export async function create(input: CreateReferenceInput, scope: OwnerScope) {
  await assertWorkspaceOwned(input.workspaceId, scope.ownerId);
  await assertProjectOwned(input.projectId, input.workspaceId, scope.ownerId);
  return prisma.reference.create({
    data: {
      ownerId: scope.ownerId,
      workspaceId: input.workspaceId,
      projectId: input.projectId ?? null,
      type: input.type,
      title: input.title,
      authors: input.authors ?? null,
      year: input.year ?? null,
      source: input.source ?? null,
      volume: input.volume ?? null,
      issue: input.issue ?? null,
      pages: input.pages ?? null,
      doi: input.doi ?? null,
      isbn: input.isbn ?? null,
      url: input.url || null,
      abstract: input.abstract ?? null,
      notes: input.notes ?? null,
      citation: input.citation ?? null,
    },
  });
}

export async function update(id: string, input: UpdateReferenceInput, scope: OwnerScope) {
  const item = await get(id, scope);
  if (input.projectId) {
    await assertProjectOwned(input.projectId, item.workspaceId, scope.ownerId);
  }
  return prisma.reference.update({
    where: { id },
    data: {
      ...input,
      url: input.url === '' ? null : input.url,
    },
  });
}

export async function softDelete(id: string, scope: OwnerScope) {
  await get(id, scope);
  await prisma.reference.update({ where: { id }, data: { deletedAt: new Date() } });
}

export async function restore(id: string, scope: OwnerScope) {
  const item = await prisma.reference.findFirst({
    where: { id, ownerId: scope.ownerId, NOT: { deletedAt: null } },
  });
  if (!item) throw NotFoundError('Reference', id);
  return prisma.reference.update({ where: { id }, data: { deletedAt: null } });
}

export async function purge(id: string, scope: OwnerScope) {
  const item = await prisma.reference.findFirst({
    where: { id, ownerId: scope.ownerId, NOT: { deletedAt: null } },
  });
  if (!item) throw NotFoundError('Reference', id);
  await prisma.reference.delete({ where: { id } });
}
