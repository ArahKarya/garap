import { z } from 'zod';
import { REFERENCE_TYPES } from '../constants/index.js';

const PRIVATE_HOST_REGEX =
  /^(localhost|.+\.(local|lan|internal)|127\.|10\.|0\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/i;

const optionalPublicUrl = z
  .string()
  .max(2000)
  .optional()
  .nullable()
  .or(z.literal(''))
  .refine((v) => {
    if (!v) return true;
    if (!/^https?:\/\//i.test(v)) return false;
    try {
      const host = new URL(v).hostname.toLowerCase();
      return !PRIVATE_HOST_REGEX.test(host);
    } catch {
      return false;
    }
  }, 'URL harus http(s) publik (hostname privat/loopback ditolak)');

export const createReferenceSchema = z.object({
  workspaceId: z.string().min(1, 'Workspace wajib dipilih'),
  projectId: z.string().cuid().optional().nullable(),
  type: z.enum(REFERENCE_TYPES).default('JOURNAL_ARTICLE'),
  title: z.string().trim().min(1, 'Judul wajib diisi').max(1000),
  authors: z.string().trim().max(2000).optional().nullable(),
  year: z.coerce.number().int().min(0).max(9999).optional().nullable(),
  source: z.string().trim().max(500).optional().nullable(),
  volume: z.string().trim().max(50).optional().nullable(),
  issue: z.string().trim().max(50).optional().nullable(),
  pages: z.string().trim().max(50).optional().nullable(),
  doi: z.string().trim().max(200).optional().nullable(),
  isbn: z.string().trim().max(50).optional().nullable(),
  url: optionalPublicUrl,
  abstract: z.string().trim().max(20_000).optional().nullable(),
  notes: z.string().trim().max(20_000).optional().nullable(),
  citation: z.string().trim().max(2000).optional().nullable(),
});

export const updateReferenceSchema = createReferenceSchema.partial();

export const referenceListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(20),
  search: z.string().trim().optional(),
  workspaceId: z.string().optional(),
  projectId: z.string().cuid().optional(),
  type: z.enum(REFERENCE_TYPES).optional(),
  yearFrom: z.coerce.number().int().optional(),
  yearTo: z.coerce.number().int().optional(),
  includeDeleted: z.coerce.boolean().optional().default(false),
  deletedOnly: z.coerce.boolean().optional().default(false),
  tagIds: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').filter(Boolean) : undefined)),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'year']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateReferenceInput = z.infer<typeof createReferenceSchema>;
export type UpdateReferenceInput = z.infer<typeof updateReferenceSchema>;
export type ReferenceListQuery = z.infer<typeof referenceListQuerySchema>;
