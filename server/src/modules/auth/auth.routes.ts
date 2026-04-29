import { Router } from 'express';
import { ok } from '@panggonmikir/shared';
import {
  changePasswordSchema,
  googleLoginSchema,
  loginSchema,
  refreshTokenSchema,
} from '@panggonmikir/shared';
import { validate, getValidated } from '../../middleware/validate.js';
import { authenticate, type AuthenticatedRequest } from '../../middleware/auth.js';
import * as authService from './auth.service.js';
import * as googleService from './google.service.js';

export const authRouter = Router();

// ─── Google OAuth ─────────────────────────────────────────────────────────
// GET  /api/auth/google         — returns the Google consent URL the SPA opens
// POST /api/auth/google         — body: { idToken } OR { code }; returns tokens
authRouter.get('/google', (req, res) => {
  const state = typeof req.query.state === 'string' ? req.query.state : undefined;
  res.json(ok({ url: googleService.buildAuthUrl(state) }));
});

authRouter.post('/google', validate(googleLoginSchema), async (req, res, next) => {
  try {
    const input = getValidated<import('@panggonmikir/shared').GoogleLoginInput>(req);
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

authRouter.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const input = getValidated<import('@panggonmikir/shared').LoginInput>(req);
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

authRouter.post('/refresh', validate(refreshTokenSchema), async (req, res, next) => {
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
      const input = getValidated<import('@panggonmikir/shared').ChangePasswordInput>(req);
      await authService.changePassword(req.user!.id, input.currentPassword, input.newPassword);
      res.json(ok({ changed: true }));
    } catch (err) {
      next(err);
    }
  },
);
