import type { Prisma } from '@prisma/client';
import type { CreateTaskInput, UpdateTaskInput, TaskListQuery } from '@panggonmikir/shared';
import { buildPagination, toSkipTake } from '@panggonmikir/shared';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../lib/errors.js';

interface OwnerScope {
  ownerId: string;
}

function buildWhere(q: TaskListQuery, scope: OwnerScope): Prisma.TaskWhereInput {
  const where: Prisma.TaskWhereInput = { ownerId: scope.ownerId };
  if (q.deletedOnly) {
    where.deletedAt = { not: null };
  } else if (!q.includeDeleted) {
    where.deletedAt = null;
  }
  if (!q.includeCompleted) {
    where.status = q.status ?? { notIn: ['DONE', 'CANCELLED'] };
  } else if (q.status) {
    where.status = q.status;
  }
  if (q.priority) where.priority = q.priority;
  if (q.projectId) where.projectId = q.projectId;
  if (q.parentId !== undefined) where.parentId = q.parentId;
  if (q.dueBefore || q.dueAfter) {
    where.dueDate = {
      ...(q.dueBefore ? { lte: q.dueBefore } : {}),
      ...(q.dueAfter ? { gte: q.dueAfter } : {}),
    };
  }
  if (q.search) {
    where.OR = [
      { title: { contains: q.search, mode: 'insensitive' } },
      { description: { contains: q.search, mode: 'insensitive' } },
    ];
  }
  return where;
}

export async function list(q: TaskListQuery, scope: OwnerScope) {
  const { skip, take } = toSkipTake(q.page, q.limit);
  let where = buildWhere(q, scope);

  // Tag filter — return entities that have AT LEAST ONE of the given tags.
  if (q.tagIds && q.tagIds.length > 0) {
    const tagged = await prisma.entityTag.findMany({
      where: { entityType: 'TASK', tagId: { in: q.tagIds } },
      select: { entityId: true },
    });
    const ids = Array.from(new Set(tagged.map((t) => t.entityId)));
    where = { ...where, id: { in: ids } };
  }

  const orderBy: Prisma.TaskOrderByWithRelationInput = { [q.sortBy]: q.sortOrder };
  const [items, total] = await Promise.all([
    prisma.task.findMany({
      where,
      skip,
      take,
      orderBy,
      include: { project: { select: { id: true, name: true, color: true } } },
    }),
    prisma.task.count({ where }),
  ]);
  return buildPagination(items, total, q.page, q.limit);
}

export async function get(id: string, scope: OwnerScope) {
  const item = await prisma.task.findFirst({
    where: { id, ownerId: scope.ownerId, deletedAt: null },
    include: {
      project: { select: { id: true, name: true, color: true } },
      children: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } },
    },
  });
  if (!item) throw NotFoundError('Task', id);
  return item;
}

export async function create(input: CreateTaskInput, scope: OwnerScope) {
  // Validate that referenced project & parent task belong to the same owner.
  if (input.projectId) {
    const project = await prisma.project.findFirst({
      where: { id: input.projectId, ownerId: scope.ownerId, deletedAt: null },
      select: { id: true },
    });
    if (!project) throw NotFoundError('Project', input.projectId);
  }
  if (input.parentId) {
    const parent = await prisma.task.findFirst({
      where: { id: input.parentId, ownerId: scope.ownerId, deletedAt: null },
      select: { id: true },
    });
    if (!parent) throw NotFoundError('Parent Task', input.parentId);
  }
  return prisma.task.create({
    data: {
      ...input,
      ownerId: scope.ownerId,
    },
  });
}

export async function update(id: string, input: UpdateTaskInput, scope: OwnerScope) {
  await get(id, scope);
  // If status changes to DONE, set completedAt; if it changes to anything
  // else, clear it. If status is omitted, leave completedAt untouched.
  const completedAt =
    input.status === 'DONE' ? new Date() : input.status ? null : undefined;
  return prisma.task.update({
    where: { id },
    data: {
      ...input,
      ...(completedAt !== undefined ? { completedAt } : {}),
    },
  });
}

export async function softDelete(id: string, scope: OwnerScope) {
  await get(id, scope);
  await prisma.task.update({ where: { id }, data: { deletedAt: new Date() } });
}

export async function restore(id: string, scope: OwnerScope) {
  const item = await prisma.task.findFirst({
    where: { id, ownerId: scope.ownerId, NOT: { deletedAt: null } },
  });
  if (!item) throw NotFoundError('Task', id);
  return prisma.task.update({ where: { id }, data: { deletedAt: null } });
}

/** Hard delete — only allowed when item is already in trash (deletedAt set). */
export async function purge(id: string, scope: OwnerScope) {
  const item = await prisma.task.findFirst({
    where: { id, ownerId: scope.ownerId, NOT: { deletedAt: null } },
  });
  if (!item) throw NotFoundError('Task', id);
  await prisma.task.delete({ where: { id } });
}

export async function toggleComplete(id: string, scope: OwnerScope) {
  const task = await get(id, scope);
  const isDone = task.status === 'DONE';
  return prisma.task.update({
    where: { id },
    data: {
      status: isDone ? 'TODO' : 'DONE',
      completedAt: isDone ? null : new Date(),
    },
  });
}
