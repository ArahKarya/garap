import type { RequestHandler } from 'express';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import type { AuthenticatedRequest } from './auth.js';

export interface AuditContext {
  action: string;
  entity: string;
  entityId?: string;
  diff?: unknown;
}

export const audit =
  (action: string, entity: string): RequestHandler =>
  (req: AuthenticatedRequest, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = ((body: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const entityId =
          body?.data?.id ??
          (req.params as Record<string, string | undefined>).id ??
          undefined;
        recordAudit({
          userId: req.user?.id ?? null,
          userEmail: req.user?.email ?? null,
          action,
          entity,
          entityId,
          ip: req.ip ?? null,
          userAgent: req.headers['user-agent'] ?? null,
          diff: req.method === 'GET' ? null : req.body ?? null,
        }).catch((err) => logger.error({ err }, 'audit log failed'));
      }
      return originalJson(body);
    }) as typeof res.json;
    next();
  };

export async function recordAudit(entry: {
  userId: string | null;
  userEmail: string | null;
  action: string;
  entity: string;
  entityId?: string;
  ip: string | null;
  userAgent: string | null;
  diff: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      userId: entry.userId,
      userEmail: entry.userEmail,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      ip: entry.ip,
      userAgent: entry.userAgent,
      diff: entry.diff as any,
    },
  });
}
