import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { ok } from '@garap/shared';
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} from '@garap/shared';
import { validate, getValidated } from '../../middleware/validate.js';
import { authenticate, type AuthenticatedRequest } from '../../middleware/auth.js';
import * as authService from './auth.service.js';
import * as verificationService from './verification.service.js';

export const authRouter = Router();

// Strict per-IP rate limit on credential/exchange endpoints to deter
// brute-force and token-replay attempts. The global /api limiter (300/min)
// kicks in on top of this — these are the inner gate.
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Terlalu banyak percobaan. Coba lagi nanti.' } },
});

const refreshLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Terlalu banyak refresh. Coba lagi nanti.' } },
});

authRouter.post('/login', credentialLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const input = getValidated<import('@garap/shared').LoginInput>(req);
    const result = await authService.login(
      input,
      req.ip ?? null,
      req.headers['user-agent'] ?? null,
    );
    res.json(ok(result));
  } catch (err) {
    next(err);
  }
});

// Pendaftaran publik email/password (aktif saat PUBLIC_SIGNUP=true).
authRouter.post('/register', credentialLimiter, validate(registerSchema), async (req, res, next) => {
  try {
    const input = getValidated<import('@garap/shared').RegisterInput>(req);
    const result = await authService.register(
      input,
      req.ip ?? null,
      req.headers['user-agent'] ?? null,
    );
    res.status(201).json(ok(result));
  } catch (err) {
    next(err);
  }
});

// Verifikasi email (publik). User membuka link dari email → SPA POST token ke sini.
authRouter.post(
  '/verify-email',
  credentialLimiter,
  validate(verifyEmailSchema),
  async (req, res, next) => {
    try {
      const { token } = getValidated<import('@garap/shared').VerifyEmailInput>(req);
      await verificationService.verifyEmail(token);
      res.json(ok({ verified: true }));
    } catch (err) {
      next(err);
    }
  },
);

// Kirim ulang email verifikasi (publik). Respons SELALU generik (anti-enumeration):
// tidak membocorkan apakah email terdaftar / sudah verified.
authRouter.post(
  '/resend-verification',
  credentialLimiter,
  validate(resendVerificationSchema),
  async (req, res, next) => {
    try {
      const { email } = getValidated<import('@garap/shared').ResendVerificationInput>(req);
      await verificationService.resendVerification(email);
      res.json(ok({ sent: true }));
    } catch (err) {
      next(err);
    }
  },
);

authRouter.post('/refresh', refreshLimiter, validate(refreshTokenSchema), async (req, res, next) => {
  try {
    const { refreshToken } = getValidated<{ refreshToken: string }>(req);
    const result = await authService.refresh(refreshToken);
    res.json(ok(result));
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', validate(refreshTokenSchema), async (req, res, next) => {
  try {
    const { refreshToken } = getValidated<{ refreshToken: string }>(req);
    await authService.logout(refreshToken);
    res.json(ok({ loggedOut: true }));
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await authService.me(req.user!.id);
    res.json(ok(user));
  } catch (err) {
    next(err);
  }
});

authRouter.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const input = getValidated<import('@garap/shared').ChangePasswordInput>(req);
      await authService.changePassword(req.user!.id, input.currentPassword, input.newPassword);
      res.json(ok({ changed: true }));
    } catch (err) {
      next(err);
    }
  },
);
