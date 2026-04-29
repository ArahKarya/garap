import type { Processor } from 'bullmq';
import { logger } from '../../lib/logger.js';

export interface ReportJobData {
  reportKey: string;
  params?: Record<string, unknown>;
}

export const reportProcessor: Processor<ReportJobData> = async (job) => {
  logger.info({ jobId: job.id, reportKey: job.data.reportKey }, 'report job (stub)');
  return { ok: true };
};
