import { JOB_QUEUES } from '@panggonmikir/shared';
import { createWorker } from '../services/queue.js';
import { logger } from '../lib/logger.js';
import { emailProcessor } from './handlers/email.js';
import { exportProcessor } from './handlers/export.js';
import { reportProcessor } from './handlers/report.js';
import { notificationProcessor } from './handlers/notification.js';
import { cleanupProcessor } from './handlers/cleanup.js';
import { reminderProcessor } from './handlers/reminder.js';
import { linkHealthProcessor } from './handlers/linkHealth.js';
import { weeklyReviewProcessor } from './handlers/weeklyReview.js';
import { registerSchedules } from './scheduler.js';

/**
 * The reminder queue handles BOTH ad-hoc due-task sweeps AND the Monday
 * weekly-review job. Routing is by job name inside the processor.
 */
async function reminderRouter(job: Parameters<typeof reminderProcessor>[0]) {
  if (job.name === 'weekly-review') {
    return weeklyReviewProcessor(
      job as unknown as Parameters<typeof weeklyReviewProcessor>[0],
    );
  }
  return reminderProcessor(job);
}

export function startWorkers() {
  const workers = [
    createWorker(JOB_QUEUES.EMAIL, emailProcessor),
    createWorker(JOB_QUEUES.EXPORT, exportProcessor),
    createWorker(JOB_QUEUES.REPORT, reportProcessor),
    createWorker(JOB_QUEUES.NOTIFICATION, notificationProcessor),
    createWorker(JOB_QUEUES.CLEANUP, cleanupProcessor),
    createWorker(JOB_QUEUES.REMINDER, reminderRouter),
    createWorker(JOB_QUEUES.LINK_HEALTH, linkHealthProcessor),
    // (LINK_METADATA queue retired — link.service.ts fetches metadata
    // synchronously on create. Re-introduce only when the request path is
    // actually too slow to hold open.)
  ];
  logger.info(`[worker] started ${workers.length} workers`);

  // Register repeatable cron jobs (idempotent across restarts).
  registerSchedules().catch((err) =>
    logger.error({ err }, '[worker] failed to register schedules'),
  );

  return workers;
}
