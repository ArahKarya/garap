import { z } from 'zod';
import { emailSchema, passwordSchema } from './common.js';

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password wajib diisi'),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(100),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const googleLoginSchema = z
  .object({
    idToken: z.string().min(1).optional(),
    code: z.string().min(1).optional(),
  })
  .refine((data) => Boolean(data.idToken) !== Boolean(data.code), {
    message: 'Salah satu dari idToken atau code wajib diisi (tidak keduanya)',
  });

export type GoogleLoginInput = z.infer<typeof googleLoginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Konfirmasi password tidak cocok',
    path: ['confirmPassword'],
  });

export const verifyEmailSchema = z.object({
  token: z.string().min(10, 'Token tidak valid'),
});

export const resendVerificationSchema = z.object({
  email: emailSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
}
