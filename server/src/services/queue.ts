import { Queue, Worker, type JobsOptions, type Processor } from 'bullmq';
import { JOB_QUEUES, type JobQueueName } from '@panggonmikir/shared';
import { createRedisConnection } from '../lib/redis.js';
import { logger } from '../lib/logger.js';

const queues = new Map<JobQueueName, Queue>();

export function getQueue(name: JobQueueName): Queue {
  let q = queues.get(name);
  if (!q) {
    q = new Queue(name, {
      connection: createRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 100, age: 7 * 24 * 3600 },
        removeOnFail: { count: 500 },
      },
    });
    queues.set(name, q);
  }
  return q;
}

export const allQueues = () => Object.values(JOB_QUEUES).map((name) => getQueue(name as JobQueueName));

export async function enqueue<T>(
  name: JobQueueName,
  jobName: string,
  data: T,
  opts?: JobsOptions,
) {
  try {
    const job = await getQueue(name).add(jobName, data, opts);
    logger.debug({ queue: name, jobName, jobId: job.id }, 'job enqueued');
    return job.id;
  } catch (err) {
    logger.error({ err, queue: name, jobName }, 'enqueue failed — running sync fallback');
    return null;
  }
}

export function createWorker<T>(name: JobQueueName, processor: Processor<T>) {
  const worker = new Worker<T>(name, processor, {
    connection: createRedisConnection(),
    concurrency: 5,
  });

  worker.on('completed', (job) =>
    logger.info({ queue: name, jobId: job.id, jobName: job.name }, 'job completed'),
  );
  worker.on('failed', (job, err) =>
    logger.error(
      { queue: name, jobId: job?.id, jobName: job?.name, err: err.message },
      'job failed',
    ),
  );
  return worker;
}

export async function closeAllQueues() {
  await Promise.all(Array.from(queues.values()).map((q) => q.close()));
  queues.clear();
}
