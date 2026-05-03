import { Router } from 'express';
import {
  ok,
  PERMISSIONS,
  createWorkspaceSchema,
  updateWorkspaceSchema,
  workspaceListQuerySchema,
  type CreateWorkspaceInput,
  type UpdateWorkspaceInput,
  type WorkspaceListQuery,
} from '@panggonmikir/shared';
import { authenticate, type AuthenticatedRequest } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';
import { audit } from '../../middleware/audit.js';
import { validate, getValidated } from '../../middleware/validate.js';
import * as svc from './workspaces.service.js';

export const workspacesRouter = Router();

workspacesRouter.use(authenticate);

workspacesRouter.get(
  '/',
  requirePermissions(PERMISSIONS.WORKSPACE_READ),
  validate(workspaceListQuerySchema, 'query'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const q = getValidated<WorkspaceListQuery>(req, 'query');
      await svc.ensureDefaultWorkspace(req.user!.id);
      const items = await svc.list(q, { ownerId: req.user!.id });
      res.json(ok(items));
    } catch (err) {
      next(err);
    }
  },
);

workspacesRouter.get(
  '/:id',
  requirePermissions(PERMISSIONS.WORKSPACE_READ),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      res.json(ok(await svc.get(req.params.id as string, { ownerId: req.user!.id })));
    } catch (err) {
      next(err);
    }
  },
);

workspacesRouter.post(
  '/',
  requirePermissions(PERMISSIONS.WORKSPACE_WRITE),
  validate(createWorkspaceSchema),
  audit('CREATE', 'workspace'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const input = getValidated<CreateWorkspaceInput>(req);
      const created = await svc.create(input, { ownerId: req.user!.id });
      res.status(201).json(ok(created));
    } catch (err) {
      next(err);
    }
  },
);

workspacesRouter.patch(
  '/:id',
  requirePermissions(PERMISSIONS.WORKSPACE_WRITE),
  validate(updateWorkspaceSchema),
  audit('UPDATE', 'workspace'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const input = getValidated<UpdateWorkspaceInput>(req);
      res.json(ok(await svc.update(req.params.id as string, input, { ownerId: req.user!.id })));
    } catch (err) {
      next(err);
    }
  },
);

workspacesRouter.delete(
  '/:id',
  requirePermissions(PERMISSIONS.WORKSPACE_DELETE),
  audit('DELETE', 'workspace'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      await svc.softDelete(req.params.id as string, { ownerId: req.user!.id });
      res.json(ok({ deleted: true }));
    } catch (err) {
      next(err);
    }
  },
);

workspacesRouter.delete(
  '/:id/purge',
  requirePermissions(PERMISSIONS.WORKSPACE_DELETE),
  audit('DELETE', 'workspace.purge'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      await svc.purge(req.params.id as string, { ownerId: req.user!.id });
      res.json(ok({ purged: true }));
    } catch (err) {
      next(err);
    }
  },
);

workspacesRouter.post(
  '/:id/restore',
  requirePermissions(PERMISSIONS.WORKSPACE_WRITE),
  audit('UPDATE', 'workspace'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      res.json(ok(await svc.restore(req.params.id as string, { ownerId: req.user!.id })));
    } catch (err) {
      next(err);
    }
  },
);

workspacesRouter.post(
  '/:id/archive',
  requirePermissions(PERMISSIONS.WORKSPACE_WRITE),
  audit('UPDATE', 'workspace'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      res.json(ok(await svc.archive(req.params.id as string, { ownerId: req.user!.id })));
    } catch (err) {
      next(err);
    }
  },
);

workspacesRouter.post(
  '/:id/unarchive',
  requirePermissions(PERMISSIONS.WORKSPACE_WRITE),
  audit('UPDATE', 'workspace'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      res.json(ok(await svc.unarchive(req.params.id as string, { ownerId: req.user!.id })));
    } catch (err) {
      next(err);
    }
  },
);

workspacesRouter.post(
  '/:id/set-default',
  requirePermissions(PERMISSIONS.WORKSPACE_WRITE),
  audit('UPDATE', 'workspace'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      res.json(ok(await svc.setDefault(req.params.id as string, { ownerId: req.user!.id })));
    } catch (err) {
      next(err);
    }
  },
);
