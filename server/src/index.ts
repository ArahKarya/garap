import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { disconnectPrisma } from './lib/prisma.js';
import { closeAllQueues } from './services/queue.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`[server] listening on http://localhost:${env.PORT}`);
  logger.info(`[server] CORS origin: ${env.CORS_ORIGIN}`);
  logger.info(`[server] Bull Board: ${env.APP_URL}${env.BULL_BOARD_PATH}`);
});

async function shutdown(signal: string) {
  logger.info(`[server] received ${signal}, shutting down`);
  server.close();
  await closeAllQueues();
  await disconnectPrisma();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
