import { z } from 'zod';

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1, 'Nama workspace wajib diisi').max(100),
  description: z.string().trim().max(2000).optional().nullable(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color harus hex (#rrggbb)')
    .optional()
    .nullable(),
  icon: z.string().trim().max(50).optional().nullable(),
  sortOrder: z.coerce.number().int().optional().default(0),
});

export const updateWorkspaceSchema = createWorkspaceSchema.partial().extend({
  isDefault: z.boolean().optional(),
});

export const workspaceListQuerySchema = z.object({
  includeArchived: z.coerce.boolean().optional().default(false),
  includeDeleted: z.coerce.boolean().optional().default(false),
  deletedOnly: z.coerce.boolean().optional().default(false),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name', 'sortOrder']).default('sortOrder'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type WorkspaceListQuery = z.infer<typeof workspaceListQuerySchema>;
