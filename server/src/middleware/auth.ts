import type { Request, RequestHandler } from 'express';
import type { AuthUser } from '@panggonmikir/shared';
import { UnauthorizedError } from '../lib/errors.js';
import { verifyAccessToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export const authenticate: RequestHandler = async (req: AuthenticatedRequest, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw UnauthorizedError('Token tidak ditemukan');
    }
    const token = header.slice(7);
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
      },
    });

    if (!user || !user.isActive) {
      throw UnauthorizedError('User tidak aktif atau tidak ditemukan');
    }

    const roles = user.roles.map((ur) => ur.role.name);
    const permissions = Array.from(
      new Set(
        user.roles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.key)),
      ),
    );

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      roles,
      permissions,
    };
    next();
  } catch (err) {
    next(err instanceof Error && err.name === 'JsonWebTokenError' ? UnauthorizedError('Token tidak valid') : err);
  }
};

export const optionalAuth: RequestHandler = async (req: AuthenticatedRequest, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next();
    return;
  }
  authenticate(req, _res, next);
};
