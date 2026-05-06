import { Router } from 'express';
import { ok } from '@panggonmikir/shared';
import { authenticate, type AuthenticatedRequest } from '../../middleware/auth.js';
import * as svc from './dashboard.service.js';

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);

dashboardRouter.get('/summary', async (req: AuthenticatedRequest, res, next) => {
  try {
    const workspaceId =
      typeof req.query.workspaceId === 'string' && req.query.workspaceId.length > 0
        ? req.query.workspaceId
        : undefined;
    const result = await svc.summary({ ownerId: req.user!.id, workspaceId });
    res.json(ok(result));
  } catch (err) {
    next(err);
  }
});
