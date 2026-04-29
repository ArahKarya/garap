import { z } from 'zod';

export const idSchema = z.string().cuid();
export const emailSchema = z.string().email().toLowerCase().trim();
export const passwordSchema = z
  .string()
  .min(8, 'Password minimal 8 karakter')
  .max(72, 'Password maksimal 72 karakter');

export const apiResponseSchema = <T extends z.ZodTypeAny>(data: T) =>
  z.object({
    success: z.boolean(),
    data: data.nullable(),
    error: z
      .object({
        code: z.string(),
        message: z.string(),
        details: z.unknown().optional(),
      })
      .nullable(),
    meta: z
      .object({
        total: z.number().int().optional(),
        page: z.number().int().optional(),
        limit: z.number().int().optional(),
      })
      .optional(),
  });

export type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: unknown;
  } | null;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
};
