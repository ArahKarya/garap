import { Router } from 'express';
import {
  buildPagination,
  ok,
  paginationQuerySchema,
  toSkipTake,
} from '@panggonmikir/shared';
import { authenticate, type AuthenticatedRequest } from '../../middleware/auth.js';
import { validate, getValidated } from '../../middleware/validate.js';
import { prisma } from '../../lib/prisma.js';

export const notificationsRouter = Router();

notificationsRouter.use(authenticate);

notificationsRouter.get(
  '/',
  validate(paginationQuerySchema, 'query'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const q = getValidated<import('@panggonmikir/shared').PaginationQuery>(req, 'query');
      const { skip, take } = toSkipTake(q.page, q.limit);
      const where = { userId: req.user!.id };

      const [items, total, unread] = await Promise.all([
        prisma.notification.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
        prisma.notification.count({ where }),
        prisma.notification.count({ where: { ...where, readAt: null } }),
      ]);

      const result = buildPagination(items, total, q.page, q.limit);
      res.json(ok({ items: result.items, unread }, result.meta));
    } catch (err) {
      next(err);
    }
  },
);

notificationsRouter.post(
  '/:id/read',
  async (req: AuthenticatedRequest, res, next) => {
    try {
      await prisma.notification.updateMany({
        where: { id: req.params.id, userId: req.user!.id, readAt: null },
        data: { readAt: new Date() },
      });
      res.json(ok({ read: true }));
    } catch (err) {
      next(err);
    }
  },
);

notificationsRouter.post(
  '/read-all',
  async (req: AuthenticatedRequest, res, next) => {
    try {
      await prisma.notification.updateMany({
        where: { userId: req.user!.id, readAt: null },
        data: { readAt: new Date() },
      });
      res.json(ok({ read: true }));
    } catch (err) {
      next(err);
    }
  },
);
