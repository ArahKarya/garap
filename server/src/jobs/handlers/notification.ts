import type { Processor } from 'bullmq';
import type { NotificationPayload } from '@garap/shared';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';

export const notificationProcessor: Processor<NotificationPayload> = async (job) => {
  const { userId, title, message, type, link, metadata } = job.data;
  await prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type,
      link,
      metadata: (metadata ?? null) as any,
    },
  });
  logger.debug({ jobId: job.id, userId }, 'notification stored');
  return { ok: true };
};
