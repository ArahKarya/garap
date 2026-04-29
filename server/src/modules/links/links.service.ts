import type { Prisma } from '@prisma/client';
import type { CreateLinkInput, UpdateLinkInput, LinkListQuery } from '@panggonmikir/shared';
import { buildPagination, toSkipTake } from '@panggonmikir/shared';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../lib/errors.js';
import { fetchMetadata, detectPlatform } from './links.metadata.js';

interface OwnerScope {
  ownerId: string;
}

function buildWhere(q: LinkListQuery, scope: OwnerScope): Prisma.LinkWhereInput {
  const where: Prisma.LinkWhereInput = { ownerId: scope.ownerId };
  if (q.deletedOnly) {
    where.deletedAt = { not: null };
  } else if (!q.includeDeleted) {
    where.deletedAt = null;
  }
  if (q.platform) where.platform = q.platform;
  if (q.projectId) where.projectId = q.projectId;
  if (q.search) {
    where.OR = [
      { title: { contains: q.search, mode: 'insensitive' } },
      { description: { contains: q.search, mode: 'insensitive' } },
      { url: { contains: q.search, mode: 'insensitive' } },
      { notes: { contains: q.search, mode: 'insensitive' } },
    ];
  }
  return where;
}

export async function list(q: LinkListQuery, scope: OwnerScope) {
  const { skip, take } = toSkipTake(q.page, q.limit);
  let where = buildWhere(q, scope);

  if (q.tagIds && q.tagIds.length > 0) {
    const tagged = await prisma.entityTag.findMany({
      where: { entityType: 'LINK', tagId: { in: q.tagIds } },
      select: { entityId: true },
    });
    const ids = Array.from(new Set(tagged.map((t) => t.entityId)));
    where = { ...where, id: { in: ids } };
  }

  const orderBy: Prisma.LinkOrderByWithRelationInput = { [q.sortBy]: q.sortOrder };
  const [items, total] = await Promise.all([
    prisma.link.findMany({
      where,
      skip,
      take,
      orderBy,
      include: { project: { select: { id: true, name: true, color: true } } },
    }),
    prisma.link.count({ where }),
  ]);
  return buildPagination(items, total, q.page, q.limit);
}

export async function get(id: string, scope: OwnerScope) {
  const item = await prisma.link.findFirst({
    where: { id, ownerId: scope.ownerId, deletedAt: null },
    include: { project: { select: { id: true, name: true, color: true } } },
  });
  if (!item) throw NotFoundError('Link', id);
  return item;
}

export async function create(input: CreateLinkInput, scope: OwnerScope) {
  if (input.projectId) {
    const project = await prisma.project.findFirst({
      where: { id: input.projectId, ownerId: scope.ownerId, deletedAt: null },
      select: { id: true },
    });
    if (!project) throw NotFoundError('Project', input.projectId);
  }

  const meta = await fetchMetadata(input.url);
  return prisma.link.create({
    data: {
      ownerId: scope.ownerId,
      url: input.url,
      canonicalUrl: meta.canonicalUrl,
      title: input.title?.trim() || meta.title,
      description: input.description ?? meta.description,
      notes: input.notes ?? null,
      faviconUrl: meta.faviconUrl,
      thumbnailUrl: meta.thumbnailUrl,
      platform: input.platform ?? meta.platform,
      projectId: input.projectId ?? null,
    },
  });
}

export async function update(id: string, input: UpdateLinkInput, scope: OwnerScope) {
  await get(id, scope);
  if (input.projectId) {
    const project = await prisma.project.findFirst({
      where: { id: input.projectId, ownerId: scope.ownerId, deletedAt: null },
      select: { id: true },
    });
    if (!project) throw NotFoundError('Project', input.projectId);
  }
  return prisma.link.update({ where: { id }, data: input });
}

export async function softDelete(id: string, scope: OwnerScope) {
  await get(id, scope);
  await prisma.link.update({ where: { id }, data: { deletedAt: new Date() } });
}

export async function restore(id: string, scope: OwnerScope) {
  const item = await prisma.link.findFirst({
    where: { id, ownerId: scope.ownerId, NOT: { deletedAt: null } },
  });
  if (!item) throw NotFoundError('Link', id);
  return prisma.link.update({ where: { id }, data: { deletedAt: null } });
}

export async function purge(id: string, scope: OwnerScope) {
  const item = await prisma.link.findFirst({
    where: { id, ownerId: scope.ownerId, NOT: { deletedAt: null } },
  });
  if (!item) throw NotFoundError('Link', id);
  await prisma.link.delete({ where: { id } });
}

export async function recordVisit(id: string, scope: OwnerScope) {
  const item = await get(id, scope);
  return prisma.link.update({
    where: { id },
    data: {
      lastAccessedAt: new Date(),
      accessCount: { increment: 1 },
    },
    select: { id: true, url: true, accessCount: true, lastAccessedAt: true },
  });
}

export async function refreshMetadata(id: string, scope: OwnerScope) {
  const link = await get(id, scope);
  const meta = await fetchMetadata(link.url);
  return prisma.link.update({
    where: { id },
    data: {
      canonicalUrl: meta.canonicalUrl,
      title: meta.title,
      description: meta.description,
      faviconUrl: meta.faviconUrl,
      thumbnailUrl: meta.thumbnailUrl,
      platform: detectPlatform(link.url),
      lastCheckedAt: new Date(),
      isBroken: false,
    },
  });
}
