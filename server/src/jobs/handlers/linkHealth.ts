import type { Processor } from 'bullmq';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';

interface LinkHealthPayload {
  /** Reserved — when set, only check this user's links. Empty = scan all active. */
  userId?: string;
  /** Optional cap to avoid hammering on first run. Default 200 per sweep. */
  limit?: number;
}

const FETCH_TIMEOUT_MS = 10_000;

async function checkLink(url: string): Promise<{ ok: boolean; status: number | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    // HEAD first; many sites reject HEAD so fall back to GET.
    let res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'PanggonMikirHealth/0.1' },
    });
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        redirect: 'follow',
        headers: { 'User-Agent': 'PanggonMikirHealth/0.1' },
      });
    }
    return { ok: res.status >= 200 && res.status < 400, status: res.status };
  } catch {
    return { ok: false, status: null };
  } finally {
    clearTimeout(timer);
  }
}

/** Sweeps links and marks isBroken/lastCheckedAt. Notifies on transitions to broken. */
export const linkHealthProcessor: Processor<LinkHealthPayload> = async (job) => {
  const limit = job.data.limit ?? 200;
  const links = await prisma.link.findMany({
    where: { deletedAt: null },
    take: limit,
    orderBy: { lastCheckedAt: { sort: 'asc', nulls: 'first' } },
    select: { id: true, url: true, ownerId: true, title: true, isBroken: true },
  });

  let broken = 0;
  let recovered = 0;
  for (const link of links) {
    const { ok, status } = await checkLink(link.url);
    const nowBroken = !ok;
    await prisma.link.update({
      where: { id: link.id },
      data: { isBroken: nowBroken, lastCheckedAt: new Date() },
    });
    if (nowBroken && !link.isBroken) {
      broken += 1;
      await prisma.notification.create({
        data: {
          userId: link.ownerId,
          title: 'Link rusak terdeteksi',
          message: `${link.title} (status ${status ?? 'timeout'})`,
          type: 'warning',
          link: '/links',
          metadata: { kind: 'link-broken', linkId: link.id, status },
        },
      });
    } else if (!nowBroken && link.isBroken) {
      recovered += 1;
    }
  }

  logger.info(
    { jobId: job.id, scanned: links.length, broken, recovered },
    'link health sweep done',
  );
  return { scanned: links.length, broken, recovered };
};
