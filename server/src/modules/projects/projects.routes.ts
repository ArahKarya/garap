import { Router } from 'express';
import {
  ok,
  PERMISSIONS,
  createProjectSchema,
  updateProjectSchema,
  projectListQuerySchema,
  type CreateProjectInput,
  type UpdateProjectInput,
  type ProjectListQuery,
} from '@garap/shared';
import { authenticate, type AuthenticatedRequest } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';
import { audit } from '../../middleware/audit.js';
import { validate, getValidated } from '../../middleware/validate.js';
import * as svc from './projects.service.js';

export const projectsRouter = Router();

projectsRouter.use(authenticate);

projectsRouter.get(
  '/',
  requirePermissions(PERMISSIONS.PROJECT_READ),
  validate(projectListQuerySchema, 'query'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const q = getValidated<ProjectListQuery>(req, 'query');
      const result = await svc.list(q, { ownerId: req.user!.id });
      res.json(ok(result.items, result.meta));
    } catch (err) {
      next(err);
    }
  },
);

projectsRouter.get(
  '/:id',
  requirePermissions(PERMISSIONS.PROJECT_READ),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      res.json(ok(await svc.get(req.params.id as string, { ownerId: req.user!.id })));
    } catch (err) {
      next(err);
    }
  },
);

projectsRouter.post(
  '/',
  requirePermissions(PERMISSIONS.PROJECT_WRITE),
  validate(createProjectSchema),
  audit('CREATE', 'project'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const input = getValidated<CreateProjectInput>(req);
      const created = await svc.create(input, { ownerId: req.user!.id });
      res.status(201).json(ok(created));
    } catch (err) {
      next(err);
    }
  },
);

projectsRouter.patch(
  '/:id',
  requirePermissions(PERMISSIONS.PROJECT_WRITE),
  validate(updateProjectSchema),
  audit('UPDATE', 'project'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const input = getValidated<UpdateProjectInput>(req);
      res.json(ok(await svc.update(req.params.id as string, input, { ownerId: req.user!.id })));
    } catch (err) {
      next(err);
    }
  },
);

projectsRouter.delete(
  '/:id',
  requirePermissions(PERMISSIONS.PROJECT_DELETE),
  audit('DELETE', 'project'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      await svc.softDelete(req.params.id as string, { ownerId: req.user!.id });
      res.json(ok({ deleted: true }));
    } catch (err) {
      next(err);
    }
  },
);

projectsRouter.post(
  '/:id/restore',
  requirePermissions(PERMISSIONS.PROJECT_WRITE),
  audit('UPDATE', 'project'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      res.json(ok(await svc.restore(req.params.id as string, { ownerId: req.user!.id })));
    } catch (err) {
      next(err);
    }
  },
);

projectsRouter.delete(
  '/:id/purge',
  requirePermissions(PERMISSIONS.PROJECT_DELETE),
  audit('DELETE', 'project.purge'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      await svc.purge(req.params.id as string, { ownerId: req.user!.id });
      res.json(ok({ purged: true }));
    } catch (err) {
      next(err);
    }
  },
);
