import path from 'node:path';
import { promises as fs } from 'node:fs';
import type { Prisma } from '@prisma/client';
import type {
  CreateExternalDocumentInput,
  UpdateDocumentInput,
  DocumentListQuery,
} from '@garap/shared';
import { buildPagination, toSkipTake } from '@garap/shared';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError, ValidationError } from '../../lib/errors.js';
import { assertWithinQuota } from '../../lib/quota.js';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { isPublicHttpUrl } from '../../lib/url-safety.js';

interface OwnerScope {
  ownerId: string;
}

interface UploadInfo {
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  path: string;
}

function buildWhere(
  q: DocumentListQuery,
  scope: OwnerScope,
): Prisma.DocumentWhereInput {
  const where: Prisma.DocumentWhereInput = { ownerId: scope.ownerId };
  if (q.deletedOnly) {
    where.deletedAt = { not: null };
  } else if (!q.includeDeleted) {
    where.deletedAt = null;
  }
  if (q.projectId) where.projectId = q.projectId;
  if (q.sourceType === 'UPLOAD') where.fileUploadId = { not: null };
  if (q.sourceType === 'EXTERNAL') where.externalUrl = { not: null };

  if (q.workspaceId) where.workspaceId = q.workspaceId;
  if (q.search) {
    where.OR = [
      { title: { contains: q.search, mode: 'insensitive' } },
      { description: { contains: q.search, mode: 'insensitive' } },
    ];
  }
  return where;
}

async function ensureProjectOwnership(
  projectId: string | null | undefined,
  workspaceId: string,
  scope: OwnerScope,
): Promise<void> {
  if (!projectId) return;
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: scope.ownerId, workspaceId, deletedAt: null },
    select: { id: true },
  });
  if (!project) throw NotFoundError('Project', projectId);
}

async function ensureWorkspaceOwnership(workspaceId: string, scope: OwnerScope): Promise<void> {
  const ws = await prisma.workspace.findFirst({
    where: { id: workspaceId, ownerId: scope.ownerId, deletedAt: null },
    select: { id: true },
  });
  if (!ws) throw NotFoundError('Workspace', workspaceId);
}

export async function list(q: DocumentListQuery, scope: OwnerScope) {
  const { skip, take } = toSkipTake(q.page, q.limit);
  let where = buildWhere(q, scope);

  if (q.tagIds && q.tagIds.length > 0) {
    const tagged = await prisma.entityTag.findMany({
      where: { entityType: 'DOCUMENT', tagId: { in: q.tagIds } },
      select: { entityId: true },
    });
    const ids = Array.from(new Set(tagged.map((t) => t.entityId)));
    where = { ...where, id: { in: ids } };
  }

  const [items, total] = await Promise.all([
    prisma.document.findMany({
      where,
      skip,
      take,
      orderBy: { [q.sortBy]: q.sortOrder },
      include: {
        project: { select: { id: true, name: true, color: true } },
      },
    }),
    prisma.document.count({ where }),
  ]);
  // Hydrate file metadata for uploads.
  const uploadIds = items
    .map((i) => i.fileUploadId)
    .filter((v): v is string => v !== null);
  const uploads = uploadIds.length
    ? await prisma.fileUpload.findMany({
        where: { id: { in: uploadIds } },
        select: { id: true, originalName: true, mimeType: true, size: true },
      })
    : [];
  const uploadMap = new Map(uploads.map((u) => [u.id, u]));
  const enriched = items.map((item) => ({
    ...item,
    upload: item.fileUploadId ? (uploadMap.get(item.fileUploadId) ?? null) : null,
  }));
  return buildPagination(enriched, total, q.page, q.limit);
}

export async function get(id: string, scope: OwnerScope) {
  const item = await prisma.document.findFirst({
    where: { id, ownerId: scope.ownerId, deletedAt: null },
    include: { project: { select: { id: true, name: true, color: true } } },
  });
  if (!item) throw NotFoundError('Document', id);
  const upload = item.fileUploadId
    ? await prisma.fileUpload.findUnique({ where: { id: item.fileUploadId } })
    : null;
  return { ...item, upload };
}

export async function createFromUpload(
  meta: { workspaceId: string; title: string; description?: string | null; projectId?: string | null },
  upload: UploadInfo,
  scope: OwnerScope,
) {
  await assertWithinQuota('documents', scope.ownerId);
  await ensureWorkspaceOwnership(meta.workspaceId, scope);
  await ensureProjectOwnership(meta.projectId, meta.workspaceId, scope);
  const fileUpload = await prisma.fileUpload.create({
    data: {
      userId: scope.ownerId,
      originalName: upload.originalName,
      storedName: upload.storedName,
      mimeType: upload.mimeType,
      size: upload.size,
      path: upload.path,
      entity: 'document',
    },
  });
  const document = await prisma.document.create({
    data: {
      ownerId: scope.ownerId,
      workspaceId: meta.workspaceId,
      title: meta.title,
      description: meta.description ?? null,
      projectId: meta.projectId ?? null,
      fileUploadId: fileUpload.id,
    },
  });
  // Backfill entityId on the file upload now that the doc exists.
  await prisma.fileUpload.update({
    where: { id: fileUpload.id },
    data: { entityId: document.id },
  });
  return { ...document, upload: fileUpload };
}

export async function createFromExternal(
  input: CreateExternalDocumentInput,
  scope: OwnerScope,
) {
  await assertWithinQuota('documents', scope.ownerId);
  // Defense in depth — Zod schema also runs the regex check, but reuse the
  // shared isPublicHttpUrl utility here so any future change to the
  // private-IP rules propagates automatically.
  const safety = isPublicHttpUrl(input.externalUrl);
  if (!safety.ok) {
    throw ValidationError(safety.reason ?? 'URL tidak valid');
  }
  await ensureWorkspaceOwnership(input.workspaceId, scope);
  await ensureProjectOwnership(input.projectId, input.workspaceId, scope);
  return prisma.document.create({
    data: {
      ownerId: scope.ownerId,
      workspaceId: input.workspaceId,
      title: input.title,
      description: input.description ?? null,
      externalUrl: input.externalUrl,
      projectId: input.projectId ?? null,
    },
  });
}

export async function update(id: string, input: UpdateDocumentInput, scope: OwnerScope) {
  const item = await get(id, scope);
  await ensureProjectOwnership(input.projectId, item.workspaceId, scope);
  return prisma.document.update({ where: { id }, data: input });
}

export async function softDelete(id: string, scope: OwnerScope) {
  await get(id, scope);
  await prisma.document.update({ where: { id }, data: { deletedAt: new Date() } });
}

export async function restore(id: string, scope: OwnerScope) {
  const item = await prisma.document.findFirst({
    where: { id, ownerId: scope.ownerId, NOT: { deletedAt: null } },
  });
  if (!item) throw NotFoundError('Document', id);
  return prisma.document.update({ where: { id }, data: { deletedAt: null } });
}

/**
 * Hard delete — also removes the underlying file upload (DB row + file on
 * disk). Only allowed when document is already in trash. File deletion is
 * best-effort; a failed unlink doesn't block the DB delete.
 */
export async function purge(id: string, scope: OwnerScope) {
  const item = await prisma.document.findFirst({
    where: { id, ownerId: scope.ownerId, NOT: { deletedAt: null } },
  });
  if (!item) throw NotFoundError('Document', id);

  if (item.fileUploadId) {
    const fileUpload = await prisma.fileUpload.findUnique({
      where: { id: item.fileUploadId },
    });
    if (fileUpload) {
      const abs = path.resolve(env.UPLOAD_DIR, fileUpload.storedName);
      const root = path.resolve(env.UPLOAD_DIR);
      if (abs.startsWith(root + path.sep)) {
        await fs.unlink(abs).catch((err) =>
          logger.warn({ err, abs }, 'failed to unlink file during purge'),
        );
      }
    }
  }
  const fileUploadId = item.fileUploadId;
  await prisma.document.delete({ where: { id } });
  if (fileUploadId) {
    await prisma.fileUpload.delete({ where: { id: fileUploadId } }).catch(() => undefined);
  }
}

/** Resolve the absolute path for streaming. Throws if doc has no upload or file missing. */
export async function resolveDownload(id: string, scope: OwnerScope) {
  const doc = await get(id, scope);
  if (!doc.upload) throw ValidationError('Dokumen ini bukan file upload (gunakan externalUrl)');
  const abs = path.resolve(env.UPLOAD_DIR, doc.upload.storedName);
  // Defense in depth: ensure path is inside UPLOAD_DIR.
  const uploadRoot = path.resolve(env.UPLOAD_DIR);
  if (!abs.startsWith(uploadRoot + path.sep)) {
    logger.error({ id, abs }, 'Upload path escapes UPLOAD_DIR');
    throw NotFoundError('Document file', id);
  }
  try {
    await fs.access(abs);
  } catch {
    throw NotFoundError('Document file', id);
  }
  return {
    abs,
    originalName: doc.upload.originalName,
    mimeType: doc.upload.mimeType,
    size: doc.upload.size,
  };
}
