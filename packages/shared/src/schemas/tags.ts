import { z } from 'zod';
import { TAGGABLE_ENTITIES } from '../constants/index.js';

export const createTagSchema = z.object({
  name: z.string().trim().min(1, 'Nama tag wajib diisi').max(60),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color harus hex (#rrggbb)')
    .optional()
    .nullable(),
});

export const updateTagSchema = createTagSchema.partial();

export const attachTagSchema = z.object({
  tagId: z.string().cuid(),
  entityType: z.enum(TAGGABLE_ENTITIES),
  entityId: z.string().cuid(),
});

export const tagListQuerySchema = z.object({
  search: z.string().trim().optional(),
});

export const taggedEntityQuerySchema = z.object({
  entityType: z.enum(TAGGABLE_ENTITIES),
  entityId: z.string().cuid(),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
export type AttachTagInput = z.infer<typeof attachTagSchema>;
export type TagListQuery = z.infer<typeof tagListQuerySchema>;
export type TaggedEntityQuery = z.infer<typeof taggedEntityQuerySchema>;
