import { Router } from 'express';
import {
  ok,
  PERMISSIONS,
  createTagSchema,
  updateTagSchema,
  attachTagSchema,
  tagListQuerySchema,
  taggedEntityQuerySchema,
  type CreateTagInput,
  type UpdateTagInput,
  type AttachTagInput,
  type TagListQuery,
  type TaggedEntityQuery,
} from '@panggonmikir/shared';
import { authenticate, type AuthenticatedRequest } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';
import { audit } from '../../middleware/audit.js';
import { validate, getValidated } from '../../middleware/validate.js';
import * as svc from './tags.service.js';

export const tagsRouter = Router();

tagsRouter.use(authenticate);

tagsRouter.get(
  '/',
  requirePermissions(PERMISSIONS.TAG_READ),
  validate(tagListQuerySchema, 'query'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const q = getValidated<TagListQuery>(req, 'query');
      const items = await svc.list(q, { ownerId: req.user!.id });
      res.json(ok(items));
    } catch (err) {
      next(err);
    }
  },
);

tagsRouter.get(
  '/:id/entities',
  requirePermissions(PERMISSIONS.TAG_READ),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const tagId = req.params.id as string;
      const workspaceId =
        typeof req.query.workspaceId === 'string' && req.query.workspaceId.length > 0
          ? req.query.workspaceId
          : undefined;
      const result = await svc.entitiesForTag(tagId, { ownerId: req.user!.id }, workspaceId);
      res.json(ok(result));
    } catch (err) {
      next(err);
    }
  },
);

tagsRouter.get(
  '/by-entity',
  requirePermissions(PERMISSIONS.TAG_READ),
  validate(taggedEntityQuerySchema, 'query'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const q = getValidated<TaggedEntityQuery>(req, 'query');
      const tags = await svc.listForEntity(q.entityType, q.entityId, { ownerId: req.user!.id });
      res.json(ok(tags));
    } catch (err) {
      next(err);
    }
  },
);

tagsRouter.post(
  '/',
  requirePermissions(PERMISSIONS.TAG_WRITE),
  validate(createTagSchema),
  audit('CREATE', 'tag'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const input = getValidated<CreateTagInput>(req);
      res.status(201).json(ok(await svc.create(input, { ownerId: req.user!.id })));
    } catch (err) {
      next(err);
    }
  },
);

tagsRouter.patch(
  '/:id',
  requirePermissions(PERMISSIONS.TAG_WRITE),
  validate(updateTagSchema),
  audit('UPDATE', 'tag'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const input = getValidated<UpdateTagInput>(req);
      res.json(ok(await svc.update(req.params.id as string, input, { ownerId: req.user!.id })));
    } catch (err) {
      next(err);
    }
  },
);

tagsRouter.delete(
  '/:id',
  requirePermissions(PERMISSIONS.TAG_WRITE),
  audit('DELETE', 'tag'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      await svc.remove(req.params.id as string, { ownerId: req.user!.id });
      res.json(ok({ deleted: true }));
    } catch (err) {
      next(err);
    }
  },
);

tagsRouter.post(
  '/attach',
  requirePermissions(PERMISSIONS.TAG_WRITE),
  validate(attachTagSchema),
  audit('UPDATE', 'tag.attach'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const input = getValidated<AttachTagInput>(req);
      res.json(ok(await svc.attach(input, { ownerId: req.user!.id })));
    } catch (err) {
      next(err);
    }
  },
);

tagsRouter.post(
  '/detach',
  requirePermissions(PERMISSIONS.TAG_WRITE),
  validate(attachTagSchema),
  audit('UPDATE', 'tag.detach'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const input = getValidated<AttachTagInput>(req);
      await svc.detach(input, { ownerId: req.user!.id });
      res.json(ok({ detached: true }));
    } catch (err) {
      next(err);
    }
  },
);
