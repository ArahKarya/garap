import crypto from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import type { Prisma } from '@prisma/client';
import { ROLES } from '@garap/shared';
import { prisma } from '../../lib/prisma.js';
import { env, allowedEmails } from '../../config/env.js';
import { ForbiddenError, UnauthorizedError, InternalError } from '../../lib/errors.js';
import {
  parseDurationToSeconds,
  signAccessToken,
  signRefreshToken,
} from '../../lib/jwt.js';
import { recordAudit } from '../../middleware/audit.js';
import type { AuthTokens, AuthUser } from '@garap/shared';

const client = new OAuth2Client({
  clientId: env.GOOGLE_CLIENT_ID,
  clientSecret: env.GOOGLE_CLIENT_SECRET,
  redirectUri: env.GOOGLE_REDIRECT_URI,
});

const hashRefreshToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  emailVerified: boolean;
}

async function verifyIdToken(idToken: string): Promise<GoogleProfile> {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email) {
    throw UnauthorizedError('Token Google tidak valid');
  }
  return {
    sub: payload.sub,
    email: payload.email.toLowerCase(),
    name: payload.name ?? payload.email,
    picture: payload.picture,
    emailVerified: payload.email_verified ?? false,
  };
}

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

async function issueTokens(user: AuthUser): Promise<AuthTokens> {
  const payload = { sub: user.id, email: user.email, roles: user.roles };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  const expiresAt = new Date(
    Date.now() + parseDurationToSeconds(env.JWT_REFRESH_EXPIRES_IN) * 1000,
  );

  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash: hashRefreshToken(refreshToken), expiresAt },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: parseDurationToSeconds(env.JWT_ACCESS_EXPIRES_IN),
  };
}

/** Build the Google consent URL the client should redirect to. */
export function buildAuthUrl(state?: string): string {
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    state,
    prompt: 'select_account',
  });
}

/**
 * Verify a Google id_token (sent by client-side Google Sign-In) or exchange
 * an authorization code (server-side flow), then upsert local user, issue
 * platform JWT access+refresh tokens, and audit the login.
 *
 * Pass either `idToken` OR `code`, not both.
 */
export async function loginWithGoogle(
  input: { idToken?: string; code?: string },
  ip: string | null,
  userAgent: string | null,
): Promise<{ user: AuthUser; tokens: AuthTokens }> {
  let idToken = input.idToken;
  if (!idToken && input.code) {
    const { tokens } = await client.getToken(input.code);
    idToken = tokens.id_token ?? undefined;
  }
  if (!idToken) {
    throw UnauthorizedError('Google idToken atau code wajib diisi');
  }

  const profile = await verifyIdToken(idToken);
  if (!profile.emailVerified) {
    throw UnauthorizedError('Email Google belum terverifikasi');
  }

  // Gerbang signup. Email Google sudah terverifikasi (dicek di atas), jadi mode
  // publik aman tanpa flow verifikasi email terpisah. Mode tertutup (default)
  // tetap pakai allowlist ALLOWED_EMAILS.
  if (!env.PUBLIC_SIGNUP) {
    const allow = allowedEmails();
    if (!allow.includes(profile.email)) {
      await recordAudit({
        userId: null,
        userEmail: profile.email,
        action: 'LOGIN_FAILED',
        entity: 'auth.google',
        ip,
        userAgent,
        diff: { reason: 'email-not-allowlisted' },
      });
      throw ForbiddenError('Pendaftaran sedang ditutup. Email kamu belum diizinkan.');
    }
  }

  // Upsert user. If the email already exists, link Google sub. If new, create
  // and assign a role. SaaS B2C: the very first user in the system is the
  // platform owner → SUPER_ADMIN; every subsequent signup → MEMBER (full CRUD
  // over their OWN data only, no admin access).
  const existing = await prisma.user.findUnique({ where: { email: profile.email } });
  let userId: string;
  if (existing) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        googleSub: profile.sub,
        name: existing.name || profile.name,
        avatarUrl: profile.picture ?? existing.avatarUrl,
        isActive: true,
      },
    });
    userId = updated.id;
  } else {
    // Penentuan "user pertama → SUPER_ADMIN", create user, assign role, dan create
    // subscription dibungkus satu transaksi Serializable. Dua signup bersamaan yang
    // sama-sama melihat tabel kosong akan saling konflik → hanya satu jadi SUPER_ADMIN;
    // dan semua langkah commit bersama (tak ada user tanpa role/subscription).
    const created = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const isFirstUser = (await tx.user.count()) === 0;
        const newUser = await tx.user.create({
          data: {
            email: profile.email,
            name: profile.name,
            googleSub: profile.sub,
            avatarUrl: profile.picture,
            isActive: true,
          },
        });
        const roleName = isFirstUser ? ROLES.SUPER_ADMIN : ROLES.MEMBER;
        const role = await tx.role.findUnique({ where: { name: roleName } });
        if (!role) {
          throw InternalError(`Role "${roleName}" tidak ditemukan — jalankan seed terlebih dahulu`);
        }
        await tx.userRole.create({
          data: { userId: newUser.id, roleId: role.id },
        });
        // Langganan default (FREE/ACTIVE) — pondasi billing B2C.
        await tx.subscription.create({ data: { userId: newUser.id } });
        return newUser;
      },
      { isolationLevel: 'Serializable' },
    );
    userId = created.id;
  }

  const authUser = await buildAuthUser(userId);
  const tokens = await issueTokens(authUser);

  await recordAudit({
    userId,
    userEmail: authUser.email,
    action: 'LOGIN',
    entity: 'auth.google',
    ip,
    userAgent,
    diff: null,
  });

  return { user: authUser, tokens };
}
