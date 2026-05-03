import { z } from 'zod';

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

/** Used for the "external link" form path — file uploads use multipart, not JSON. */
export const createExternalDocumentSchema = z.object({
  workspaceId: z.string().min(1, 'Workspace wajib dipilih'),
  title: z.string().trim().min(1, 'Judul wajib diisi').max(300),
  description: z.string().trim().max(5000).optional().nullable(),
  externalUrl: publicUrlSchema,
  projectId: z.string().cuid().optional().nullable(),
});

/**
 * Used for multipart upload meta fields — validated AFTER multer parses the
 * file. Coerces string-form-fields and tolerates absence of title (will fall
 * back to original filename).
 */
export const uploadDocumentMetaSchema = z.object({
  workspaceId: z.string().min(1, 'Workspace wajib dipilih'),
  title: z.string().trim().min(1).max(300).optional(),
  description: z.string().trim().max(5000).optional().nullable(),
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
  workspaceId: z.string().optional(),
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
export type UploadDocumentMetaInput = z.infer<typeof uploadDocumentMetaSchema>;
