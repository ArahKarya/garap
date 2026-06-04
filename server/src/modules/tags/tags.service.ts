import type { Prisma, TaggableEntity } from '@prisma/client';
import type { CreateTagInput, UpdateTagInput, TagListQuery } from '@garap/shared';
import { prisma } from '../../lib/prisma.js';
import { ConflictError, NotFoundError } from '../../lib/errors.js';

interface OwnerScope {
  ownerId: string;
}

export async function list(q: TagListQuery, scope: OwnerScope) {
  const where: Prisma.TagWhereInput = { ownerId: scope.ownerId };
  if (q.search) where.name = { contains: q.search, mode: 'insensitive' };
  return prisma.tag.findMany({
    where,
    orderBy: { name: 'asc' },
    include: { _count: { select: { taggings: true } } },
  });
}

export async function get(id: string, scope: OwnerScope) {
  const item = await prisma.tag.findFirst({ where: { id, ownerId: scope.ownerId } });
  if (!item) throw NotFoundError('Tag', id);
  return item;
}

export async function create(input: CreateTagInput, scope: OwnerScope) {
  const existing = await prisma.tag.findUnique({
    where: { ownerId_name: { ownerId: scope.ownerId, name: input.name } },
  });
  if (existing) throw ConflictError(`Tag "${input.name}" sudah ada`);
  return prisma.tag.create({
    data: { ...input, ownerId: scope.ownerId },
  });
}

export async function update(id: string, input: UpdateTagInput, scope: OwnerScope) {
  await get(id, scope);
  if (input.name) {
    const conflict = await prisma.tag.findFirst({
      where: { ownerId: scope.ownerId, name: input.name, NOT: { id } },
    });
    if (conflict) throw ConflictError(`Tag "${input.name}" sudah ada`);
  }
  return prisma.tag.update({ where: { id }, data: input });
}

export async function remove(id: string, scope: OwnerScope) {
  await get(id, scope);
  // Tag delete cascades to all EntityTag rows via FK onDelete: Cascade.
  await prisma.tag.delete({ where: { id } });
}

export async function attach(input: { tagId: string; entityType: TaggableEntity; entityId: string }, scope: OwnerScope) {
  // Verify the tag belongs to the user.
  await get(input.tagId, scope);
  return prisma.entityTag.upsert({
    where: {
      tagId_entityType_entityId: {
        tagId: input.tagId,
        entityType: input.entityType,
        entityId: input.entityId,
      },
    },
    create: input,
    update: {},
  });
}

export async function detach(input: { tagId: string; entityType: TaggableEntity; entityId: string }, scope: OwnerScope) {
  await get(input.tagId, scope);
  await prisma.entityTag
    .delete({
      where: {
        tagId_entityType_entityId: {
          tagId: input.tagId,
          entityType: input.entityType,
          entityId: input.entityId,
        },
      },
    })
    .catch(() => undefined); // ignore not-found
}

export async function listForEntity(
  entityType: TaggableEntity,
  entityId: string,
  scope: OwnerScope,
) {
  const taggings = await prisma.entityTag.findMany({
    where: {
      entityType,
      entityId,
      tag: { ownerId: scope.ownerId },
    },
    include: { tag: true },
    orderBy: { tag: { name: 'asc' } },
  });
  return taggings.map((t) => t.tag);
}

/**
 * Return all entities tagged with the given tag, grouped by entity type and
 * filtered to the user's ownership. Optionally scoped to a workspace.
 */
export async function entitiesForTag(
  tagId: string,
  scope: OwnerScope,
  workspaceId?: string,
) {
  const tag = await get(tagId, scope);

  const taggings = await prisma.entityTag.findMany({
    where: { tagId },
    select: { entityType: true, entityId: true },
  });
  const idsByType = {
    TASK: [] as string[],
    PROJECT: [] as string[],
    LINK: [] as string[],
    NOTE: [] as string[],
    DOCUMENT: [] as string[],
    REFERENCE: [] as string[],
  };
  for (const t of taggings) {
    idsByType[t.entityType].push(t.entityId);
  }

  const wsScope = workspaceId ? { workspaceId } : {};

  const [tasks, projects, links, notes, documents, references] = await Promise.all([
    idsByType.TASK.length
      ? prisma.task.findMany({
          where: {
            id: { in: idsByType.TASK },
            ownerId: scope.ownerId,
            deletedAt: null,
            ...wsScope,
          },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
          },
          orderBy: { updatedAt: 'desc' },
        })
      : [],
    idsByType.PROJECT.length
      ? prisma.project.findMany({
          where: {
            id: { in: idsByType.PROJECT },
            ownerId: scope.ownerId,
            deletedAt: null,
            ...wsScope,
          },
          select: { id: true, name: true, status: true, color: true },
          orderBy: { updatedAt: 'desc' },
        })
      : [],
    idsByType.LINK.length
      ? prisma.link.findMany({
          where: {
            id: { in: idsByType.LINK },
            ownerId: scope.ownerId,
            deletedAt: null,
            ...wsScope,
          },
          select: { id: true, title: true, url: true, platform: true, faviconUrl: true },
          orderBy: { updatedAt: 'desc' },
        })
      : [],
    idsByType.NOTE.length
      ? prisma.note.findMany({
          where: {
            id: { in: idsByType.NOTE },
            ownerId: scope.ownerId,
            deletedAt: null,
            ...wsScope,
          },
          select: { id: true, title: true, pinned: true, updatedAt: true },
          orderBy: { updatedAt: 'desc' },
        })
      : [],
    idsByType.DOCUMENT.length
      ? prisma.document.findMany({
          where: {
            id: { in: idsByType.DOCUMENT },
            ownerId: scope.ownerId,
            deletedAt: null,
            ...wsScope,
          },
          select: {
            id: true,
            title: true,
            externalUrl: true,
            fileUploadId: true,
          },
          orderBy: { updatedAt: 'desc' },
        })
      : [],
    idsByType.REFERENCE.length
      ? prisma.reference.findMany({
          where: {
            id: { in: idsByType.REFERENCE },
            ownerId: scope.ownerId,
            deletedAt: null,
            ...wsScope,
          },
          select: {
            id: true,
            title: true,
            authors: true,
            type: true,
            year: true,
          },
          orderBy: { updatedAt: 'desc' },
        })
      : [],
  ]);

  return {
    tag,
    counts: {
      tasks: tasks.length,
      projects: projects.length,
      links: links.length,
      notes: notes.length,
      documents: documents.length,
      references: references.length,
    },
    items: { tasks, projects, links, notes, documents, references },
  };
}
