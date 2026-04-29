import type { Processor } from 'bullmq';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';

interface WeeklyReviewPayload {
  userId?: string;
}

function startOfWeek(d: Date): Date {
  // Monday-first week (Indonesia + ISO).
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
  return monday;
}

function fmt(d: Date): string {
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

/**
 * Auto-generate a weekly review note for each active user. Runs Monday morning.
 * Idempotent: skips users that already have a review note for this week.
 */
export const weeklyReviewProcessor: Processor<WeeklyReviewPayload> = async (job) => {
  const now = new Date();
  const thisMonday = startOfWeek(now);
  const lastMonday = new Date(thisMonday.getTime() - 7 * 24 * 60 * 60 * 1000);
  const nextMonday = new Date(thisMonday.getTime() + 7 * 24 * 60 * 60 * 1000);

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  let createdCount = 0;
  for (const user of users) {
    const noteTitle = `Review Minggu ${fmt(thisMonday)}`;

    // Skip if a review note for this Monday already exists.
    const existing = await prisma.note.findFirst({
      where: {
        ownerId: user.id,
        title: noteTitle,
        createdAt: { gte: thisMonday },
      },
      select: { id: true },
    });
    if (existing) continue;

    const [completedLastWeek, dueThisWeek, activeProjects] = await Promise.all([
      prisma.task.findMany({
        where: {
          ownerId: user.id,
          status: 'DONE',
          completedAt: { gte: lastMonday, lt: thisMonday },
        },
        select: { title: true, project: { select: { name: true } } },
        orderBy: { completedAt: 'asc' },
      }),
      prisma.task.findMany({
        where: {
          ownerId: user.id,
          deletedAt: null,
          status: { notIn: ['DONE', 'CANCELLED'] },
          dueDate: { gte: thisMonday, lt: nextMonday },
        },
        select: { title: true, dueDate: true, priority: true },
        orderBy: { dueDate: 'asc' },
      }),
      prisma.project.findMany({
        where: { ownerId: user.id, deletedAt: null, status: 'ACTIVE' },
        select: { name: true },
        take: 10,
      }),
    ]);

    const lines: string[] = [];
    lines.push(`# Review Minggu ${fmt(thisMonday)}`);
    lines.push('');
    lines.push(`Halo, ${user.name}. Catatan otomatis untuk minggu ini.`);
    lines.push('');
    lines.push('## Selesai Minggu Lalu');
    if (completedLastWeek.length === 0) {
      lines.push('_(Belum ada task yang selesai minggu lalu.)_');
    } else {
      for (const t of completedLastWeek) {
        const proj = t.project ? ` _(${t.project.name})_` : '';
        lines.push(`- ${t.title}${proj}`);
      }
    }
    lines.push('');
    lines.push('## Jatuh Tempo Minggu Ini');
    if (dueThisWeek.length === 0) {
      lines.push('_(Tidak ada task jatuh tempo minggu ini.)_');
    } else {
      for (const t of dueThisWeek) {
        const due = t.dueDate ? t.dueDate.toLocaleDateString('id-ID') : '?';
        lines.push(`- **[${t.priority}]** ${t.title} — ${due}`);
      }
    }
    lines.push('');
    lines.push('## Project Aktif');
    if (activeProjects.length === 0) {
      lines.push('_(Tidak ada project aktif.)_');
    } else {
      for (const p of activeProjects) {
        lines.push(`- ${p.name}`);
      }
    }
    lines.push('');
    lines.push('## Refleksi');
    lines.push('- Apa yang berjalan lancar?');
    lines.push('- Apa yang nyangkut?');
    lines.push('- Fokus utama minggu ini?');

    await prisma.note.create({
      data: {
        ownerId: user.id,
        title: noteTitle,
        content: lines.join('\n'),
        pinned: true,
      },
    });
    createdCount += 1;
  }

  logger.info(
    { jobId: job.id, users: users.length, createdCount },
    'weekly review sweep done',
  );
  return { users: users.length, created: createdCount };
};
