import { Router } from 'express';
import { ok } from '@panggonmikir/shared';
import { prisma } from '../../lib/prisma.js';
import { authenticate, type AuthenticatedRequest } from '../../middleware/auth.js';

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);

dashboardRouter.get('/summary', async (req: AuthenticatedRequest, res, next) => {
  try {
    const ownerId = req.user!.id;
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(startOfDay.getTime() + 7 * 24 * 60 * 60 * 1000);

    const baseTask = { ownerId, deletedAt: null } as const;

    const [
      todayTasks,
      upcomingTasks,
      overdueTasks,
      activeProjects,
      totalLinks,
      recentLinks,
      recentTasks,
    ] = await Promise.all([
      prisma.task.count({
        where: {
          ...baseTask,
          status: { notIn: ['DONE', 'CANCELLED'] },
          dueDate: { gte: startOfDay, lt: endOfDay },
        },
      }),
      prisma.task.count({
        where: {
          ...baseTask,
          status: { notIn: ['DONE', 'CANCELLED'] },
          dueDate: { gte: endOfDay, lte: sevenDaysFromNow },
        },
      }),
      prisma.task.count({
        where: {
          ...baseTask,
          status: { notIn: ['DONE', 'CANCELLED'] },
          dueDate: { lt: startOfDay },
        },
      }),
      prisma.project.count({
        where: { ownerId, deletedAt: null, status: 'ACTIVE' },
      }),
      prisma.link.count({ where: { ownerId, deletedAt: null } }),
      prisma.link.findMany({
        where: { ownerId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          url: true,
          platform: true,
          faviconUrl: true,
          createdAt: true,
        },
      }),
      prisma.task.findMany({
        where: { ...baseTask, status: { notIn: ['DONE', 'CANCELLED'] } },
        orderBy: { dueDate: 'asc' },
        take: 5,
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          project: { select: { id: true, name: true, color: true } },
        },
      }),
    ]);

    res.json(
      ok({
        counts: {
          tasksToday: todayTasks,
          tasksUpcoming7Days: upcomingTasks,
          tasksOverdue: overdueTasks,
          projectsActive: activeProjects,
          linksTotal: totalLinks,
        },
        recentLinks,
        recentTasks,
      }),
    );
  } catch (err) {
    next(err);
  }
});
