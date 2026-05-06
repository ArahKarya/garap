import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../lib/errors.js';

interface SearchScope {
  ownerId: string;
}

export interface SearchInput {
  q: string;
  limit: number;
  workspaceId?: string;
}

/**
 * Federated search across all 7 domain entities, optionally scoped to a
 * workspace. Workspace ownership asserted before fan-out so a stray ID
 * doesn't return an empty list silently.
 */
export async function search(input: SearchInput, scope: SearchScope) {
  const { q, limit, workspaceId } = input;
  const { ownerId } = scope;
  const insensitive = { contains: q, mode: 'insensitive' as const };

  if (workspaceId) {
    const ws = await prisma.workspace.findFirst({
      where: { id: workspaceId, ownerId, deletedAt: null },
      select: { id: true },
    });
    if (!ws) throw NotFoundError('Workspace', workspaceId);
  }
  const wsScope = workspaceId ? { workspaceId } : {};

  const [tasks, projects, links, notes, documents, references, tags] = await Promise.all([
    prisma.task.findMany({
      where: {
        ownerId,
        deletedAt: null,
        ...wsScope,
        OR: [{ title: insensitive }, { description: insensitive }],
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, status: true, priority: true, dueDate: true },
    }),
    prisma.project.findMany({
      where: {
        ownerId,
        deletedAt: null,
        ...wsScope,
        OR: [{ name: insensitive }, { description: insensitive }],
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
      select: { id: true, name: true, status: true, color: true },
    }),
    prisma.link.findMany({
      where: {
        ownerId,
        deletedAt: null,
        ...wsScope,
        OR: [
          { title: insensitive },
          { description: insensitive },
          { url: insensitive },
          { notes: insensitive },
        ],
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, url: true, platform: true, faviconUrl: true },
    }),
    prisma.note.findMany({
      where: {
        ownerId,
        deletedAt: null,
        ...wsScope,
        OR: [{ title: insensitive }, { content: insensitive }],
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, pinned: true, updatedAt: true },
    }),
    prisma.document.findMany({
      where: {
        ownerId,
        deletedAt: null,
        ...wsScope,
        OR: [{ title: insensitive }, { description: insensitive }],
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, externalUrl: true, fileUploadId: true },
    }),
    prisma.reference.findMany({
      where: {
        ownerId,
        deletedAt: null,
        ...wsScope,
        OR: [
          { title: insensitive },
          { authors: insensitive },
          { source: insensitive },
          { abstract: insensitive },
          { doi: insensitive },
        ],
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, authors: true, type: true, year: true },
    }),
    prisma.tag.findMany({
      where: { ownerId, name: insensitive },
      take: limit,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, color: true },
    }),
  ]);

  return {
    query: q,
    results: { tasks, projects, links, notes, documents, references, tags },
    totals: {
      tasks: tasks.length,
      projects: projects.length,
      links: links.length,
      notes: notes.length,
      documents: documents.length,
      references: references.length,
      tags: tags.length,
    },
  };
}
