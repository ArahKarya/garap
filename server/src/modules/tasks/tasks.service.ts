import type { Prisma } from '@prisma/client';
import type { CreateTaskInput, UpdateTaskInput, TaskListQuery } from '@garap/shared';
import { buildPagination, toSkipTake } from '@garap/shared';
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

  if (q.workspaceId) where.workspaceId = q.workspaceId;
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
  const workspace = await prisma.workspace.findFirst({
    where: { id: input.workspaceId, ownerId: scope.ownerId, deletedAt: null },
    select: { id: true },
  });
  if (!workspace) throw NotFoundError('Workspace', input.workspaceId);
  if (input.projectId) {
    const project = await prisma.project.findFirst({
      where: {
        id: input.projectId,
        ownerId: scope.ownerId,
        workspaceId: input.workspaceId,
        deletedAt: null,
      },
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
  const before = await get(id, scope);
  if (input.projectId) {
    const project = await prisma.project.findFirst({
      where: {
        id: input.projectId,
        ownerId: scope.ownerId,
        workspaceId: before.workspaceId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!project) throw NotFoundError('Project', input.projectId);
  }
  const completedAt =
    input.status === 'DONE' ? new Date() : input.status ? null : undefined;
  const updated = await prisma.task.update({
    where: { id },
    data: {
      ...input,
      ...(completedAt !== undefined ? { completedAt } : {}),
    },
  });

  // Recurrence: if the transition was → DONE and the task has a recurrence
  // preset + a dueDate, spawn the next instance.
  if (before.status !== 'DONE' && updated.status === 'DONE') {
    await maybeSpawnNextRecurrence(updated, scope);
  }
  return updated;
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
  const updated = await prisma.task.update({
    where: { id },
    data: {
      status: isDone ? 'TODO' : 'DONE',
      completedAt: isDone ? null : new Date(),
    },
  });
  // Going from not-done → DONE on a recurring task spawns the next instance.
  if (!isDone) {
    await maybeSpawnNextRecurrence(updated, scope);
  }
  return updated;
}

// ─── Recurrence engine ───────────────────────────────────────────────────

const RECURRENCE_PRESETS = ['daily', 'weekdays', 'weekly', 'monthly'] as const;
type RecurrencePreset = (typeof RECURRENCE_PRESETS)[number];

function isRecurrencePreset(v: string | null): v is RecurrencePreset {
  return v !== null && (RECURRENCE_PRESETS as readonly string[]).includes(v);
}

/** Compute the next due date given a preset and a base date. */
function nextDueDate(base: Date, preset: RecurrencePreset): Date {
  const next = new Date(base);
  switch (preset) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      return next;
    case 'weekdays': {
      // Mon–Fri only — skip Sat/Sun.
      do {
        next.setDate(next.getDate() + 1);
      } while (next.getDay() === 0 || next.getDay() === 6);
      return next;
    }
    case 'weekly':
      next.setDate(next.getDate() + 7);
      return next;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      return next;
  }
}

/**
 * If `task` has a recurrence preset AND a dueDate, create a fresh sibling
 * task with the same metadata but the next due date and a TODO status.
 * Tags from the original task are also copied.
 *
 * Best-effort — failures don't block the original update; they're logged
 * and the user can manually create the next instance.
 */
async function maybeSpawnNextRecurrence(
  task: { id: string; recurrence: string | null; dueDate: Date | null },
  scope: OwnerScope,
): Promise<void> {
  if (!task.recurrence || !isRecurrencePreset(task.recurrence) || !task.dueDate) return;
  try {
    const original = await prisma.task.findUniqueOrThrow({
      where: { id: task.id },
      select: {
        title: true,
        description: true,
        priority: true,
        workspaceId: true,
        projectId: true,
        parentId: true,
        recurrence: true,
        sortOrder: true,
      },
    });
    const next = await prisma.task.create({
      data: {
        ownerId: scope.ownerId,
        workspaceId: original.workspaceId,
        title: original.title,
        description: original.description,
        priority: original.priority,
        projectId: original.projectId,
        parentId: original.parentId,
        recurrence: original.recurrence,
        sortOrder: original.sortOrder,
        status: 'TODO',
        dueDate: nextDueDate(task.dueDate, task.recurrence),
      },
    });
    // Carry over tags so the recurring task is still discoverable via the
    // same filters.
    const tagIds = await prisma.entityTag.findMany({
      where: { entityType: 'TASK', entityId: task.id },
      select: { tagId: true },
    });
    if (tagIds.length > 0) {
      await prisma.entityTag.createMany({
        data: tagIds.map((t) => ({
          tagId: t.tagId,
          entityType: 'TASK',
          entityId: next.id,
        })),
        skipDuplicates: true,
      });
    }
  } catch (err) {
    // Log but don't fail the parent operation.
    // eslint-disable-next-line no-console
    console.warn('[tasks] failed to spawn recurrence', err);
  }
}
