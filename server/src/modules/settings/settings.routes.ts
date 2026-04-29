import { Router } from 'express';
import { z } from 'zod';
import { ok, PERMISSIONS } from '@panggonmikir/shared';
import { authenticate } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';
import { audit } from '../../middleware/audit.js';
import { validate, getValidated } from '../../middleware/validate.js';
import { prisma } from '../../lib/prisma.js';

export const settingsRouter = Router();

settingsRouter.use(authenticate);

const upsertSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.unknown(),
});

settingsRouter.get(
  '/',
  requirePermissions(PERMISSIONS.SETTINGS_READ),
  async (_req, res, next) => {
    try {
      const settings = await prisma.setting.findMany({ orderBy: { key: 'asc' } });
      res.json(ok(settings));
    } catch (err) {
      next(err);
    }
  },
);

settingsRouter.get(
  '/:key',
  requirePermissions(PERMISSIONS.SETTINGS_READ),
  async (req, res, next) => {
    try {
      const setting = await prisma.setting.findUnique({ where: { key: req.params.key } });
      res.json(ok(setting));
    } catch (err) {
      next(err);
    }
  },
);

settingsRouter.put(
  '/',
  requirePermissions(PERMISSIONS.SETTINGS_WRITE),
  validate(upsertSchema),
  audit('UPDATE', 'setting'),
  async (req, res, next) => {
    try {
      const { key, value } = getValidated<{ key: string; value: unknown }>(req);
      const setting = await prisma.setting.upsert({
        where: { key },
        update: { value: value as any },
        create: { key, value: value as any },
      });
      res.json(ok(setting));
    } catch (err) {
      next(err);
    }
  },
);
