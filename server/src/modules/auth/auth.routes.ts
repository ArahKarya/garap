import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { ok } from '@garap/shared';
import {
  changePasswordSchema,
  googleLoginSchema,
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} from '@garap/shared';
import { validate, getValidated } from '../../middleware/validate.js';
import { authenticate, type AuthenticatedRequest } from '../../middleware/auth.js';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import * as authService from './auth.service.js';
import * as verificationService from './verification.service.js';
import * as googleService from './google.service.js';
import { issueState, verifyState } from './oauth-state.js';

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

// ─── Google OAuth ─────────────────────────────────────────────────────────
// GET  /api/auth/google         — returns the Google consent URL the SPA opens
// POST /api/auth/google         — body: { idToken } OR { code }; returns tokens
authRouter.get('/google', (_req, res) => {
  // Always issue a fresh signed state — client MUST forward the same value
  // back via the callback so we can verify the round-trip wasn't initiated
  // by an attacker.
  const state = issueState();
  res.json(ok({ url: googleService.buildAuthUrl(state), state }));
});

authRouter.post('/google', credentialLimiter, validate(googleLoginSchema), async (req, res, next) => {
  try {
    const input = getValidated<import('@garap/shared').GoogleLoginInput>(req);
    const result = await googleService.loginWithGoogle(
      input,
      req.ip ?? null,
      req.headers['user-agent'] ?? null,
    );
    res.json(ok(result));
  } catch (err) {
    next(err);
  }
});

// Google may use server-redirect mode in some browsers (FedCM unavailable, etc.):
// after the consent screen, Google redirects the browser to GOOGLE_REDIRECT_URI
// with `?code=...`. Exchange the code, then redirect into the SPA's
// /auth/callback route with tokens in the URL fragment so the client can
// hydrate Zustand auth store. Fragment (#) chosen over query (?) because
// fragments aren't sent in Referer headers or proxy logs.
authRouter.get('/google/callback', async (req, res, next) => {
  try {
    const code = typeof req.query.code === 'string' ? req.query.code : null;
    const stateParam = typeof req.query.state === 'string' ? req.query.state : null;
    const errorParam = typeof req.query.error === 'string' ? req.query.error : null;
    const appOrigin = env.APP_URL.replace(/\/+$/, '');
    if (errorParam) {
      logger.warn({ errorParam }, '[google/callback] Google returned error');
      return res.redirect(`${appOrigin}/login?error=${encodeURIComponent(errorParam)}`);
    }
    if (!code) {
      return res.redirect(`${appOrigin}/login?error=missing_code`);
    }
    // Verify the state HMAC — defends against login-CSRF where an attacker
    // initiates the flow and tricks a victim's browser into completing it.
    const stateCheck = verifyState(stateParam);
    if (!stateCheck.ok) {
      logger.warn({ reason: stateCheck.reason }, '[google/callback] state verification failed');
      return res.redirect(`${appOrigin}/login?error=invalid_state`);
    }

    const { user, tokens } = await googleService.loginWithGoogle(
      { code },
      req.ip ?? null,
      req.headers['user-agent'] ?? null,
    );

    // Pack into URL fragment — accessToken, refreshToken, base64-encoded user.
    const userB64 = Buffer.from(JSON.stringify(user)).toString('base64url');
    const fragment = new URLSearchParams({
      access: tokens.accessToken,
      refresh: tokens.refreshToken,
      expires: String(tokens.expiresIn),
      user: userB64,
    }).toString();
    res.redirect(`${appOrigin}/auth/callback#${fragment}`);
  } catch (err) {
    logger.error({ err }, '[google/callback] failed');
    const appOrigin = env.APP_URL.replace(/\/+$/, '');
    res.redirect(`${appOrigin}/login?error=auth_failed`);
  }
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
// tidak membocorkan apakah email terdaftar / sudah verified / akun Google-only.
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
