import { z } from 'zod';
import { PROJECT_STATUSES } from '../constants/index.js';

export const createProjectSchema = z.object({
  workspaceId: z.string().min(1, 'Workspace wajib dipilih'),
  name: z.string().trim().min(1, 'Nama project wajib diisi').max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  status: z.enum(PROJECT_STATUSES).default('ACTIVE'),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color harus hex (#rrggbb)')
    .optional()
    .nullable(),
  startDate: z.coerce.date().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
});

export const updateProjectSchema = createProjectSchema.partial();

export const projectListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  workspaceId: z.string().optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  includeArchived: z.coerce.boolean().optional().default(false),
  includeDeleted: z.coerce.boolean().optional().default(false),
  deletedOnly: z.coerce.boolean().optional().default(false),
  tagIds: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').filter(Boolean) : undefined)),
  sortBy: z.enum(['createdAt', 'updatedAt', 'dueDate', 'name']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ProjectListQuery = z.infer<typeof projectListQuerySchema>;
