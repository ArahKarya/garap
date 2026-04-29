import { JOB_QUEUES } from '@panggonmikir/shared';
import { getQueue } from '../services/queue.js';
import { logger } from '../lib/logger.js';

/**
 * BullMQ repeatable cron schedule. Adding the same repeat pattern twice is
 * idempotent — BullMQ keys jobs by their repeat config, so worker restarts
 * won't create duplicates.
 */
const SCHEDULES = [
  {
    queue: JOB_QUEUES.REMINDER,
    jobName: 'sweep-due-tasks',
    cron: '*/30 * * * *', // every 30 minutes
    payload: {},
    description: 'Check tasks due today/overdue and create notifications',
  },
  {
    queue: JOB_QUEUES.LINK_HEALTH,
    jobName: 'sweep-broken-links',
    cron: '0 1 * * 0', // Sunday 01:00 (Asia/Jakarta)
    payload: { limit: 200 },
    description: 'Probe each saved link and flag the broken ones',
  },
  {
    queue: JOB_QUEUES.NOTIFICATION, // weekly-review reuses the notification queue worker is registered separately
    jobName: 'weekly-review',
    cron: '0 7 * * 1', // Monday 07:00 (Asia/Jakarta)
    payload: {},
    description: 'Generate weekly review note per user',
    /** Use a dedicated queue if defined separately. */
    queueOverride: JOB_QUEUES.REMINDER,
  },
] as const;

const TZ = 'Asia/Jakarta';

export async function registerSchedules(): Promise<void> {
  for (const spec of SCHEDULES) {
    const queueName = spec.queueOverride ?? spec.queue;
    const q = getQueue(queueName);
    try {
      await q.add(spec.jobName, spec.payload, {
        repeat: { pattern: spec.cron, tz: TZ },
        jobId: `cron:${spec.jobName}`,
      });
      logger.info(
        { queue: queueName, job: spec.jobName, cron: spec.cron },
        `[scheduler] registered: ${spec.description}`,
      );
    } catch (err) {
      logger.error(
        { err, queue: queueName, job: spec.jobName },
        '[scheduler] failed to register repeatable job',
      );
    }
  }
}
