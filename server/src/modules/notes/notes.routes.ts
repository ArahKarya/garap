import { Router } from 'express';
import {
  ok,
  PERMISSIONS,
  createNoteSchema,
  updateNoteSchema,
  noteListQuerySchema,
  type CreateNoteInput,
  type UpdateNoteInput,
  type NoteListQuery,
} from '@panggonmikir/shared';
import { authenticate, type AuthenticatedRequest } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';
import { audit } from '../../middleware/audit.js';
import { validate, getValidated } from '../../middleware/validate.js';
import * as svc from './notes.service.js';

export const notesRouter = Router();

notesRouter.use(authenticate);

notesRouter.get(
  '/',
  requirePermissions(PERMISSIONS.NOTE_READ),
  validate(noteListQuerySchema, 'query'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const q = getValidated<NoteListQuery>(req, 'query');
      const result = await svc.list(q, { ownerId: req.user!.id });
      res.json(ok(result.items, result.meta));
    } catch (err) {
      next(err);
    }
  },
);

notesRouter.get(
  '/:id',
  requirePermissions(PERMISSIONS.NOTE_READ),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      res.json(ok(await svc.get(req.params.id as string, { ownerId: req.user!.id })));
    } catch (err) {
      next(err);
    }
  },
);

notesRouter.post(
  '/',
  requirePermissions(PERMISSIONS.NOTE_WRITE),
  validate(createNoteSchema),
  audit('CREATE', 'note'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const input = getValidated<CreateNoteInput>(req);
      const created = await svc.create(input, { ownerId: req.user!.id });
      res.status(201).json(ok(created));
    } catch (err) {
      next(err);
    }
  },
);

notesRouter.patch(
  '/:id',
  requirePermissions(PERMISSIONS.NOTE_WRITE),
  validate(updateNoteSchema),
  audit('UPDATE', 'note'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const input = getValidated<UpdateNoteInput>(req);
      res.json(ok(await svc.update(req.params.id as string, input, { ownerId: req.user!.id })));
    } catch (err) {
      next(err);
    }
  },
);

notesRouter.delete(
  '/:id',
  requirePermissions(PERMISSIONS.NOTE_DELETE),
  audit('DELETE', 'note'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      await svc.softDelete(req.params.id as string, { ownerId: req.user!.id });
      res.json(ok({ deleted: true }));
    } catch (err) {
      next(err);
    }
  },
);

notesRouter.post(
  '/:id/restore',
  requirePermissions(PERMISSIONS.NOTE_WRITE),
  audit('UPDATE', 'note'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      res.json(ok(await svc.restore(req.params.id as string, { ownerId: req.user!.id })));
    } catch (err) {
      next(err);
    }
  },
);

notesRouter.delete(
  '/:id/purge',
  requirePermissions(PERMISSIONS.NOTE_DELETE),
  audit('DELETE', 'note.purge'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      await svc.purge(req.params.id as string, { ownerId: req.user!.id });
      res.json(ok({ purged: true }));
    } catch (err) {
      next(err);
    }
  },
);

notesRouter.post(
  '/:id/toggle-pin',
  requirePermissions(PERMISSIONS.NOTE_WRITE),
  audit('UPDATE', 'note'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      res.json(ok(await svc.togglePin(req.params.id as string, { ownerId: req.user!.id })));
    } catch (err) {
      next(err);
    }
  },
);
