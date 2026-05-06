import { z } from 'zod';
import { LINK_PLATFORMS } from '../constants/index.js';

const PRIVATE_HOST_REGEX =
  /^(localhost|.+\.(local|lan|internal)|127\.|10\.|0\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/i;

const publicUrlSchema = z
  .string()
  .url('URL tidak valid')
  .max(2000)
  .refine((u) => /^https?:\/\//i.test(u), 'Hanya http(s) yang diizinkan')
  .refine((u) => {
    try {
      const host = new URL(u).hostname.toLowerCase();
      return !PRIVATE_HOST_REGEX.test(host);
    } catch {
      return false;
    }
  }, 'Hostname privat/loopback tidak diizinkan');

export const createLinkSchema = z.object({
  workspaceId: z.string().min(1, 'Workspace wajib dipilih'),
  url: publicUrlSchema,
  title: z.string().trim().max(500).optional(),
  description: z.string().trim().max(5000).optional().nullable(),
  notes: z.string().trim().max(5000).optional().nullable(),
  platform: z.enum(LINK_PLATFORMS).optional(),
  projectId: z.string().cuid().optional().nullable(),
  taskId: z.string().cuid().optional().nullable(),
});

export const updateLinkSchema = z.object({
  title: z.string().trim().min(1).max(500).optional(),
  description: z.string().trim().max(5000).optional().nullable(),
  notes: z.string().trim().max(5000).optional().nullable(),
  platform: z.enum(LINK_PLATFORMS).optional(),
  projectId: z.string().cuid().optional().nullable(),
  taskId: z.string().cuid().optional().nullable(),
});

export const linkListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(20),
  search: z.string().trim().optional(),
  platform: z.enum(LINK_PLATFORMS).optional(),
  workspaceId: z.string().optional(),
  projectId: z.string().cuid().optional(),
  taskId: z.string().cuid().optional(),
  includeDeleted: z.coerce.boolean().optional().default(false),
  deletedOnly: z.coerce.boolean().optional().default(false),
  tagIds: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').filter(Boolean) : undefined)),
  sortBy: z.enum(['createdAt', 'updatedAt', 'lastAccessedAt', 'accessCount', 'title']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateLinkInput = z.infer<typeof createLinkSchema>;
export type UpdateLinkInput = z.infer<typeof updateLinkSchema>;
export type LinkListQuery = z.infer<typeof linkListQuerySchema>;
