import { prisma } from '../../lib/prisma.js';

interface DashboardScope {
  ownerId: string;
  workspaceId?: string;
}

export async function summary(scope: DashboardScope) {
  const { ownerId, workspaceId } = scope;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
  const sevenDaysFromNow = new Date(startOfDay.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Task/Link/Note/Document have direct workspaceId FK — filter is a
  // simple equality, no OR/orphan workaround needed.
  const wsFilter = workspaceId ? { workspaceId } : {};
  const baseTask = { ownerId, deletedAt: null, ...wsFilter } as const;

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
      where: { ownerId, deletedAt: null, status: 'ACTIVE', ...wsFilter },
    }),
    prisma.link.count({ where: { ownerId, deletedAt: null, ...wsFilter } }),
    prisma.link.findMany({
      where: { ownerId, deletedAt: null, ...wsFilter },
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

  return {
    counts: {
      tasksToday: todayTasks,
      tasksUpcoming7Days: upcomingTasks,
      tasksOverdue: overdueTasks,
      projectsActive: activeProjects,
      linksTotal: totalLinks,
    },
    recentLinks,
    recentTasks,
  };
}
