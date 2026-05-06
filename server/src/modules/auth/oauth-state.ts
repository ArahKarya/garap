import crypto from 'node:crypto';
import { env } from '../../config/env.js';

/**
 * Stateless OAuth `state` parameter — HMAC over `nonce.timestamp` keyed
 * by `JWT_REFRESH_SECRET`. No server-side storage needed. Returns 5-minute
 * window of validity for the round-trip.
 */
const STATE_TTL_SEC = 5 * 60;

function hmac(input: string): string {
  return crypto
    .createHmac('sha256', env.JWT_REFRESH_SECRET)
    .update(input)
    .digest('base64url');
}

export function issueState(): string {
  const nonce = crypto.randomBytes(16).toString('base64url');
  const ts = Math.floor(Date.now() / 1000);
  const payload = `${nonce}.${ts}`;
  const sig = hmac(payload);
  return `${payload}.${sig}`;
}

export interface VerifyResult {
  ok: boolean;
  reason?: string;
}

export function verifyState(state: string | null | undefined): VerifyResult {
  if (!state || typeof state !== 'string') {
    return { ok: false, reason: 'missing' };
  }
  const parts = state.split('.');
  if (parts.length !== 3) return { ok: false, reason: 'malformed' };
  const [nonce, tsStr, sig] = parts as [string, string, string];
  if (!nonce || !tsStr || !sig) return { ok: false, reason: 'malformed' };
  const expected = hmac(`${nonce}.${tsStr}`);
  // Constant-time compare — prevents timing oracle on signature.
  if (expected.length !== sig.length) return { ok: false, reason: 'invalid' };
  if (
    !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
  ) {
    return { ok: false, reason: 'invalid' };
  }
  const ts = Number(tsStr);
  if (!Number.isFinite(ts)) return { ok: false, reason: 'malformed' };
  const ageSec = Math.floor(Date.now() / 1000) - ts;
  if (ageSec < 0 || ageSec > STATE_TTL_SEC) {
    return { ok: false, reason: 'expired' };
  }
  return { ok: true };
}
