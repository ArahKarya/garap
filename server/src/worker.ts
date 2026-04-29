import { startWorkers } from './jobs/index.js';
import { logger } from './lib/logger.js';
import { disconnectPrisma } from './lib/prisma.js';

const workers = startWorkers();

async function shutdown(signal: string) {
  logger.info(`[worker] received ${signal}, shutting down`);
  await Promise.all(workers.map((w) => w.close()));
  await disconnectPrisma();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

logger.info('[worker] ready');
