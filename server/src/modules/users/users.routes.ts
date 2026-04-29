import { Router } from 'express';
import {
  createUserSchema,
  ok,
  paginationQuerySchema,
  PERMISSIONS,
  resetPasswordSchema,
  updateUserSchema,
} from '@panggonmikir/shared';
import { authenticate } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';
import { audit } from '../../middleware/audit.js';
import { validate, getValidated } from '../../middleware/validate.js';
import * as svc from './users.service.js';

export const usersRouter = Router();

usersRouter.use(authenticate);

usersRouter.get(
  '/',
  requirePermissions(PERMISSIONS.USER_READ),
  validate(paginationQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const q = getValidated<import('@panggonmikir/shared').PaginationQuery>(req, 'query');
      const result = await svc.list(q);
      res.json(ok(result.items, result.meta));
    } catch (err) {
      next(err);
    }
  },
);

usersRouter.get(
  '/:id',
  requirePermissions(PERMISSIONS.USER_READ),
  async (req, res, next) => {
    try {
      const user = await svc.get(req.params.id as string);
      res.json(ok(user));
    } catch (err) {
      next(err);
    }
  },
);

usersRouter.post(
  '/',
  requirePermissions(PERMISSIONS.USER_WRITE),
  validate(createUserSchema),
  audit('CREATE', 'user'),
  async (req, res, next) => {
    try {
      const input = getValidated<import('@panggonmikir/shared').CreateUserInput>(req);
      const user = await svc.create(input);
      res.status(201).json(ok(user));
    } catch (err) {
      next(err);
    }
  },
);

usersRouter.patch(
  '/:id',
  requirePermissions(PERMISSIONS.USER_WRITE),
  validate(updateUserSchema),
  audit('UPDATE', 'user'),
  async (req, res, next) => {
    try {
      const input = getValidated<import('@panggonmikir/shared').UpdateUserInput>(req);
      const user = await svc.update(req.params.id as string, input);
      res.json(ok(user));
    } catch (err) {
      next(err);
    }
  },
);

usersRouter.delete(
  '/:id',
  requirePermissions(PERMISSIONS.USER_DELETE),
  audit('DELETE', 'user'),
  async (req, res, next) => {
    try {
      await svc.remove(req.params.id as string);
      res.json(ok({ deleted: true }));
    } catch (err) {
      next(err);
    }
  },
);

usersRouter.post(
  '/:id/reset-password',
  requirePermissions(PERMISSIONS.USER_WRITE),
  validate(resetPasswordSchema),
  audit('UPDATE', 'user.password'),
  async (req, res, next) => {
    try {
      const input = getValidated<{ newPassword: string }>(req);
      await svc.resetPassword(req.params.id as string, input.newPassword);
      res.json(ok({ reset: true }));
    } catch (err) {
      next(err);
    }
  },
);
