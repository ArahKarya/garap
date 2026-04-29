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
import { ROLES } from '@panggonmikir/shared';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet({ contentSecurityPolicy: isProduction ? undefined : false }));
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

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
