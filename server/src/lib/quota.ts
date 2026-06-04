import { PLAN_LIMITS, DEFAULT_PLAN, type PlanKey, type QuotaResource } from '@garap/shared';
import { prisma } from './prisma.js';
import { QuotaError } from './errors.js';

/** Resolusi paket aktif user → limit. Fallback ke DEFAULT_PLAN bila tak ada/non-aktif. */
export async function resolvePlanKey(ownerId: string): Promise<PlanKey> {
  const sub = await prisma.subscription.findUnique({
    where: { userId: ownerId },
    select: { planKey: true, status: true },
  });
  if (sub && sub.status === 'ACTIVE' && sub.planKey in PLAN_LIMITS) {
    return sub.planKey as PlanKey;
  }
  return DEFAULT_PLAN;
}

/**
 * Penegakan kuota per-user (anti-abuse signup publik). Saat ini semua user di
 * tier FREE. Hitung baris aktif (belum soft-deleted) milik owner; tolak kalau
 * sudah mencapai batas. Soft-deleted (di Trash) TIDAK dihitung.
 */

const RESOURCE_LABEL: Record<QuotaResource, string> = {
  workspaces: 'workspace',
  projects: 'project',
  tasks: 'task',
  notes: 'note',
  links: 'link',
  documents: 'dokumen',
  references: 'referensi',
  storageMb: 'penyimpanan',
};

// Penghitung per-resource. Semua entitas punya `ownerId` + `deletedAt`.
const COUNTERS: Record<
  Exclude<QuotaResource, 'storageMb'>,
  (ownerId: string) => Promise<number>
> = {
  workspaces: (ownerId) => prisma.workspace.count({ where: { ownerId, deletedAt: null } }),
  projects: (ownerId) => prisma.project.count({ where: { ownerId, deletedAt: null } }),
  tasks: (ownerId) => prisma.task.count({ where: { ownerId, deletedAt: null } }),
  notes: (ownerId) => prisma.note.count({ where: { ownerId, deletedAt: null } }),
  links: (ownerId) => prisma.link.count({ where: { ownerId, deletedAt: null } }),
  documents: (ownerId) => prisma.document.count({ where: { ownerId, deletedAt: null } }),
  references: (ownerId) => prisma.reference.count({ where: { ownerId, deletedAt: null } }),
};

/**
 * Pastikan owner masih di bawah batas untuk membuat 1 item `resource` baru.
 * Lempar QuotaError (402) bila sudah penuh. Panggil di awal setiap `create()`.
 */
export async function assertWithinQuota(
  resource: Exclude<QuotaResource, 'storageMb'>,
  ownerId: string,
): Promise<void> {
  const planKey = await resolvePlanKey(ownerId);
  const limit = PLAN_LIMITS[planKey][resource];
  const current = await COUNTERS[resource](ownerId);
  if (current >= limit) {
    throw QuotaError(
      `Batas paket ${planKey} tercapai: maksimal ${limit} ${RESOURCE_LABEL[resource]}. ` +
        `Hapus item lama atau upgrade paket.`,
      { resource, limit, current, plan: planKey },
    );
  }
}

/** Hitung pemakaian semua resource (untuk tampilan billing). */
export async function getUsage(ownerId: string): Promise<Record<string, number>> {
  const entries = await Promise.all(
    (Object.keys(COUNTERS) as Array<keyof typeof COUNTERS>).map(
      async (k) => [k, await COUNTERS[k](ownerId)] as const,
    ),
  );
  return Object.fromEntries(entries);
}
