import { Router } from 'express';
import {
  ok,
  PLAN_CATALOG,
  PLAN_LIMITS,
  PERMISSIONS,
  SUBSCRIPTION_STATUS,
  type PlanKey,
} from '@garap/shared';
import { authenticate, type AuthenticatedRequest } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';
import { audit } from '../../middleware/audit.js';
import { prisma } from '../../lib/prisma.js';
import { ValidationError, NotFoundError } from '../../lib/errors.js';
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

/**
 * Aktivasi paket MANUAL oleh admin (mis. setelah pelanggan transfer bank).
 * Jalur komersialisasi tanpa payment gateway — cocok untuk MVP pasar Indonesia.
 * Hanya admin (punya user:write). Body: { email, planKey, days? }.
 */
billingRouter.post(
  '/grant',
  requirePermissions(PERMISSIONS.USER_WRITE),
  audit('UPDATE', 'billing.grant'),
  async (req, res, next) => {
    try {
      const email = String(req.body?.email ?? '').trim().toLowerCase();
      const planKey = String(req.body?.planKey ?? '') as PlanKey;
      const days = Number.isFinite(Number(req.body?.days)) ? Number(req.body.days) : 30;
      if (!email) throw ValidationError('email wajib diisi');
      if (!(planKey in PLAN_LIMITS)) throw ValidationError('planKey tidak valid');

      const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (!user) throw NotFoundError('User', email);

      const periodEnd =
        planKey === 'FREE' ? null : new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      const sub = await prisma.subscription.upsert({
        where: { userId: user.id },
        update: { planKey, status: SUBSCRIPTION_STATUS.ACTIVE, currentPeriodEnd: periodEnd },
        create: {
          userId: user.id,
          planKey,
          status: SUBSCRIPTION_STATUS.ACTIVE,
          currentPeriodEnd: periodEnd,
        },
      });
      res.json(ok({ email, planKey: sub.planKey, currentPeriodEnd: sub.currentPeriodEnd }));
    } catch (err) {
      next(err);
    }
  },
);
