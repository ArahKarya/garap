import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { ROLES, type AuthTokens, type AuthUser, type LoginInput, type RegisterInput } from '@garap/shared';
import { prisma } from '../../lib/prisma.js';
import {
  parseDurationToSeconds,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../lib/jwt.js';
import { UnauthorizedError, ConflictError, ForbiddenError } from '../../lib/errors.js';
import { env } from '../../config/env.js';
import { recordAudit } from '../../middleware/audit.js';

const hashRefreshToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

async function buildAuthUser(userId: string): Promise<AuthUser> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      roles: {
        include: { role: { include: { permissions: { include: { permission: true } } } } },
      },
    },
  });
  const roles = user.roles.map((ur) => ur.role.name);
  const permissions = Array.from(
    new Set(user.roles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.key))),
  );
  return { id: user.id, email: user.email, name: user.name, roles, permissions };
}

async function issueTokens(user: AuthUser, ip: string | null): Promise<AuthTokens> {
  const payload = { sub: user.id, email: user.email, roles: user.roles };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  const expiresAt = new Date(Date.now() + parseDurationToSeconds(env.JWT_REFRESH_EXPIRES_IN) * 1000);

  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash: hashRefreshToken(refreshToken), expiresAt },
  });
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  return {
    accessToken,
    refreshToken,
    expiresIn: parseDurationToSeconds(env.JWT_ACCESS_EXPIRES_IN),
  };
}

export async function login(input: LoginInput, ip: string | null, userAgent: string | null) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !user.isActive) {
    await recordAudit({
      userId: null,
      userEmail: input.email,
      action: 'LOGIN_FAILED',
      entity: 'auth',
      ip,
      userAgent,
      diff: null,
    });
    throw UnauthorizedError('Email atau password salah');
  }

  // passwordHash is nullable for Google-OAuth-only accounts — block local login.
  if (!user.passwordHash) {
    throw UnauthorizedError('Akun ini hanya bisa login lewat Google');
  }
  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) {
    await recordAudit({
      userId: user.id,
      userEmail: user.email,
      action: 'LOGIN_FAILED',
      entity: 'auth',
      ip,
      userAgent,
      diff: null,
    });
    throw UnauthorizedError('Email atau password salah');
  }

  const authUser = await buildAuthUser(user.id);
  const tokens = await issueTokens(authUser, ip);

  await recordAudit({
    userId: user.id,
    userEmail: user.email,
    action: 'LOGIN',
    entity: 'auth',
    ip,
    userAgent,
    diff: null,
  });

  return { user: authUser, tokens };
}

/**
 * Pendaftaran publik email/password (B2C). Hanya aktif saat PUBLIC_SIGNUP=true.
 * User pertama di sistem = SUPER_ADMIN (platform owner); selebihnya = MEMBER +
 * langganan FREE. Catatan: verifikasi email belum ada (TODO sebelum skala besar).
 */
export async function register(input: RegisterInput, ip: string | null, userAgent: string | null) {
  if (!env.PUBLIC_SIGNUP) {
    throw ForbiddenError('Pendaftaran sedang ditutup.');
  }
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw ConflictError('Email sudah terdaftar. Silakan masuk.');
  }

  const isFirstUser = (await prisma.user.count()) === 0;
  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.create({
    data: { email, name: input.name.trim(), passwordHash, isActive: true },
  });

  const roleName = isFirstUser ? ROLES.SUPER_ADMIN : ROLES.MEMBER;
  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (role) {
    await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
  }
  await prisma.subscription.create({ data: { userId: user.id } });

  const authUser = await buildAuthUser(user.id);
  const tokens = await issueTokens(authUser, ip);

  await recordAudit({
    userId: user.id,
    userEmail: user.email,
    action: 'CREATE',
    entity: 'auth.register',
    ip,
    userAgent,
    diff: null,
  });

  return { user: authUser, tokens };
}

export async function refresh(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw UnauthorizedError('Refresh token tidak valid');
  }

  const tokenHash = hashRefreshToken(refreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw UnauthorizedError('Refresh token kedaluwarsa');
  }

  // Rotate: revoke old, issue new
  await prisma.refreshToken.update({
    where: { tokenHash },
    data: { revokedAt: new Date() },
  });

  const authUser = await buildAuthUser(payload.sub);
  const tokens = await issueTokens(authUser, null);
  return { user: authUser, tokens };
}

export async function logout(refreshToken: string) {
  const tokenHash = hashRefreshToken(refreshToken);
  await prisma.refreshToken
    .update({ where: { tokenHash }, data: { revokedAt: new Date() } })
    .catch(() => undefined);
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.passwordHash) {
    throw UnauthorizedError('Akun ini tidak punya password lokal — pakai Google login');
  }
  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) throw UnauthorizedError('Password saat ini salah');
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function me(userId: string) {
  return buildAuthUser(userId);
}
