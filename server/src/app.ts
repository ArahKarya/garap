import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
// pino-http v10 is published as ESM-only with `default` export; in CommonJS-resolved
// contexts the namespace itself is the function — alias it via a runtime assertion.
import pinoHttpModule from 'pino-http';
const pinoHttp = (pinoHttpModule as unknown as typeof import('pino-http').default);
import { env, isProduction } from './config/env.js';
import { logger } from './lib/logger.js';
import { apiRouter } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { createBullBoardRouter } from './services/bullBoard.js';
import { authenticate } from './middleware/auth.js';
import { requireRoles } from './middleware/rbac.js';
import { ROLES } from '@garap/shared';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // CSP + COOP: relax just enough for Google Identity Services. Helmet default
  // would block accounts.google.com; default COOP `same-origin` also blocks
  // window.opener.postMessage from the GIS popup back to our main tab,
  // resulting in a blank Google popup that never closes.
  app.use(
    helmet({
      contentSecurityPolicy: isProduction
        ? {
            directives: {
              defaultSrc: ["'self'"],
              baseUri: ["'self'"],
              fontSrc: ["'self'", 'https:', 'data:'],
              formAction: ["'self'"],
              frameAncestors: ["'self'"],
              // Google Sign-In popup is rendered in an iframe.
              frameSrc: ["'self'", 'https://accounts.google.com'],
              imgSrc: ["'self'", 'data:', 'https://*.googleusercontent.com', 'https:'],
              objectSrc: ["'none'"],
              // Google GIS script + supporting JS.
              scriptSrc: ["'self'", 'https://accounts.google.com', 'https://apis.google.com'],
              scriptSrcAttr: ["'none'"],
              styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
              // Allow XHR to Google for token exchange + favicon proxies.
              connectSrc: ["'self'", 'https://accounts.google.com', 'https:'],
              upgradeInsecureRequests: [],
            },
          }
        : false,
      // Allow popups (GIS) to talk back to the opener via postMessage.
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      // Default 'require-corp' breaks loading cross-origin Google iframe.
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(compression());
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(pinoHttp({ logger }));

  app.use(
    '/api',
    rateLimit({
      windowMs: 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // Bull Board — admin only
  app.use(
    env.BULL_BOARD_PATH,
    authenticate,
    requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
    createBullBoardRouter(env.BULL_BOARD_PATH),
  );

  app.use('/api', apiRouter);

  // ─── Serve built client SPA in production ────────────────────────────────
  // In Docker runtime the built client lives at /app/client/dist. From the
  // compiled server entry (/app/server/dist/index.js), that's `../../client/dist`.
  // In dev (tsx running src/), the path resolves identically relative to src.
  if (isProduction) {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const clientDist = path.resolve(__dirname, '../../client/dist');
    app.use(
      express.static(clientDist, {
        index: false,
        maxAge: '7d',
        setHeaders: (res, filePath) => {
          const base = path.basename(filePath);
          if (base === 'sw.js' || base === 'manifest.json') {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          }
        },
      }),
    );
    // SPA fallback — anything not matched above falls back to index.html so
    // React Router handles client-side routes.
    app.get(/^(?!\/api\/|\/admin\/).*/, (_req, res, next) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(clientDist, 'index.html'), (err) => {
        if (err) next(err);
      });
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
