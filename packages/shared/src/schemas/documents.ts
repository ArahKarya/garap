import { z } from 'zod';

/** Used for the "external link" form path — file uploads use multipart, not JSON. */
export const createExternalDocumentSchema = z.object({
  title: z.string().trim().min(1, 'Judul wajib diisi').max(300),
  description: z.string().trim().max(5000).optional().nullable(),
  externalUrl: z.string().url('URL tidak valid').max(2000),
  projectId: z.string().cuid().optional().nullable(),
});

export const updateDocumentSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  description: z.string().trim().max(5000).optional().nullable(),
  projectId: z.string().cuid().optional().nullable(),
});

export const documentListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  projectId: z.string().cuid().optional(),
  sourceType: z.enum(['UPLOAD', 'EXTERNAL', 'ALL']).default('ALL'),
  includeDeleted: z.coerce.boolean().optional().default(false),
  deletedOnly: z.coerce.boolean().optional().default(false),
  tagIds: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').filter(Boolean) : undefined)),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateExternalDocumentInput = z.infer<typeof createExternalDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type DocumentListQuery = z.infer<typeof documentListQuerySchema>;
