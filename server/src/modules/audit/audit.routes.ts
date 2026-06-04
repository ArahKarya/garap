import { Router } from 'express';
import {
  auditLogQuerySchema,
  buildPagination,
  ok,
  PERMISSIONS,
  toSkipTake,
} from '@garap/shared';
import { authenticate } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';
import { validate, getValidated } from '../../middleware/validate.js';
import { prisma } from '../../lib/prisma.js';

export const auditRouter = Router();

auditRouter.use(authenticate);

auditRouter.get(
  '/',
  requirePermissions(PERMISSIONS.AUDIT_READ),
  validate(auditLogQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const q = getValidated<import('@garap/shared').AuditLogQuery>(req, 'query');
      const { skip, take } = toSkipTake(q.page, q.limit);
      const where: any = {};
      if (q.userId) where.userId = q.userId;
      if (q.action) where.action = q.action;
      if (q.entity) where.entity = q.entity;
      if (q.from || q.to) {
        where.createdAt = {};
        if (q.from) where.createdAt.gte = new Date(q.from);
        if (q.to) where.createdAt.lte = new Date(q.to);
      }

      const [items, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: q.sortOrder },
        }),
        prisma.auditLog.count({ where }),
      ]);

      const result = buildPagination(items, total, q.page, q.limit);
      res.json(ok(result.items, result.meta));
    } catch (err) {
      next(err);
    }
  },
);
