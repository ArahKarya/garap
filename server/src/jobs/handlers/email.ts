import type { Processor } from 'bullmq';
import { logger } from '../../lib/logger.js';

export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
}

export const emailProcessor: Processor<EmailJobData> = async (job) => {
  logger.info({ jobId: job.id, to: job.data.to }, 'sending email (stub)');
  // TODO: integrate with nodemailer / SES / SMTP provider
  return { sent: true };
};
