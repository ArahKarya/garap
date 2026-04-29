import type { Processor } from 'bullmq';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';

interface ReminderPayload {
  /** Reserved for future per-user fan-out. Empty = check all active users. */
  userId?: string;
}

/**
 * Find tasks that are due today (or overdue & unnotified) and create in-app
 * notifications. Idempotent: tags each task with a metadata key in the
 * notification so we don't duplicate within the same day.
 */
export const reminderProcessor: Processor<ReminderPayload> = async (job) => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const tasks = await prisma.task.findMany({
    where: {
      deletedAt: null,
      status: { notIn: ['DONE', 'CANCELLED'] },
      dueDate: { lte: endOfDay },
    },
    select: {
      id: true,
      ownerId: true,
      title: true,
      dueDate: true,
      priority: true,
    },
  });

  let created = 0;
  for (const task of tasks) {
    // Skip if a reminder for this task was already created today.
    const existing = await prisma.notification.findFirst({
      where: {
        userId: task.ownerId,
        metadata: { path: ['kind'], equals: 'task-reminder' },
        AND: [
          { metadata: { path: ['taskId'], equals: task.id } },
          { createdAt: { gte: startOfDay } },
        ],
      },
      select: { id: true },
    });
    if (existing) continue;

    const overdue = task.dueDate && task.dueDate < startOfDay;
    await prisma.notification.create({
      data: {
        userId: task.ownerId,
        title: overdue ? 'Task lewat tenggat' : 'Task jatuh tempo hari ini',
        message: task.title,
        type: overdue ? 'warning' : 'info',
        link: `/tasks`,
        metadata: { kind: 'task-reminder', taskId: task.id, priority: task.priority },
      },
    });
    created += 1;
  }

  logger.info({ jobId: job.id, scanned: tasks.length, created }, 'reminder sweep done');
  return { scanned: tasks.length, created };
};
