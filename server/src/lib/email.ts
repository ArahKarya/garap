import { env } from '../config/env.js';
import { logger } from './logger.js';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * `true` jika provider email (Resend) sudah dikonfigurasi (RESEND_API_KEY terisi).
 * Saat `false`, `sendEmail` masuk MODE FALLBACK: tidak mengirim, hanya mencatat
 * isi penting ke log agar developer tetap bisa menyelesaikan flow (mis. ambil
 * link verifikasi dari log) sebelum provider siap.
 */
export const isEmailConfigured = (): boolean => Boolean(env.RESEND_API_KEY);

/**
 * Pengirim email provider-agnostic.
 *
 * - RESEND_API_KEY terisi → kirim via Resend HTTP API (global `fetch`, Node 20).
 * - RESEND_API_KEY kosong → MODE FALLBACK: log peringatan + isi email, JANGAN throw
 *   (signup/flow lain tetap jalan walau email belum aktif).
 */
export async function sendEmail({ to, subject, html, text }: SendEmailInput): Promise<void> {
  if (!isEmailConfigured()) {
    logger.warn(
      { to, subject, text: text ?? null },
      '[email] RESEND_API_KEY kosong — email TIDAK dikirim (mode fallback). Isi penting di-log untuk dev.',
    );
    return;
  }

  let response: Response;
  try {
    response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to,
        subject,
        html,
        text,
      }),
    });
  } catch (err: unknown) {
    logger.error({ err, to, subject }, '[email] gagal menghubungi Resend');
    throw new Error('Gagal mengirim email');
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    logger.error(
      { status: response.status, body, to, subject },
      '[email] Resend menolak permintaan',
    );
    throw new Error(`Gagal mengirim email (status ${response.status})`);
  }

  logger.info({ to, subject }, '[email] terkirim via Resend');
}
