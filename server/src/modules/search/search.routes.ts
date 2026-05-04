import { Router } from 'express';
import { z } from 'zod';
import { ok } from '@panggonmikir/shared';
import { prisma } from '../../lib/prisma.js';
import { authenticate, type AuthenticatedRequest } from '../../middleware/auth.js';
import { validate, getValidated } from '../../middleware/validate.js';

const searchQuerySchema = z.object({
  q: z.string().trim().min(1, 'Query wajib diisi').max(200),
  limit: z.coerce.number().int().positive().max(20).default(8),
  workspaceId: z.string().optional(),
});

type SearchQuery = z.infer<typeof searchQuerySchema>;

export const searchRouter = Router();

searchRouter.use(authenticate);

/**
 * Federated search across tasks, projects, links, notes, documents, tags.
 * Returns up to `limit` matches per entity. Case-insensitive substring match.
 * Phase 3+ may upgrade to Postgres full-text search (tsvector + GIN).
 */
searchRouter.get(
  '/',
  validate(searchQuerySchema, 'query'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const q = getValidated<SearchQuery>(req, 'query');
      const ownerId = req.user!.id;
      const term = q.q;
      const insensitive = { contains: term, mode: 'insensitive' as const };
      const wsScope = q.workspaceId ? { workspaceId: q.workspaceId } : {};

      const [tasks, projects, links, notes, documents, references, tags] = await Promise.all([
        prisma.task.findMany({
          where: {
            ownerId,
            deletedAt: null,
            ...wsScope,
            OR: [{ title: insensitive }, { description: insensitive }],
          },
          take: q.limit,
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
          take: q.limit,
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
          take: q.limit,
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
          take: q.limit,
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
          take: q.limit,
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            title: true,
            externalUrl: true,
            fileUploadId: true,
          },
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
          take: q.limit,
          orderBy: { updatedAt: 'desc' },
          select: { id: true, title: true, authors: true, type: true, year: true },
        }),
        prisma.tag.findMany({
          where: { ownerId, name: insensitive },
          take: q.limit,
          orderBy: { name: 'asc' },
          select: { id: true, name: true, color: true },
        }),
      ]);

      res.json(
        ok({
          query: term,
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
        }),
      );
    } catch (err) {
      next(err);
    }
  },
);
