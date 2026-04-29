import { z } from 'zod';
import { emailSchema, passwordSchema } from './common.js';

export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().min(2).max(100),
  roleIds: z.array(z.string().cuid()).min(1, 'Minimal 1 role'),
  isActive: z.boolean().default(true),
});

export const updateUserSchema = z.object({
  email: emailSchema.optional(),
  name: z.string().trim().min(2).max(100).optional(),
  roleIds: z.array(z.string().cuid()).optional(),
  isActive: z.boolean().optional(),
});

export const resetPasswordSchema = z.object({
  newPassword: passwordSchema,
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
