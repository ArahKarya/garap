import path from 'node:path';
import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import { Router } from 'express';
import multer from 'multer';
import {
  ok,
  PERMISSIONS,
  createExternalDocumentSchema,
  updateDocumentSchema,
  documentListQuerySchema,
  type CreateExternalDocumentInput,
  type UpdateDocumentInput,
  type DocumentListQuery,
} from '@panggonmikir/shared';
import { authenticate, type AuthenticatedRequest } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';
import { audit } from '../../middleware/audit.js';
import { validate, getValidated } from '../../middleware/validate.js';
import { env } from '../../config/env.js';
import { ValidationError } from '../../lib/errors.js';
import * as svc from './documents.service.js';

// Ensure upload dir exists at module load.
await fs.mkdir(env.UPLOAD_DIR, { recursive: true }).catch(() => undefined);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 16);
    const stored = `${crypto.randomBytes(16).toString('hex')}${ext}`;
    cb(null, stored);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: env.UPLOAD_MAX_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    // Reject obviously dangerous extensions; mimetype is unreliable.
    const blocked = /\.(exe|bat|cmd|sh|ps1|app|dmg)$/i;
    if (blocked.test(file.originalname)) {
      cb(new Error('File type tidak diizinkan'));
      return;
    }
    cb(null, true);
  },
});

export const documentsRouter = Router();

documentsRouter.use(authenticate);

documentsRouter.get(
  '/',
  requirePermissions(PERMISSIONS.DOCUMENT_READ),
  validate(documentListQuerySchema, 'query'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const q = getValidated<DocumentListQuery>(req, 'query');
      const result = await svc.list(q, { ownerId: req.user!.id });
      res.json(ok(result.items, result.meta));
    } catch (err) {
      next(err);
    }
  },
);

documentsRouter.get(
  '/:id',
  requirePermissions(PERMISSIONS.DOCUMENT_READ),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      res.json(ok(await svc.get(req.params.id, { ownerId: req.user!.id })));
    } catch (err) {
      next(err);
    }
  },
);

/** Create document linked to an external URL (no file upload). */
documentsRouter.post(
  '/external',
  requirePermissions(PERMISSIONS.DOCUMENT_WRITE),
  validate(createExternalDocumentSchema),
  audit('CREATE', 'document.external'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const input = getValidated<CreateExternalDocumentInput>(req);
      const created = await svc.createFromExternal(input, { ownerId: req.user!.id });
      res.status(201).json(ok(created));
    } catch (err) {
      next(err);
    }
  },
);

/** Create document from file upload (multipart/form-data with `file` + meta fields). */
documentsRouter.post(
  '/upload',
  requirePermissions(PERMISSIONS.DOCUMENT_WRITE),
  requirePermissions(PERMISSIONS.FILE_UPLOAD),
  upload.single('file'),
  audit('CREATE', 'document.upload'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.file) throw ValidationError('File wajib di-attach');
      const title = (req.body.title ?? req.file.originalname).toString().trim();
      if (!title) throw ValidationError('Judul wajib diisi');
      const description = req.body.description?.toString().trim() || null;
      const projectId = req.body.projectId?.toString() || null;

      const created = await svc.createFromUpload(
        { title, description, projectId },
        {
          originalName: req.file.originalname,
          storedName: req.file.filename,
          mimeType: req.file.mimetype,
          size: req.file.size,
          path: req.file.path,
        },
        { ownerId: req.user!.id },
      );
      res.status(201).json(ok(created));
    } catch (err) {
      // Clean up the uploaded file if anything downstream failed.
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => undefined);
      }
      next(err);
    }
  },
);

documentsRouter.patch(
  '/:id',
  requirePermissions(PERMISSIONS.DOCUMENT_WRITE),
  validate(updateDocumentSchema),
  audit('UPDATE', 'document'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const input = getValidated<UpdateDocumentInput>(req);
      res.json(ok(await svc.update(req.params.id, input, { ownerId: req.user!.id })));
    } catch (err) {
      next(err);
    }
  },
);

documentsRouter.delete(
  '/:id',
  requirePermissions(PERMISSIONS.DOCUMENT_DELETE),
  audit('DELETE', 'document'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      await svc.softDelete(req.params.id, { ownerId: req.user!.id });
      res.json(ok({ deleted: true }));
    } catch (err) {
      next(err);
    }
  },
);

documentsRouter.post(
  '/:id/restore',
  requirePermissions(PERMISSIONS.DOCUMENT_WRITE),
  audit('UPDATE', 'document'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      res.json(ok(await svc.restore(req.params.id, { ownerId: req.user!.id })));
    } catch (err) {
      next(err);
    }
  },
);

documentsRouter.delete(
  '/:id/purge',
  requirePermissions(PERMISSIONS.DOCUMENT_DELETE),
  audit('DELETE', 'document.purge'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      await svc.purge(req.params.id, { ownerId: req.user!.id });
      res.json(ok({ purged: true }));
    } catch (err) {
      next(err);
    }
  },
);

documentsRouter.get(
  '/:id/download',
  requirePermissions(PERMISSIONS.DOCUMENT_READ),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const file = await svc.resolveDownload(req.params.id, { ownerId: req.user!.id });
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Length', String(file.size));
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(file.originalName)}"`,
      );
      res.sendFile(file.abs);
    } catch (err) {
      next(err);
    }
  },
);
