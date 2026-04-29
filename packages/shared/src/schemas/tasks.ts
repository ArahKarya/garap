import { z } from 'zod';
import { TASK_STATUSES, TASK_PRIORITIES } from '../constants/index.js';

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Judul wajib diisi').max(300),
  description: z.string().trim().max(5000).optional().nullable(),
  status: z.enum(TASK_STATUSES).default('TODO'),
  priority: z.enum(TASK_PRIORITIES).default('MEDIUM'),
  dueDate: z.coerce.date().optional().nullable(),
  recurrence: z.string().trim().max(200).optional().nullable(),
  projectId: z.string().cuid().optional().nullable(),
  parentId: z.string().cuid().optional().nullable(),
  sortOrder: z.number().int().optional(),
});

export const updateTaskSchema = createTaskSchema.partial();

export const taskListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  projectId: z.string().cuid().optional(),
  parentId: z.string().cuid().optional(),
  dueBefore: z.coerce.date().optional(),
  dueAfter: z.coerce.date().optional(),
  includeCompleted: z.coerce.boolean().optional().default(false),
  includeDeleted: z.coerce.boolean().optional().default(false),
  deletedOnly: z.coerce.boolean().optional().default(false),
  // Comma-separated list of tag IDs — task must have AT LEAST ONE of them.
  tagIds: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').filter(Boolean) : undefined)),
  sortBy: z.enum(['createdAt', 'updatedAt', 'dueDate', 'priority', 'sortOrder']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskListQuery = z.infer<typeof taskListQuerySchema>;
