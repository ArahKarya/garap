import { Router } from 'express';
import {
  ok,
  PERMISSIONS,
  createReferenceSchema,
  updateReferenceSchema,
  referenceListQuerySchema,
  type CreateReferenceInput,
  type UpdateReferenceInput,
  type ReferenceListQuery,
} from '@garap/shared';
import { authenticate, type AuthenticatedRequest } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';
import { audit } from '../../middleware/audit.js';
import { validate, getValidated } from '../../middleware/validate.js';
import * as svc from './references.service.js';

export const referencesRouter = Router();

referencesRouter.use(authenticate);

referencesRouter.get(
  '/',
  requirePermissions(PERMISSIONS.REFERENCE_READ),
  validate(referenceListQuerySchema, 'query'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const q = getValidated<ReferenceListQuery>(req, 'query');
      const result = await svc.list(q, { ownerId: req.user!.id });
      res.json(ok(result.items, result.meta));
    } catch (err) {
      next(err);
    }
  },
);

referencesRouter.get(
  '/:id',
  requirePermissions(PERMISSIONS.REFERENCE_READ),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      res.json(ok(await svc.get(req.params.id as string, { ownerId: req.user!.id })));
    } catch (err) {
      next(err);
    }
  },
);

referencesRouter.post(
  '/',
  requirePermissions(PERMISSIONS.REFERENCE_WRITE),
  validate(createReferenceSchema),
  audit('CREATE', 'reference'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const input = getValidated<CreateReferenceInput>(req);
      const created = await svc.create(input, { ownerId: req.user!.id });
      res.status(201).json(ok(created));
    } catch (err) {
      next(err);
    }
  },
);

referencesRouter.patch(
  '/:id',
  requirePermissions(PERMISSIONS.REFERENCE_WRITE),
  validate(updateReferenceSchema),
  audit('UPDATE', 'reference'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const input = getValidated<UpdateReferenceInput>(req);
      res.json(ok(await svc.update(req.params.id as string, input, { ownerId: req.user!.id })));
    } catch (err) {
      next(err);
    }
  },
);

referencesRouter.delete(
  '/:id',
  requirePermissions(PERMISSIONS.REFERENCE_DELETE),
  audit('DELETE', 'reference'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      await svc.softDelete(req.params.id as string, { ownerId: req.user!.id });
      res.json(ok({ deleted: true }));
    } catch (err) {
      next(err);
    }
  },
);

referencesRouter.post(
  '/:id/restore',
  requirePermissions(PERMISSIONS.REFERENCE_WRITE),
  audit('UPDATE', 'reference'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      res.json(ok(await svc.restore(req.params.id as string, { ownerId: req.user!.id })));
    } catch (err) {
      next(err);
    }
  },
);

referencesRouter.delete(
  '/:id/purge',
  requirePermissions(PERMISSIONS.REFERENCE_DELETE),
  audit('DELETE', 'reference.purge'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      await svc.purge(req.params.id as string, { ownerId: req.user!.id });
      res.json(ok({ purged: true }));
    } catch (err) {
      next(err);
    }
  },
);
