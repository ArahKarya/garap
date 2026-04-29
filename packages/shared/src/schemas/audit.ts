import { z } from 'zod';
import { paginationQuerySchema } from './pagination.js';

export const auditLogQuerySchema = paginationQuerySchema.extend({
  userId: z.string().cuid().optional(),
  action: z.string().optional(),
  entity: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;
