import { Router } from 'express';
import { ok, PERMISSIONS } from '@panggonmikir/shared';
import { authenticate } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';
import { prisma } from '../../lib/prisma.js';

export const rolesRouter = Router();

rolesRouter.use(authenticate);

rolesRouter.get('/', requirePermissions(PERMISSIONS.ROLE_READ), async (_req, res, next) => {
  try {
    const roles = await prisma.role.findMany({
      include: { permissions: { include: { permission: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(ok(roles));
  } catch (err) {
    next(err);
  }
});

rolesRouter.get(
  '/permissions',
  requirePermissions(PERMISSIONS.ROLE_READ),
  async (_req, res, next) => {
    try {
      const permissions = await prisma.permission.findMany({ orderBy: { key: 'asc' } });
      res.json(ok(permissions));
    } catch (err) {
      next(err);
    }
  },
);
