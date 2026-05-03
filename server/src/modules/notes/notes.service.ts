import type { Prisma } from '@prisma/client';
import type { CreateNoteInput, UpdateNoteInput, NoteListQuery } from '@panggonmikir/shared';
import { buildPagination, toSkipTake } from '@panggonmikir/shared';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../lib/errors.js';

interface OwnerScope {
  ownerId: string;
}

function buildWhere(q: NoteListQuery, scope: OwnerScope): Prisma.NoteWhereInput {
  const where: Prisma.NoteWhereInput = { ownerId: scope.ownerId };
  if (q.deletedOnly) {
    where.deletedAt = { not: null };
  } else if (!q.includeDeleted) {
    where.deletedAt = null;
  }
  if (q.projectId) where.projectId = q.projectId;
  if (q.pinned !== undefined) where.pinned = q.pinned;

  if (q.workspaceId) where.workspaceId = q.workspaceId;
  if (q.search) {
    where.OR = [
      { title: { contains: q.search, mode: 'insensitive' } },
      { content: { contains: q.search, mode: 'insensitive' } },
    ];
  }
  return where;
}

export async function list(q: NoteListQuery, scope: OwnerScope) {
  const { skip, take } = toSkipTake(q.page, q.limit);
  let where = buildWhere(q, scope);

  if (q.tagIds && q.tagIds.length > 0) {
    const tagged = await prisma.entityTag.findMany({
      where: { entityType: 'NOTE', tagId: { in: q.tagIds } },
      select: { entityId: true },
    });
    const ids = Array.from(new Set(tagged.map((t) => t.entityId)));
    where = { ...where, id: { in: ids } };
  }

  // Pinned notes always come first.
  const orderBy: Prisma.NoteOrderByWithRelationInput[] = [
    { pinned: 'desc' },
    { [q.sortBy]: q.sortOrder },
  ];
  const [items, total] = await Promise.all([
    prisma.note.findMany({
      where,
      skip,
      take,
      orderBy,
      include: { project: { select: { id: true, name: true, color: true } } },
    }),
    prisma.note.count({ where }),
  ]);
  return buildPagination(items, total, q.page, q.limit);
}

export async function get(id: string, scope: OwnerScope) {
  const item = await prisma.note.findFirst({
    where: { id, ownerId: scope.ownerId, deletedAt: null },
    include: { project: { select: { id: true, name: true, color: true } } },
  });
  if (!item) throw NotFoundError('Note', id);
  return item;
}

export async function create(input: CreateNoteInput, scope: OwnerScope) {
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
  return prisma.note.create({
    data: { ...input, ownerId: scope.ownerId },
  });
}

export async function update(id: string, input: UpdateNoteInput, scope: OwnerScope) {
  const note = await get(id, scope);
  if (input.projectId) {
    const project = await prisma.project.findFirst({
      where: {
        id: input.projectId,
        ownerId: scope.ownerId,
        workspaceId: note.workspaceId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!project) throw NotFoundError('Project', input.projectId);
  }
  return prisma.note.update({ where: { id }, data: input });
}

export async function softDelete(id: string, scope: OwnerScope) {
  await get(id, scope);
  await prisma.note.update({ where: { id }, data: { deletedAt: new Date() } });
}

export async function restore(id: string, scope: OwnerScope) {
  const item = await prisma.note.findFirst({
    where: { id, ownerId: scope.ownerId, NOT: { deletedAt: null } },
  });
  if (!item) throw NotFoundError('Note', id);
  return prisma.note.update({ where: { id }, data: { deletedAt: null } });
}

export async function purge(id: string, scope: OwnerScope) {
  const item = await prisma.note.findFirst({
    where: { id, ownerId: scope.ownerId, NOT: { deletedAt: null } },
  });
  if (!item) throw NotFoundError('Note', id);
  await prisma.note.delete({ where: { id } });
}

export async function togglePin(id: string, scope: OwnerScope) {
  const note = await get(id, scope);
  return prisma.note.update({
    where: { id },
    data: { pinned: !note.pinned },
  });
}
