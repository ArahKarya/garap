import crypto from 'node:crypto';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { sendEmail } from '../../lib/email.js';
import { ValidationError } from '../../lib/errors.js';

const TOKEN_TYPE = 'EMAIL_VERIFY';
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 jam

const hashToken = (rawToken: string): string =>
  crypto.createHash('sha256').update(rawToken).digest('hex');

interface VerificationUser {
  id: string;
  email: string;
  name: string;
}

function buildVerificationEmail(name: string, link: string): { html: string; text: string } {
  const safeName = name.trim() || 'Sahabat';
  const text =
    `Halo ${safeName},\n\n` +
    `Terima kasih sudah mendaftar di Garap. Klik link berikut untuk memverifikasi email kamu:\n\n` +
    `${link}\n\n` +
    `Link ini kedaluwarsa dalam 24 jam. Abaikan email ini jika kamu tidak merasa mendaftar.`;

  const html = `
  <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
    <h2 style="color: #10b981;">Verifikasi email Garap</h2>
    <p>Halo <strong>${safeName}</strong>,</p>
    <p>Terima kasih sudah mendaftar di <strong>Garap</strong>. Klik tombol di bawah untuk memverifikasi email kamu:</p>
    <p style="margin: 24px 0;">
      <a href="${link}"
         style="background: #10b981; color: #ffffff; padding: 12px 20px; border-radius: 8px; text-decoration: none; display: inline-block;">
        Verifikasi email
      </a>
    </p>
    <p style="font-size: 13px; color: #475569;">Jika tombol tidak berfungsi, salin link ini ke browser:</p>
    <p style="font-size: 13px; word-break: break-all;"><a href="${link}">${link}</a></p>
    <p style="font-size: 13px; color: #475569;">Link ini kedaluwarsa dalam <strong>24 jam</strong>. Abaikan email ini jika kamu tidak merasa mendaftar.</p>
  </div>`;

  return { html, text };
}

/**
 * Generate token verifikasi baru untuk user, simpan hash-nya, dan kirim email
 * berisi link verifikasi. Token EMAIL_VERIFY lama milik user di-invalidate dulu
 * agar hanya token terbaru yang valid. Di mode fallback (tanpa RESEND_API_KEY),
 * link verifikasi akan ter-log oleh `sendEmail`.
 */
export async function createAndSendVerification(user: VerificationUser): Promise<void> {
  // Invalidate token EMAIL_VERIFY lama (yang belum dipakai) milik user ini.
  await prisma.verificationToken.deleteMany({
    where: { userId: user.id, type: TOKEN_TYPE },
  });

  const rawToken = crypto.randomBytes(32).toString('hex'); // 64 char hex
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.verificationToken.create({
    data: { userId: user.id, tokenHash, type: TOKEN_TYPE, expiresAt },
  });

  const appOrigin = env.APP_URL.replace(/\/+$/, '');
  const link = `${appOrigin}/verify-email?token=${rawToken}`;

  const { html, text } = buildVerificationEmail(user.name, link);
  await sendEmail({
    to: user.email,
    subject: 'Verifikasi email Garap',
    html,
    text,
  });
}

/**
 * Verifikasi email berdasarkan token mentah dari link. Idempotent: jika user
 * sudah terverifikasi sebelumnya, dianggap sukses tanpa error.
 *
 * @throws ValidationError jika token tidak ditemukan, sudah dipakai, atau kedaluwarsa.
 */
export async function verifyEmail(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);

  const record = await prisma.verificationToken.findUnique({ where: { tokenHash } });

  if (!record || record.type !== TOKEN_TYPE) {
    throw ValidationError('Token verifikasi tidak valid.');
  }

  // Sudah dipakai sebelumnya. Idempotent: jika user-nya memang sudah verified,
  // anggap sukses; selain itu tolak (token bekas tapi user belum verified).
  if (record.usedAt) {
    const user = await prisma.user.findUnique({ where: { id: record.userId } });
    if (user?.emailVerifiedAt) return;
    throw ValidationError('Token verifikasi sudah digunakan.');
  }

  if (record.expiresAt < new Date()) {
    throw ValidationError('Token verifikasi sudah kedaluwarsa. Silakan minta kirim ulang.');
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: now },
    }),
    prisma.verificationToken.update({
      where: { id: record.id },
      data: { usedAt: now },
    }),
  ]);

  logger.info({ userId: record.userId }, '[verification] email terverifikasi');
}

/**
 * Kirim ulang email verifikasi. Anti-enumeration: untuk email yang tak ada,
 * akun tanpa passwordHash, atau yang sudah terverifikasi, fungsi
 * ini RETURN DIAM-DIAM tanpa membocorkan status akun.
 */
export async function resendVerification(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalized } });

  // Anti-enumeration: jangan beri tahu apakah akun ada / statusnya bagaimana.
  if (!user) return;
  if (!user.passwordHash) return; // akun tanpa password lokal
  if (user.emailVerifiedAt) return; // sudah verified

  await createAndSendVerification({ id: user.id, email: user.email, name: user.name });
}
