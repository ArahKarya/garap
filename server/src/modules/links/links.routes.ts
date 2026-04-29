import { Router } from 'express';
import {
  ok,
  PERMISSIONS,
  createLinkSchema,
  updateLinkSchema,
  linkListQuerySchema,
  type CreateLinkInput,
  type UpdateLinkInput,
  type LinkListQuery,
} from '@panggonmikir/shared';
import { authenticate, type AuthenticatedRequest } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';
import { audit } from '../../middleware/audit.js';
import { validate, getValidated } from '../../middleware/validate.js';
import * as svc from './links.service.js';

export const linksRouter = Router();

linksRouter.use(authenticate);

linksRouter.get(
  '/',
  requirePermissions(PERMISSIONS.LINK_READ),
  validate(linkListQuerySchema, 'query'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const q = getValidated<LinkListQuery>(req, 'query');
      const result = await svc.list(q, { ownerId: req.user!.id });
      res.json(ok(result.items, result.meta));
    } catch (err) {
      next(err);
    }
  },
);

linksRouter.get(
  '/:id',
  requirePermissions(PERMISSIONS.LINK_READ),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      res.json(ok(await svc.get(req.params.id as string, { ownerId: req.user!.id })));
    } catch (err) {
      next(err);
    }
  },
);

linksRouter.post(
  '/',
  requirePermissions(PERMISSIONS.LINK_WRITE),
  validate(createLinkSchema),
  audit('CREATE', 'link'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const input = getValidated<CreateLinkInput>(req);
      const created = await svc.create(input, { ownerId: req.user!.id });
      res.status(201).json(ok(created));
    } catch (err) {
      next(err);
    }
  },
);

linksRouter.patch(
  '/:id',
  requirePermissions(PERMISSIONS.LINK_WRITE),
  validate(updateLinkSchema),
  audit('UPDATE', 'link'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const input = getValidated<UpdateLinkInput>(req);
      res.json(ok(await svc.update(req.params.id as string, input, { ownerId: req.user!.id })));
    } catch (err) {
      next(err);
    }
  },
);

linksRouter.delete(
  '/:id',
  requirePermissions(PERMISSIONS.LINK_DELETE),
  audit('DELETE', 'link'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      await svc.softDelete(req.params.id as string, { ownerId: req.user!.id });
      res.json(ok({ deleted: true }));
    } catch (err) {
      next(err);
    }
  },
);

linksRouter.post(
  '/:id/restore',
  requirePermissions(PERMISSIONS.LINK_WRITE),
  audit('UPDATE', 'link'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      res.json(ok(await svc.restore(req.params.id as string, { ownerId: req.user!.id })));
    } catch (err) {
      next(err);
    }
  },
);

linksRouter.delete(
  '/:id/purge',
  requirePermissions(PERMISSIONS.LINK_DELETE),
  audit('DELETE', 'link.purge'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      await svc.purge(req.params.id as string, { ownerId: req.user!.id });
      res.json(ok({ purged: true }));
    } catch (err) {
      next(err);
    }
  },
);

linksRouter.post(
  '/:id/visit',
  requirePermissions(PERMISSIONS.LINK_READ),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      res.json(ok(await svc.recordVisit(req.params.id as string, { ownerId: req.user!.id })));
    } catch (err) {
      next(err);
    }
  },
);

linksRouter.post(
  '/:id/refresh-metadata',
  requirePermissions(PERMISSIONS.LINK_WRITE),
  audit('UPDATE', 'link.metadata'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      res.json(ok(await svc.refreshMetadata(req.params.id as string, { ownerId: req.user!.id })));
    } catch (err) {
      next(err);
    }
  },
);
