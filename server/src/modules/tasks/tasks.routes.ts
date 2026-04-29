import { Router } from 'express';
import {
  ok,
  PERMISSIONS,
  createTaskSchema,
  updateTaskSchema,
  taskListQuerySchema,
  type CreateTaskInput,
  type UpdateTaskInput,
  type TaskListQuery,
} from '@panggonmikir/shared';
import { authenticate, type AuthenticatedRequest } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';
import { audit } from '../../middleware/audit.js';
import { validate, getValidated } from '../../middleware/validate.js';
import * as svc from './tasks.service.js';

export const tasksRouter = Router();

tasksRouter.use(authenticate);

tasksRouter.get(
  '/',
  requirePermissions(PERMISSIONS.TASK_READ),
  validate(taskListQuerySchema, 'query'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const q = getValidated<TaskListQuery>(req, 'query');
      const result = await svc.list(q, { ownerId: req.user!.id });
      res.json(ok(result.items, result.meta));
    } catch (err) {
      next(err);
    }
  },
);

tasksRouter.get(
  '/:id',
  requirePermissions(PERMISSIONS.TASK_READ),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      res.json(ok(await svc.get(req.params.id, { ownerId: req.user!.id })));
    } catch (err) {
      next(err);
    }
  },
);

tasksRouter.post(
  '/',
  requirePermissions(PERMISSIONS.TASK_WRITE),
  validate(createTaskSchema),
  audit('CREATE', 'task'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const input = getValidated<CreateTaskInput>(req);
      const created = await svc.create(input, { ownerId: req.user!.id });
      res.status(201).json(ok(created));
    } catch (err) {
      next(err);
    }
  },
);

tasksRouter.patch(
  '/:id',
  requirePermissions(PERMISSIONS.TASK_WRITE),
  validate(updateTaskSchema),
  audit('UPDATE', 'task'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const input = getValidated<UpdateTaskInput>(req);
      res.json(ok(await svc.update(req.params.id, input, { ownerId: req.user!.id })));
    } catch (err) {
      next(err);
    }
  },
);

tasksRouter.delete(
  '/:id',
  requirePermissions(PERMISSIONS.TASK_DELETE),
  audit('DELETE', 'task'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      await svc.softDelete(req.params.id, { ownerId: req.user!.id });
      res.json(ok({ deleted: true }));
    } catch (err) {
      next(err);
    }
  },
);

tasksRouter.post(
  '/:id/restore',
  requirePermissions(PERMISSIONS.TASK_WRITE),
  audit('UPDATE', 'task'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      res.json(ok(await svc.restore(req.params.id, { ownerId: req.user!.id })));
    } catch (err) {
      next(err);
    }
  },
);

tasksRouter.delete(
  '/:id/purge',
  requirePermissions(PERMISSIONS.TASK_DELETE),
  audit('DELETE', 'task.purge'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      await svc.purge(req.params.id, { ownerId: req.user!.id });
      res.json(ok({ purged: true }));
    } catch (err) {
      next(err);
    }
  },
);

tasksRouter.post(
  '/:id/complete',
  requirePermissions(PERMISSIONS.TASK_WRITE),
  audit('UPDATE', 'task'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      res.json(ok(await svc.toggleComplete(req.params.id, { ownerId: req.user!.id })));
    } catch (err) {
      next(err);
    }
  },
);
