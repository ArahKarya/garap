import { Router } from 'express';
import { ok, PLAN_CATALOG, PLAN_LIMITS, type PlanKey } from '@garap/shared';
import { authenticate, type AuthenticatedRequest } from '../../middleware/auth.js';
import { resolvePlanKey, getUsage } from '../../lib/quota.js';

/**
 * Billing (B2C) — fondasi komersialisasi. Saat ini READ-ONLY: lihat paket aktif,
 * pemakaian, dan katalog paket. Checkout/upgrade berbayar ditambahkan saat payment
 * provider (Stripe/Paddle/LemonSqueezy) dipasang — lihat docs/COMMERCIALIZATION.md.
 */
export const billingRouter = Router();

billingRouter.use(authenticate);

// Katalog paket + limit-nya (untuk halaman upgrade).
billingRouter.get('/plans', (_req, res) => {
  const plans = (Object.keys(PLAN_CATALOG) as PlanKey[]).map((key) => ({
    ...PLAN_CATALOG[key],
    limits: PLAN_LIMITS[key],
  }));
  res.json(ok(plans));
});

// Paket aktif + pemakaian user saat ini.
billingRouter.get('/me', async (req: AuthenticatedRequest, res, next) => {
  try {
    const ownerId = req.user!.id;
    const planKey = await resolvePlanKey(ownerId);
    const usage = await getUsage(ownerId);
    res.json(
      ok({
        plan: PLAN_CATALOG[planKey],
        limits: PLAN_LIMITS[planKey],
        usage,
      }),
    );
  } catch (err) {
    next(err);
  }
});
