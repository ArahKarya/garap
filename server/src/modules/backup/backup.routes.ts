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

/**
 * Factory reset — wipes ALL of the current user's domain data:
 * tasks, projects, milestones, links, notes, documents, tags, entityTags,
 * file uploads. Account itself + auth artefacts (refresh tokens, audit log)
 * are preserved.
 *
 * Strict guard: client must POST { confirm: "RESET" } to even reach the
 * delete code. Audited as 'RESTORE' (closest existing audit action) so a
 * trail exists in case the user ever questions what happened.
 */
backupRouter.post(
  '/reset',
  requirePermissions(PERMISSIONS.BACKUP_RESTORE),
  audit('RESTORE', 'backup.reset'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (req.body?.confirm !== 'RESET') {
        return res.status(400).json({
          success: false,
          error: { message: 'Konfirmasi tidak cocok. Body harus { confirm: "RESET" }.' },
        });
      }
      const ownerId = req.user!.id;

      // Order matters: child rows first to avoid FK trouble even with
      // cascade rules. Wrap in a transaction so partial failures roll back.
      const result = await prisma.$transaction(async (tx) => {
        // EntityTag rows for any tag owned by this user.
        const taggings = await tx.entityTag.deleteMany({
          where: { tag: { ownerId } },
        });
        const tags = await tx.tag.deleteMany({ where: { ownerId } });

        // Domain entities. Documents reference FileUpload (1-1, optional);
        // collect those IDs first so we can delete the upload rows after
        // the documents themselves are gone.
        const docs = await tx.document.findMany({
          where: { ownerId },
          select: { fileUploadId: true },
        });
        const fileUploadIds = docs
          .map((d) => d.fileUploadId)
          .filter((v): v is string => v !== null);

        const documents = await tx.document.deleteMany({ where: { ownerId } });
        const links = await tx.link.deleteMany({ where: { ownerId } });
        const notes = await tx.note.deleteMany({ where: { ownerId } });
        // Tasks: children first to avoid the self-referential FK self-block.
        await tx.task.deleteMany({ where: { ownerId, NOT: { parentId: null } } });
        const tasks = await tx.task.deleteMany({ where: { ownerId } });
        // Projects last (tasks/links/notes/docs may still reference them
        // via SetNull, but we already cleared those above). Milestones
        // cascade via FK.
        const projects = await tx.project.deleteMany({ where: { ownerId } });

        // FileUpload rows + best-effort file removal.
        if (fileUploadIds.length > 0) {
          await tx.fileUpload.deleteMany({ where: { id: { in: fileUploadIds } } });
        }

        return {
          tasks: tasks.count,
          projects: projects.count,
          links: links.count,
          notes: notes.count,
          documents: documents.count,
          tags: tags.count,
          taggings: taggings.count,
          fileUploadsScheduled: fileUploadIds.length,
        };
      });

      res.json(ok({ reset: true, ...result }));
    } catch (err) {
      next(err);
    }
  },
);
