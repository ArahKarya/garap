import type { RequestHandler } from 'express';
import type { Permission, RoleName } from '@garap/shared';
import { ROLES } from '@garap/shared';
import { ForbiddenError, UnauthorizedError } from '../lib/errors.js';
import type { AuthenticatedRequest } from './auth.js';

export const requireRoles =
  (...roles: RoleName[]): RequestHandler =>
  (req: AuthenticatedRequest, _res, next) => {
    if (!req.user) return next(UnauthorizedError());
    if (req.user.roles.includes(ROLES.SUPER_ADMIN)) return next();
    const ok = roles.some((r) => req.user!.roles.includes(r));
    if (!ok) return next(ForbiddenError(`Butuh role: ${roles.join(', ')}`));
    next();
  };

export const requirePermissions =
  (...permissions: Permission[]): RequestHandler =>
  (req: AuthenticatedRequest, _res, next) => {
    if (!req.user) return next(UnauthorizedError());
    if (req.user.roles.includes(ROLES.SUPER_ADMIN)) return next();
    const ok = permissions.every((p) => req.user!.permissions.includes(p));
    if (!ok) return next(ForbiddenError(`Butuh permission: ${permissions.join(', ')}`));
    next();
  };
