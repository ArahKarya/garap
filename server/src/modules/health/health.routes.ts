import { Router } from 'express';
import { ok } from '@panggonmikir/shared';
import { prisma } from '../../lib/prisma.js';
import { redis } from '../../lib/redis.js';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  const checks = {
    db: 'unknown',
    redis: 'unknown',
  };
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = 'ok';
  } catch {
    checks.db = 'down';
  }
  try {
    await redis.ping();
    checks.redis = 'ok';
  } catch {
    checks.redis = 'down';
  }
  const healthy = Object.values(checks).every((v) => v === 'ok');
  res.status(healthy ? 200 : 503).json(ok({ status: healthy ? 'healthy' : 'degraded', checks }));
});
