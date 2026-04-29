import { z } from 'zod';
import { LINK_PLATFORMS } from '../constants/index.js';

export const createLinkSchema = z.object({
  url: z.string().url('URL tidak valid').max(2000),
  title: z.string().trim().max(500).optional(),
  description: z.string().trim().max(5000).optional().nullable(),
  notes: z.string().trim().max(5000).optional().nullable(),
  platform: z.enum(LINK_PLATFORMS).optional(),
  projectId: z.string().cuid().optional().nullable(),
});

export const updateLinkSchema = z.object({
  title: z.string().trim().min(1).max(500).optional(),
  description: z.string().trim().max(5000).optional().nullable(),
  notes: z.string().trim().max(5000).optional().nullable(),
  platform: z.enum(LINK_PLATFORMS).optional(),
  projectId: z.string().cuid().optional().nullable(),
});

export const linkListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  platform: z.enum(LINK_PLATFORMS).optional(),
  projectId: z.string().cuid().optional(),
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
