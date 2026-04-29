import { Router } from 'express';
import { ok, PERMISSIONS } from '@panggonmikir/shared';
import { authenticate, type AuthenticatedRequest } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';
import { audit } from '../../middleware/audit.js';
import { prisma } from '../../lib/prisma.js';

export const backupRouter = Router();

backupRouter.use(authenticate);

/**
 * Export the current user's full data set to JSON. Includes deleted items so
 * the backup is a true snapshot. Downloadable from the client.
 */
backupRouter.get(
  '/export',
  requirePermissions(PERMISSIONS.BACKUP_CREATE),
  audit('EXPORT', 'backup'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const ownerId = req.user!.id;
      const [
        user,
        projects,
        milestones,
        tasks,
        links,
        notes,
        documents,
        tags,
        entityTags,
      ] = await Promise.all([
        prisma.user.findUnique({
          where: { id: ownerId },
          select: { id: true, email: true, name: true, createdAt: true },
        }),
        prisma.project.findMany({ where: { ownerId } }),
        prisma.milestone.findMany({ where: { project: { ownerId } } }),
        prisma.task.findMany({ where: { ownerId } }),
        prisma.link.findMany({ where: { ownerId } }),
        prisma.note.findMany({ where: { ownerId } }),
        prisma.document.findMany({ where: { ownerId } }),
        prisma.tag.findMany({ where: { ownerId } }),
        prisma.entityTag.findMany({ where: { tag: { ownerId } } }),
      ]);

      const payload = {
        meta: {
          app: 'Panggon Mikir',
          version: 1,
          exportedAt: new Date().toISOString(),
          owner: user,
        },
        counts: {
          projects: projects.length,
          milestones: milestones.length,
          tasks: tasks.length,
          links: links.length,
          notes: notes.length,
          documents: documents.length,
          tags: tags.length,
          entityTags: entityTags.length,
        },
        data: {
          projects,
          milestones,
          tasks,
          links,
          notes,
          documents,
          tags,
          entityTags,
        },
      };

      // Trigger a file download in the browser.
      const filename = `panggon-mikir-backup-${new Date().toISOString().slice(0, 10)}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json(payload);
    } catch (err) {
      next(err);
    }
  },
);

/** Lightweight summary without the actual data — useful for a settings page card. */
backupRouter.get(
  '/summary',
  requirePermissions(PERMISSIONS.BACKUP_CREATE),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const ownerId = req.user!.id;
      const [tasks, projects, links, notes, documents, tags] = await Promise.all([
        prisma.task.count({ where: { ownerId } }),
        prisma.project.count({ where: { ownerId } }),
        prisma.link.count({ where: { ownerId } }),
        prisma.note.count({ where: { ownerId } }),
        prisma.document.count({ where: { ownerId } }),
        prisma.tag.count({ where: { ownerId } }),
      ]);
      res.json(ok({ tasks, projects, links, notes, documents, tags }));
    } catch (err) {
      next(err);
    }
  },
);
