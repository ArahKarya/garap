import type { Processor } from 'bullmq';
import { logger } from '../../lib/logger.js';

export interface ExportJobData {
  userId: string;
  type: 'excel' | 'pdf' | 'csv';
  entity: string;
  filter?: Record<string, unknown>;
}

export const exportProcessor: Processor<ExportJobData> = async (job) => {
  logger.info({ jobId: job.id, type: job.data.type, entity: job.data.entity }, 'export job (stub)');
  // TODO: generate file -> store path -> notify user via notification queue
  return { ok: true };
};
