import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3007),
  APP_URL: z.string().url().default('http://localhost:3007'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  DATABASE_URL: z.string().min(1),

  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 chars')
    .refine(
      (v) => !v.startsWith('devonly_') && !v.startsWith('dev-placeholder'),
      'JWT_ACCESS_SECRET appears to be a placeholder — generate a strong secret (e.g. `openssl rand -hex 32`)',
    ),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 chars')
    .refine(
      (v) => !v.startsWith('devonly_') && !v.startsWith('dev-placeholder'),
      'JWT_REFRESH_SECRET appears to be a placeholder — generate a strong secret',
    ),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Google OAuth — Garap uses Google as primary login provider.
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET is required'),
  GOOGLE_REDIRECT_URI: z.string().url().default('http://localhost:3007/api/auth/google/callback'),
  // Signup mode:
  //  - PUBLIC_SIGNUP=true  → siapa pun dengan email Google terverifikasi boleh daftar (SaaS publik).
  //  - PUBLIC_SIGNUP=false → hanya email di ALLOWED_EMAILS yang boleh masuk (mode tertutup/privat).
  // Default AMAN: false (tertutup). Flip ke true saat siap go-public.
  PUBLIC_SIGNUP: z
    .string()
    .default('false')
    .transform((v) => v === 'true' || v === '1'),
  // Comma-separated allowlist — dipakai saat PUBLIC_SIGNUP=false. Boleh kosong.
  ALLOWED_EMAILS: z.string().default(''),

  // ── Email (verifikasi pendaftaran email/password) ──────────────────────
  // Resend API key. Kosong = mode fallback: email TIDAK dikirim, link verifikasi
  // di-log ke server (untuk dev/sebelum provider siap).
  RESEND_API_KEY: z.string().default(''),
  // Alamat pengirim (butuh domain terverifikasi di Resend).
  EMAIL_FROM: z.string().default('Garap <no-reply@arahkarya.com>'),
  // Wajibkan verifikasi email sebelum boleh login (jalur email/password).
  // Default false → AMAN: tak memblokir signup walau email belum aktif.
  // Flip ke true SETELAH RESEND_API_KEY terisi & domain terverifikasi.
  REQUIRE_EMAIL_VERIFICATION: z
    .string()
    .default('false')
    .transform((v) => v === 'true' || v === '1'),

  UPLOAD_DIR: z.string().default('./uploads'),
  UPLOAD_MAX_SIZE_MB: z.coerce.number().default(50),

  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  BULL_BOARD_PATH: z.string().default('/admin/queues'),

  SEED_ADMIN_EMAIL: z.string().email().default('admin@garap.local'),
  SEED_ADMIN_PASSWORD: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined))
    .refine((v) => !v || v.length >= 12, 'SEED_ADMIN_PASSWORD harus min 12 karakter'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[env] Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';

export const allowedEmails = (): readonly string[] =>
  env.ALLOWED_EMAILS.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
