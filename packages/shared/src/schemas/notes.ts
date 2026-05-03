import { z } from 'zod';

export const createNoteSchema = z.object({
  workspaceId: z.string().min(1, 'Workspace wajib dipilih'),
  title: z.string().trim().min(1, 'Judul wajib diisi').max(300),
  content: z.string().max(100_000).default(''),
  pinned: z.boolean().optional().default(false),
  projectId: z.string().cuid().optional().nullable(),
});

export const updateNoteSchema = createNoteSchema.partial();

export const noteListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(20),
  search: z.string().trim().optional(),
  workspaceId: z.string().optional(),
  projectId: z.string().cuid().optional(),
  pinned: z.coerce.boolean().optional(),
  includeDeleted: z.coerce.boolean().optional().default(false),
  deletedOnly: z.coerce.boolean().optional().default(false),
  tagIds: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').filter(Boolean) : undefined)),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type NoteListQuery = z.infer<typeof noteListQuerySchema>;
