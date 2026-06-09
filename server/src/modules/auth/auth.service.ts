import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { ROLES, type AuthTokens, type AuthUser, type LoginInput, type RegisterInput } from '@garap/shared';
import { prisma } from '../../lib/prisma.js';
import {
  parseDurationToSeconds,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../lib/jwt.js';
import { UnauthorizedError, ConflictError, ForbiddenError, InternalError } from '../../lib/errors.js';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { recordAudit } from '../../middleware/audit.js';
import { createAndSendVerification } from './verification.service.js';

/**
 * Hasil register. Bentuk berbeda tergantung REQUIRE_EMAIL_VERIFICATION:
 *  - false → auto-login: { user, tokens, requiresVerification: false }
 *  - true  → tanpa login: { requiresVerification: true, email }
 * Client mengandalkan flag `requiresVerification` untuk menentukan UX berikutnya.
 */
export type RegisterResult =
  | { requiresVerification: false; user: AuthUser; tokens: AuthTokens }
  | { requiresVerification: true; email: string };

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

  // Gating verifikasi email (jalur email/password). User Google (tanpa passwordHash)
  // dan user yang sudah verified tidak terpengaruh. Cek SEBELUM issue tokens.
  if (env.REQUIRE_EMAIL_VERIFICATION && user.passwordHash && !user.emailVerifiedAt) {
    throw ForbiddenError('Email belum diverifikasi. Cek inbox atau kirim ulang.');
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
export async function register(
  input: RegisterInput,
  ip: string | null,
  userAgent: string | null,
): Promise<RegisterResult> {
  if (!env.PUBLIC_SIGNUP) {
    throw ForbiddenError('Pendaftaran sedang ditutup.');
  }
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw ConflictError('Email sudah terdaftar. Silakan masuk.');
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  // Bungkus penentuan "user pertama → SUPER_ADMIN", create user, assign role, dan
  // create subscription dalam satu transaksi Serializable. Dua signup bersamaan
  // yang sama-sama melihat tabel kosong akan saling konflik → hanya satu yang lolos
  // jadi SUPER_ADMIN; dan semua langkah commit bersama (tak ada user tanpa role/sub).
  const user = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const isFirstUser = (await tx.user.count()) === 0;
      const created = await tx.user.create({
        data: { email, name: input.name.trim(), passwordHash, isActive: true },
      });

      const roleName = isFirstUser ? ROLES.SUPER_ADMIN : ROLES.MEMBER;
      const role = await tx.role.findUnique({ where: { name: roleName } });
      if (!role) {
        throw InternalError(`Role "${roleName}" tidak ditemukan — jalankan seed terlebih dahulu`);
      }
      await tx.userRole.create({ data: { userId: created.id, roleId: role.id } });
      await tx.subscription.create({ data: { userId: created.id } });

      return created;
    },
    { isolationLevel: 'Serializable' },
  );

  await recordAudit({
    userId: user.id,
    userEmail: user.email,
    action: 'CREATE',
    entity: 'auth.register',
    ip,
    userAgent,
    diff: null,
  });

  // Kirim email verifikasi DI LUAR transaksi create-user agar kegagalan pengiriman
  // email tak menggagalkan pembuatan akun. Bungkus try/catch — error email di-log
  // saja, register tetap sukses (di mode fallback, link ter-log oleh sendEmail).
  try {
    await createAndSendVerification({ id: user.id, email: user.email, name: user.name });
  } catch (err: unknown) {
    logger.error({ err, userId: user.id }, '[register] gagal mengirim email verifikasi');
  }

  // Saat verifikasi diwajibkan, JANGAN auto-login: client harus menunggu user
  // klik link verifikasi sebelum bisa login.
  if (env.REQUIRE_EMAIL_VERIFICATION) {
    return { requiresVerification: true, email: user.email };
  }

  const authUser = await buildAuthUser(user.id);
  const tokens = await issueTokens(authUser, ip);

  return { requiresVerification: false, user: authUser, tokens };
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
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function me(userId: string) {
  return buildAuthUser(userId);
}
